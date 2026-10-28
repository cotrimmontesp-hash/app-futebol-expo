import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(fileURLToPath(new URL('../src/day.ts', import.meta.url)), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const day = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(js)}`);

test('hoje em Brasília muda à meia-noite, não à meia-noite UTC', () => {
  assert.equal(day.saoPauloISODate(new Date('2026-10-28T02:30:00Z')), '2026-10-27');
  assert.equal(day.saoPauloISODate(new Date('2026-10-28T03:00:00Z')), '2026-10-28');
});

test('seletor mostra ontem, hoje e amanhã com a data curta', () => {
  const choices = day.dayChoices(new Date('2026-10-28T15:00:00Z'));
  assert.deepEqual(
    choices.map((choice) => [choice.id, choice.label, choice.date, choice.caption]),
    [
      ['ontem', 'Ontem', '2026-10-27', 'ter 27/10'],
      ['hoje', 'Hoje', '2026-10-28', 'qua 28/10'],
      ['amanha', 'Amanhã', '2026-10-29', 'qui 29/10'],
    ],
  );
  assert.equal(choices[0].accessibilityLabel, 'Ontem, terça-feira, 27 de outubro');
  assert.equal(day.dateForDay('amanha', new Date('2026-10-28T15:00:00Z')), '2026-10-29');
});

test('vira o mês e o ano no calendário civil', () => {
  const choices = day.dayChoices(new Date('2026-11-01T15:00:00Z'));
  assert.deepEqual(
    choices.map((choice) => [choice.id, choice.date, choice.caption]),
    [
      ['ontem', '2026-10-31', 'sáb 31/10'],
      ['hoje', '2026-11-01', 'dom 01/11'],
      ['amanha', '2026-11-02', 'seg 02/11'],
    ],
  );
  assert.equal(day.addCalendarDays('2026-12-31', 1), '2027-01-01');
  assert.equal(day.addCalendarDays('2026-03-01', -1), '2026-02-28');
});

test('servidor antigo só confirma o dia de hoje', () => {
  assert.equal(day.dayResponseMatches(undefined, '2026-10-28', 'hoje'), true);
  assert.equal(day.dayResponseMatches('', '2026-10-28', 'hoje'), true);
  assert.equal(day.dayResponseMatches(undefined, '2026-10-27', 'ontem'), false);
  assert.equal(day.dayResponseMatches(undefined, '2026-10-29', 'amanha'), false);
  assert.equal(day.dayResponseMatches('2026-10-27', '2026-10-27', 'ontem'), true);
  assert.equal(day.dayResponseMatches('2026-10-29', '2026-10-29', 'amanha'), true);
  assert.equal(day.dayResponseMatches('2026-10-28', '2026-10-27', 'ontem'), false);
  assert.equal(day.dayResponseMatches('2026-10-27', '2026-10-28', 'hoje'), false);
});
