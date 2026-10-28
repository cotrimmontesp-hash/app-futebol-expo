import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(fileURLToPath(new URL('../src/refresh.ts', import.meta.url)), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const refresh = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(js)}`);

test('hoje rebusca a cada 30 s com jogo ao vivo e a cada 2 min sem', () => {
  assert.equal(refresh.refreshIntervalMs('hoje', true), 30_000);
  assert.equal(refresh.refreshIntervalMs('hoje', false), 120_000);
  assert.equal(refresh.refreshIntervalMs('ontem', true), null);
  assert.equal(refresh.refreshIntervalMs('amanha', false), null);
});

test('segundo plano pausa; inactive, active e desconhecido não pausam', () => {
  assert.equal(refresh.shouldPauseRefresh('background'), true);
  assert.equal(refresh.shouldPauseRefresh('inactive'), false);
  assert.equal(refresh.shouldPauseRefresh('active'), false);
  assert.equal(refresh.shouldPauseRefresh('unknown'), false);
  assert.equal(refresh.shouldPauseRefresh(null), false);
});

test('não dispara outro pedido enquanto um anda, nem com a tela pausada', () => {
  const gate = refresh.createRefreshGate(true);
  assert.equal(refresh.planRefresh(gate, 'open'), 'run');
  assert.equal(refresh.planRefresh(gate, 'tick'), 'wait');
  assert.equal(gate.followUp, false);
  assert.deepEqual(refresh.planAfterRefresh(gate, refresh.refreshIntervalMs('hoje', true)), {
    type: 'wait',
    delayMs: 30_000,
  });
  assert.equal(gate.inFlight, false);

  gate.visible = false;
  assert.equal(refresh.planRefresh(gate, 'tick'), 'ignore');
  assert.equal(refresh.planRefresh(gate, 'resume'), 'ignore');
  assert.deepEqual(refresh.planAfterRefresh(gate, 30_000), { type: 'stop' });
});

test('voltar para a tela busca na hora e depois espera o intervalo', () => {
  const gate = refresh.createRefreshGate(false);
  assert.equal(refresh.planRefresh(gate, 'open'), 'ignore');
  gate.visible = true;
  assert.equal(refresh.planRefresh(gate, 'resume'), 'run');
  assert.deepEqual(refresh.planAfterRefresh(gate, refresh.refreshIntervalMs('hoje', false)), {
    type: 'wait',
    delayMs: 120_000,
  });
});

test('puxar durante um pedido faz no máximo mais uma busca, sem empilhar', () => {
  const gate = refresh.createRefreshGate(true);
  assert.equal(refresh.planRefresh(gate, 'tick'), 'run');
  assert.equal(refresh.planRefresh(gate, 'manual'), 'wait');
  assert.equal(refresh.planRefresh(gate, 'manual'), 'wait');
  assert.equal(gate.followUp, true);
  assert.deepEqual(refresh.planAfterRefresh(gate, 30_000), { type: 'again' });
  assert.equal(gate.followUp, false);
  assert.equal(gate.inFlight, false);
  assert.equal(refresh.planRefresh(gate, 'resume'), 'run');
  assert.deepEqual(refresh.planAfterRefresh(gate, 120_000), { type: 'wait', delayMs: 120_000 });
});

test('retomar no meio de um pedido que já estava visível não duplica a busca', () => {
  const gate = refresh.createRefreshGate(true);
  assert.equal(refresh.planRefresh(gate, 'open'), 'run');
  assert.equal(gate.startedHidden, false);
  gate.visible = false;
  gate.visible = true;
  assert.equal(refresh.planRefresh(gate, 'resume'), 'wait');
  assert.equal(gate.followUp, false);
  assert.deepEqual(refresh.planAfterRefresh(gate, 30_000), { type: 'wait', delayMs: 30_000 });
});

test('pedido que começou pausado rebusca uma vez ao voltar', () => {
  const gate = refresh.createRefreshGate(false);
  assert.equal(refresh.planRefresh(gate, 'manual'), 'run');
  assert.equal(gate.startedHidden, true);
  gate.visible = true;
  assert.equal(refresh.planRefresh(gate, 'resume'), 'wait');
  assert.equal(gate.followUp, true);
  assert.deepEqual(refresh.planAfterRefresh(gate, 120_000), { type: 'again' });
});

test('sem dado novo o dia de hoje não agenda sozinho depois de uma falha inicial', () => {
  const gate = refresh.createRefreshGate(true);
  assert.equal(refresh.planRefresh(gate, 'open'), 'run');
  assert.deepEqual(refresh.planAfterRefresh(gate, null), { type: 'stop' });
});

test('mostra o horário de Brasília com dois dígitos', () => {
  assert.equal(refresh.formatUpdatedAt(new Date('2026-10-28T18:05:00Z')), 'Atualizado às 15:05');
  assert.equal(refresh.formatUpdatedAt(new Date('2026-10-28T02:59:00Z')), 'Atualizado às 23:59');
  assert.equal(refresh.formatUpdatedAt(new Date('2026-10-28T03:00:00Z')), 'Atualizado às 00:00');
});
