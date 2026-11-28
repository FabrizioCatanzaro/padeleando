import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayWindow, dayHoursLabel, businessDaySlots, businessToday, slotRange, shortDayLabel } from '../src/components/Club/scheduleGrid.js';

const day = (from, to, open = true) => ({ open, from, to });
const week = (...days) => days;

test('dayWindow corre el cierre al día siguiente', () => {
  assert.deepEqual(dayWindow(day('09:00', '23:00')), { start: 540, end: 1380 });
  assert.deepEqual(dayWindow(day('09:00', '02:00')), { start: 540, end: 1560 });
  assert.deepEqual(dayWindow(day('00:00', '00:00')), { start: 0, end: 1440 });
  assert.equal(dayWindow(day('09:00', '23:00', false)), null);
});

test('dayHoursLabel', () => {
  assert.equal(dayHoursLabel(day('09:00', '02:00')), '09:00 a 02:00 (del día siguiente)');
  assert.equal(dayHoursLabel(day('08:00', '08:00')), 'Abierto las 24 h');
  assert.equal(dayHoursLabel(day('09:00', '23:00')), '09:00 a 23:00');
});

// 2026-11-28 es sábado (índice 5)
const lateWeek = week(
  day('09:00', '23:00'), day('09:00', '23:00'), day('09:00', '23:00'), day('09:00', '23:00'),
  day('09:00', '23:00'), day('09:00', '02:00'), day('09:00', '22:00'),
);

test('la madrugada lleva la fecha del día siguiente', () => {
  const slots = businessDaySlots(lateWeek, '2026-11-28', 30);
  assert.equal(slots.length, 34);
  assert.deepEqual(slots[0], { date: '2026-11-28', time: '09:00', nextDay: false });
  assert.deepEqual(slots[30], { date: '2026-11-29', time: '00:00', nextDay: true });
  assert.deepEqual(slots[33], { date: '2026-11-29', time: '01:30', nextDay: true });
});

test('el día siguiente arranca después de la madrugada del anterior', () => {
  const allDay = lateWeek.map((d, i) => (i === 6 ? day('00:00', '22:00') : d));
  const sunday = businessDaySlots(allDay, '2026-11-29', 30);
  assert.equal(sunday[0].time, '02:00');
});

test('un club de 24 h no repite turnos entre días', () => {
  const always = Array.from({ length: 7 }, () => day('00:00', '00:00'));
  const sat = businessDaySlots(always, '2026-11-28', 30);
  assert.equal(sat.length, 48);
  assert.equal(sat[47].time, '23:30');
  assert.equal(sat.every((s) => !s.nextDay), true);
});

test('businessToday sigue en el día del club hasta que cierra la madrugada', () => {
  assert.equal(businessToday(lateWeek, new Date(2026, 10, 29, 0, 30)), '2026-11-28');
  assert.equal(businessToday(lateWeek, new Date(2026, 10, 29, 2, 0)), '2026-11-29');
  assert.equal(businessToday(lateWeek, new Date(2026, 10, 28, 15, 0)), '2026-11-28');
  assert.equal(businessToday(null, new Date(2026, 10, 28, 15, 0)), '2026-11-28');
});

test('slotRange avisa cuando el rango cruza la medianoche', () => {
  const slots = businessDaySlots(lateWeek, '2026-11-28', 30);
  assert.deepEqual(slotRange(slots.slice(28, 31), 30), { start: '23:00', end: '00:30', crossesTo: '2026-11-29' });
  assert.deepEqual(slotRange(slots.slice(20, 22), 30), { start: '19:00', end: '20:00', crossesTo: null });
  assert.equal(slotRange(slots.slice(29, 30), 30).crossesTo, null);
  assert.equal(shortDayLabel('2026-11-29'), 'dom 29');
});

import { openStatus, openStatusLabel } from '../src/components/Club/scheduleGrid.js';
import { freeStartTimes } from '../src/components/Club/freeSlots.js';

test('openStatus: abierto, madrugada y próxima apertura', () => {
  const sat = (h, m = 0) => new Date(2026, 10, 28, h, m);
  assert.equal(openStatusLabel(openStatus(lateWeek, sat(15))), 'Abierto ahora · cierra a las 2');
  assert.equal(openStatusLabel(openStatus(lateWeek, new Date(2026, 10, 29, 1, 0))), 'Abierto ahora · cierra a las 2');
  assert.equal(openStatusLabel(openStatus(lateWeek, new Date(2026, 10, 29, 3, 0))), 'Cerrado · abre hoy a las 9');
  assert.equal(openStatusLabel(openStatus(lateWeek, new Date(2026, 10, 29, 22, 30))), 'Cerrado · abre mañana a las 9');
  const always = Array.from({ length: 7 }, () => day('00:00', '00:00'));
  assert.equal(openStatusLabel(openStatus(always, sat(4))), 'Abierto las 24 h');
  const onlyMon = Array.from({ length: 7 }, (_, i) => day('18:30', '23:00', i === 0));
  assert.equal(openStatusLabel(openStatus(onlyMon, sat(12))), 'Cerrado · abre el lun a las 18:30');
  assert.equal(openStatus(null), null);
});

test('freeStartTimes: saca los pasados y los llenos', () => {
  const slots = businessDaySlots(lateWeek, '2026-11-28', 30);
  const courts = [{ id: 'a' }, { id: 'b' }];
  const bookings = [
    { status: 'confirmed', date: '2026-11-28', start_time: '22:00:00', court_id: 'a' },
    { status: 'confirmed', date: '2026-11-28', start_time: '22:00:00', court_id: 'b' },
    { status: 'confirmed', date: '2026-11-29', start_time: '00:30:00', court_id: 'a' },
  ];
  const out = freeStartTimes(slots, courts, bookings, new Date(2026, 10, 28, 21, 10));
  assert.equal(out[0].time, '21:30');
  assert.equal(out.some((s) => s.time === '22:00'), false);
  assert.equal(out.find((s) => s.time === '00:30').free, 1);
});
