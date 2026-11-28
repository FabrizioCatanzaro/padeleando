import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AMENITIES, clubAmenities, courtFloorColor, courtSummary, courtColorName } from '../src/utils/clubProfile.js';

test('catálogo de servicios igual al de la API', () => {
  assert.equal(AMENITIES.length, 16);
  assert.deepEqual(clubAmenities({ amenities: ['wifi', 'estacionamiento', 'otra'] }).map((a) => a.key), ['estacionamiento', 'wifi']);
  assert.deepEqual(clubAmenities({}), []);
});

test('color del piso: el cargado gana, si no el del tipo de piso', () => {
  assert.equal(courtFloorColor({ floor_color: '#b5552f', floor_type: 'cemento' }), '#b5552f');
  assert.equal(courtFloorColor({ floor_type: 'cemento' }), '#5a5a5a');
  assert.equal(courtFloorColor({}), 'var(--color-border-strong)');
  assert.equal(courtColorName('#1F5FA8'), 'Azul');
  assert.equal(courtColorName('#123456'), null);
});

test('resumen de cancha con el color dentro del piso', () => {
  assert.deepEqual(
    courtSummary({ wall_type: 'cristal_panoramico', floor_type: 'cesped_sintetico', floor_color: '#1f5fa8', covered: true, lit: true }),
    ['Cristal panorámico', 'Césped sintético azul', 'Techada', 'Con iluminación'],
  );
  assert.deepEqual(courtSummary({ floor_color: '#1f5fa8' }), []);
});

import { priceFrom } from '../src/utils/clubProfile.js';

test('priceFrom: la hora más barata entre canchas activas', () => {
  assert.equal(priceFrom([{ price_60: '22000' }, { price_30: 9000 }, { price_60: 15000, active: false }]), 18000);
  assert.equal(priceFrom([]), null);
});

import { occupancyGrid } from '../src/utils/clubOccupancy.js';

test('occupancyGrid: capacidad por franja con la madrugada y porcentaje total', () => {
  const day = (from, to) => ({ open: true, from, to });
  const grid = [day('08:00', '12:00'), ...Array.from({ length: 4 }, () => ({ open: false, from: '09:00', to: '23:00' })), day('22:00', '02:00'), { open: false, from: '09:00', to: '23:00' }];
  const occ = occupancyGrid(grid, [{ dow: 1, band: 4, slots: 8 }, { dow: 7, band: 0, slots: 4 }], 2, 1);
  assert.deepEqual(occ.bands, [0, 4, 5, 11]);
  const mon = occ.rows[0].cells.find((c) => c.band === 4);
  assert.equal(mon.ratio, 1);
  assert.equal(mon.level, 4);
  const sun = occ.rows[6].cells.find((c) => c.band === 0);
  assert.equal(sun.ratio, 0.5);
  assert.equal(occ.rows[1].cells[0].ratio, null);
  assert.equal(occ.percent, Math.round((12 / (16 + 8 + 8)) * 100));
});
