import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterTournaments, groupByMonth, countByState, filterOptions, tournamentState } from '../src/utils/clubTournaments.js';

const t = (id, extra) => ({ id, format: 'americano', group_id: 'g1', group_name: 'B', owner_username: 'ana', status: 'active', match_count: 0, ...extra });
const list = [
  t('a', { event_date: '2026-12-06', signup_open: true }),
  t('b', { event_date: '2026-11-27', match_count: 3, format: 'liga', group_id: 'g2', group_name: 'A' }),
  t('c', { event_date: '2026-11-22', status: 'finished' }),
  t('d', { created_at: '2025-12-10T10:00:00Z', status: 'finished', owner_username: 'beto' }),
];
const all = { estado: 'todos', formato: '', grupo: '', organizador: '', anio: '' };

test('estado de un torneo', () => {
  assert.equal(tournamentState(list[0]), 'proximos');
  assert.equal(tournamentState(list[1]), 'curso');
  assert.equal(tournamentState(list[2]), 'fin');
  assert.equal(tournamentState(t('x', { has_live: true })), 'curso');
});

test('filtra y ordena de lo más nuevo a lo más viejo', () => {
  assert.deepEqual(filterTournaments(list, all).map((x) => x.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(filterTournaments(list, { ...all, estado: 'abierta' }).map((x) => x.id), ['a']);
  assert.deepEqual(filterTournaments(list, { ...all, estado: 'fin', anio: '2025' }).map((x) => x.id), ['d']);
  assert.deepEqual(filterTournaments(list, { ...all, formato: 'liga' }).map((x) => x.id), ['b']);
  assert.deepEqual(filterTournaments(list, { ...all, organizador: 'beto' }).map((x) => x.id), ['d']);
});

test('cuenta por estado respetando los otros filtros', () => {
  assert.deepEqual(countByState(list, { ...all, grupo: 'g1' }), { todos: 3, abierta: 1, curso: 0, proximos: 1, fin: 2 });
});

test('agrupa por mes y arma las opciones', () => {
  assert.deepEqual(groupByMonth(filterTournaments(list, all)).map((g) => [g.key, g.items.length]), [['2026-12', 1], ['2026-11', 2], ['2025-12', 1]]);
  const o = filterOptions(list);
  assert.deepEqual(o.formatos, ['americano', 'liga']);
  assert.deepEqual(o.grupos.map((g) => g.label), ['A', 'B']);
  assert.deepEqual(o.organizadores, ['ana', 'beto']);
  assert.deepEqual(o.anios, ['2026', '2025']);
});
