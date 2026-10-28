import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function transpile(relative) {
  const source = readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

const teamResultsJs = transpile('../src/teamResults.ts');
const myTeamsJs = transpile('../src/myTeams.ts').replace(
  /import\s*\{[^}]+\}\s*from\s*['"]\.\/teamResults['"];?/,
  '',
);
const mod = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(`${teamResultsJs}\n${myTeamsJs}`)}`);

function side(time, extra = {}) {
  return { time, ...extra };
}

function match(id, data, estado, casa, fora, extra = {}) {
  return { id, data, estado, casa: side(casa), fora: side(fora), ...extra };
}

test('próximos vêm primeiro, por data, e resultados do mais recente ao mais antigo', () => {
  const agenda = mod.favoriteAgenda(
    [
      {
        id: 'bra.1',
        nome: 'Brasileirão',
        matches: {
          resultados: [
            match('r1', '2026-10-10T19:00:00Z', 'post', 'Flamengo', 'Vasco', { casa: { time: 'Flamengo', gols: '2', venceu: true }, fora: { time: 'Vasco', gols: '0', venceu: false } }),
            match('r2', '2026-10-20T19:00:00Z', 'post', 'Palmeiras', 'Santos', { casa: { time: 'Palmeiras', gols: '1', venceu: true }, fora: { time: 'Santos', gols: '0', venceu: false } }),
          ],
          proximos: [
            match('p1', '2026-10-30T19:00:00Z', 'pre', 'Flamengo', 'Bahia'),
            match('p2', '2026-10-28T19:00:00Z', 'pre', 'Palmeiras', 'Grêmio'),
          ],
        },
      },
    ],
    ['Flamengo', 'Palmeiras'],
  );

  assert.deepEqual(
    agenda.upcoming.map((item) => item.match.id),
    ['p2', 'p1'],
  );
  assert.deepEqual(
    agenda.recent.map((item) => item.match.id),
    ['r2', 'r1'],
  );
  assert.equal(agenda.notices.length, 0);
  assert.equal(agenda.upcoming[0].time.time, 'Palmeiras');
  assert.equal(agenda.upcoming[1].competicao, 'Brasileirão');
});

test('jogo entre dois favoritos aparece uma vez e abre o mandante', () => {
  const agenda = mod.favoriteAgenda(
    [
      {
        id: 'bra.1',
        nome: 'Brasileirão',
        matches: {
          resultados: [],
          proximos: [match('p1', '2026-10-28T22:00:00Z', 'pre', 'Flamengo', 'Palmeiras')],
        },
      },
    ],
    ['Palmeiras', 'Flamengo'],
  );
  assert.equal(agenda.upcoming.length, 1);
  assert.equal(agenda.upcoming[0].time.time, 'Flamengo');
  assert.equal(agenda.recent.length, 0);
});

test('cada time segue o limite da página do time', () => {
  const resultados = Array.from({ length: 6 }, (_, index) =>
    match(`r${index}`, `2026-10-${String(20 - index).padStart(2, '0')}T19:00:00Z`, 'post', 'Flamengo', 'Vasco'),
  );
  const agenda = mod.favoriteAgenda(
    [{ id: 'bra.1', nome: 'Brasileirão', matches: { resultados, proximos: [] } }],
    ['Flamengo'],
  );
  assert.equal(agenda.recent.length, 5);
  assert.equal(agenda.recent[0].match.id, 'r0');
});

test('nome antigo do time ainda encontra o jogo', () => {
  const agenda = mod.favoriteAgenda(
    [
      {
        id: 'bra.1',
        nome: 'Brasileirão',
        matches: {
          resultados: [],
          proximos: [
            {
              id: 'p1',
              data: '2026-10-28T19:00:00Z',
              estado: 'pre',
              casa: { time: 'Flamengo', origem: 'CRF' },
              fora: { time: 'Vasco' },
            },
          ],
        },
      },
    ],
    ['CRF'],
  );
  assert.equal(agenda.upcoming.length, 1);
  assert.equal(agenda.upcoming[0].time.time, 'Flamengo');
  assert.equal(agenda.notices.length, 0);
});

test('time sem jogo ganha aviso curto, e falha de campeonato não derruba os outros', () => {
  const agenda = mod.favoriteAgenda(
    [
      {
        id: 'bra.1',
        nome: 'Brasileirão',
        matches: {
          resultados: [match('r1', '2026-10-20T19:00:00Z', 'post', 'Flamengo', 'Vasco')],
          proximos: [match('p1', '2026-10-28T19:00:00Z', 'pre', 'Flamengo', 'Bahia')],
        },
      },
      { id: 'eng.1', nome: 'Premier League', matches: null },
    ],
    ['Flamengo', 'Time Sumido'],
  );
  assert.equal(agenda.upcoming.length, 1);
  assert.equal(agenda.recent.length, 1);
  assert.deepEqual(agenda.failedLeagues, ['Premier League']);
  assert.equal(agenda.notices.length, 1);
  assert.equal(agenda.notices[0].nome, 'Time Sumido');
  assert.equal(agenda.notices[0].texto, 'Não foi possível carregar os jogos.');
  assert.equal(agenda.notices[0].liga, undefined);
});

test('sem falha de rede, time ausente avisa que não há jogos', () => {
  const agenda = mod.favoriteAgenda(
    [{ id: 'bra.1', nome: 'Brasileirão', matches: { resultados: [], proximos: [] } }],
    ['Botafogo'],
  );
  assert.deepEqual(agenda.notices, [{ nome: 'Botafogo', texto: 'Sem jogos neste período.', liga: undefined }]);
});

test('jogo ao vivo entra na lista de próximos', () => {
  const agenda = mod.favoriteAgenda(
    [
      {
        id: 'bra.1',
        nome: 'Brasileirão',
        matches: {
          resultados: [],
          proximos: [
            match('live', '2026-10-28T19:00:00Z', 'in', 'Botafogo', 'Vasco'),
            match('later', '2026-10-30T19:00:00Z', 'pre', 'Botafogo', 'Bahia'),
          ],
        },
      },
    ],
    ['Botafogo'],
  );
  assert.deepEqual(
    agenda.upcoming.map((item) => item.match.id),
    ['live', 'later'],
  );
  assert.equal(agenda.notices.length, 0);
});

test('time encontrado sem jogos no período continua abrível', () => {
  const agenda = mod.favoriteAgenda(
    [
      {
        id: 'bra.1',
        nome: 'Brasileirão',
        matches: {
          resultados: [],
          proximos: [match('p1', '2026-10-28T19:00:00Z', 'adiado', 'Botafogo', 'Vasco')],
        },
      },
    ],
    ['Botafogo'],
  );
  assert.equal(agenda.upcoming.length, 0);
  assert.equal(agenda.recent.length, 0);
  assert.equal(agenda.notices.length, 1);
  assert.equal(agenda.notices[0].nome, 'Botafogo');
  assert.equal(agenda.notices[0].liga, 'bra.1');
  assert.equal(agenda.notices[0].texto, 'Sem jogos neste período.');
});
