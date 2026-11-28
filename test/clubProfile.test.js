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
