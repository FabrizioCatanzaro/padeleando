import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayBlock, longDate, endTime, freeCount, playerDetail, teamNames, setsText, perPersonFromTotal, totalFromPerPerson,
  matchMeta, resultSummary, normalizeSets, dateRange, whatsappHref,
} from '../src/utils/friendlies.js';

const players = [
  { team: 1, position: 1, user: { name: 'Pablo R.', category: 'C6' }, side: 'reves', hand: 'diestro' },
  { team: 1, position: 2, user: null, guest_name: 'Juan M.' },
  { team: 2, position: 1, user: null, guest_name: null },
  { team: 2, position: 2, user: null, guest_name: null },
];

test('fechas y horarios', () => {
  assert.deepEqual(dayBlock('2026-11-20'), { dow: 'VIE', day: '20', month: 'NOV' });
  assert.equal(longDate('2026-11-22'), 'DOM 22 NOV');
  assert.equal(endTime('19:00', 90), '20:30');
  assert.equal(endTime('23:30', 60), '00:30');
});

test('jugadores', () => {
  assert.equal(freeCount(players), 2);
  assert.equal(playerDetail(players[0]), 'C6 · Revés · Diestro');
  assert.equal(playerDetail(players[1]), 'Sin cuenta');
  assert.equal(teamNames(players, 1), 'Pablo R. · Juan M.');
  assert.equal(teamNames(players, 2), '');
});

test('alquiler: total y por persona', () => {
  assert.equal(perPersonFromTotal('32000'), '8000');
  assert.equal(totalFromPerPerson('8000'), '32000');
  assert.equal(perPersonFromTotal(''), '');
});

test('meta del partido', () => {
  assert.equal(matchMeta({ court_label: 'Cancha 3', duration_minutes: 90, sets_format: 1, style: 'mixto' }), 'Cancha 3 · 90 min · Set único · Mixto');
  assert.equal(matchMeta({ court_label: null, duration_minutes: 60, sets_format: 3, style: null }), 'Sin cancha asignada · 60 min · Mejor de 3');
  assert.equal(setsText([{ s1: 6, s2: 3 }, { s1: 4, s2: 6 }]), '6-3 4-6');
});

test('resultado por sets', () => {
  assert.deepEqual(resultSummary(1, [{ s1: 6, s2: 4 }]), { ready: true, winner: 1, score: [6, 4] });
  assert.equal(resultSummary(1, [{ s1: 3, s2: 3 }]).ready, false);
  assert.deepEqual(resultSummary(3, [{ s1: 6, s2: 3 }, { s1: 4, s2: 6 }, { s1: 5, s2: 7 }]).score, [1, 2]);
  assert.equal(resultSummary(3, [{ s1: 6, s2: 3 }, { s1: 4, s2: 6 }]).ready, false);
  assert.equal(normalizeSets(3, [{ s1: 6, s2: 3 }, { s1: 4, s2: 6 }]).length, 3);
  assert.equal(normalizeSets(3, [{ s1: 6, s2: 3 }, { s1: 6, s2: 4 }, { s1: 1, s2: 6 }]).length, 2);
  assert.equal(normalizeSets(1, [{ s1: 6, s2: 3 }, { s1: 6, s2: 4 }]).length, 1);
});

test('rangos de fecha', () => {
  const thu = new Date(2026, 10, 19, 15, 0);
  assert.deepEqual(dateRange('hoy', thu), { from: '2026-11-19', to: '2026-11-19' });
  assert.deepEqual(dateRange('manana', thu), { from: '2026-11-20', to: '2026-11-20' });
  assert.deepEqual(dateRange('semana', thu), { from: '2026-11-19', to: '2026-11-25' });
  assert.deepEqual(dateRange('finde', thu), { from: '2026-11-21', to: '2026-11-22' });
  assert.deepEqual(dateRange('finde', new Date(2026, 10, 21)), { from: '2026-11-21', to: '2026-11-22' });
  assert.deepEqual(dateRange('finde', new Date(2026, 10, 22)), { from: '2026-11-22', to: '2026-11-22' });
  assert.deepEqual(dateRange('todas', thu), { from: null, to: null });
});

test('link de WhatsApp', () => {
  assert.equal(whatsappHref('11 5555 1234'), 'https://wa.me/5491155551234');
  assert.equal(whatsappHref('+54 9 11 5555 1234', 'hola'), 'https://wa.me/5491155551234?text=hola');
  assert.equal(whatsappHref(''), null);
});
