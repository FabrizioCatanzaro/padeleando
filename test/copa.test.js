import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crucesPrimeraRonda, defaultCopaConfig, copaConfigBody, copaConfigError, totalClasificados, copaMinPairs, premiosDePuestos, premioTitulo,
  copaStandings, compareCopaRows, tablasPorGrupo, grupoNombre, usaFechas, esCopaCuadro, gruposArmados,
} from '../src/utils/copa.js';

const pair = (id, zona = 1, extra = {}) => ({ id, p1: `${id}a`, p2: `${id}b`, zona, status: 'active', ...extra });
const m = (a, b, s1, s2, extra = {}) => ({ team1: [`${a}a`, `${a}b`], team2: [`${b}b`, `${b}a`], score1: String(s1), score2: String(s2), ...extra });

test('opciones: valores por defecto y cuerpo para la API', () => {
  assert.equal(totalClasificados(defaultCopaConfig('zonas')), 4);
  assert.deepEqual(copaConfigBody({ mode: 'cuadro', zonas: 4, plata: true, tercer_puesto: true, premio1: 'x' }), { mode: 'cuadro', tercer_puesto: true });
  assert.deepEqual(Object.keys(copaConfigBody({ ...defaultCopaConfig('zonas'), points_win: 3 })).sort(),
    ['clasifican', 'mejores_extra', 'mode', 'plata', 'ruedas', 'tercer_puesto', 'zonas']);
  assert.equal(copaMinPairs({ mode: 'zonas', zonas: 4 }), 12);
  assert.equal(copaMinPairs({ mode: 'cuadro' }), 2);
});

test('opciones: mismos límites que la API', () => {
  const c = defaultCopaConfig('zonas');
  assert.equal(copaConfigError(c), null);
  assert.match(copaConfigError({ ...c, zonas: 8, clasifican: 5 }), /de 2 a 32 parejas/);
  assert.match(copaConfigError({ ...c, mejores_extra: 2 }), /menos que los grupos/);
  assert.match(copaConfigError({ ...c, zonas: 4, clasifican: 5, mejores_extra: 1 }), /no quedan parejas/);
  assert.equal(copaConfigError({ mode: 'cuadro' }), null);
});

test('premios: se arman por puesto y se nombran', () => {
  assert.deepEqual(premiosDePuestos([' Paletas ', '', 'Grips']), [
    { kind: 'puesto', cup: 'oro', place: 1, description: 'Paletas' },
    { kind: 'puesto', cup: 'oro', place: 3, description: 'Grips' },
  ]);
  assert.equal(premioTitulo({ kind: 'puesto', cup: 'oro', place: 1 }), 'Campeón');
  assert.equal(premioTitulo({ kind: 'puesto', cup: 'plata', place: 1 }), 'Campeón · Copa de plata');
  assert.equal(premioTitulo({ kind: 'especial', cup: 'oro', title: 'MVP' }), 'MVP');
});

test('tabla: mismo resultado que la API para el mismo grupo', () => {
  const pairs = ['p01', 'p02', 'p03'].map((id) => pair(id));
  const matches = [
    m('p01', 'p02', 2, 1, { sets_format: 3, sets: [{ s1: 6, s2: 4 }, { s1: 3, s2: 6 }, { s1: 6, s2: 2 }] }),
    m('p02', 'p03', 6, 3),
    m('p03', 'p01', 6, 0, { walkover: true }),
  ];
  const t = copaStandings(pairs, matches, { win: 3, loss: 1 });
  const by = Object.fromEntries(t.map((r) => [r.id, r]));
  assert.deepEqual([by.p01.sf, by.p01.sc, by.p01.gf, by.p01.gc], [2, 2, 15, 18]);
  assert.deepEqual([by.p01.pts, by.p02.pts, by.p03.pts], [3, 4, 4]);
  assert.deepEqual(t.map((r) => [r.id, r.pos]), [['p03', 1], ['p02', 2], ['p01', 3]]);
});

test('tabla: sets antes que games, y las retiradas al fondo', () => {
  const a = { id: 'a', pts: 6, pg: 2, sd: 2, gd: 1, gf: 20 };
  const b = { id: 'b', pts: 6, pg: 2, sd: 1, gd: 9, gf: 30 };
  const c = { id: 'c', pts: 6, pg: 2, sd: 2, gd: 5, gf: 10 };
  assert.deepEqual([b, a, c].sort(compareCopaRows).map((r) => r.id), ['c', 'a', 'b']);
  const pairs = [pair('p01', 1, { status: 'withdrawn' }), pair('p02'), pair('p03')];
  const t = copaStandings(pairs, [m('p01', 'p02', 6, 0), m('p01', 'p03', 6, 0)]);
  assert.equal(t[2].id, 'p01');
});

test('grupos: una tabla por grupo y solo con sus partidos', () => {
  const pairs = [pair('p01', 1), pair('p02', 1), pair('p03', 2), pair('p04', 2), pair('p05', null)];
  const tablas = tablasPorGrupo(pairs, [m('p01', 'p02', 6, 2), m('p03', 'p04', 4, 6), m('p01', 'p03', 6, 0)]);
  assert.deepEqual(tablas.map((t) => [t.zona, t.rows.map((r) => `${r.id}:${r.pj}`).join(' ')]), [[1, 'p01:1 p02:1'], [2, 'p04:1 p03:1']]);
  assert.equal(grupoNombre(2), 'Grupo B');
  assert.equal(gruposArmados({ pairs }), true);
  assert.equal(gruposArmados({ pairs: [pair('x', null)] }), false);
});

test('formatos', () => {
  const zonas = { format: 'copa', copa_config: { mode: 'zonas' } };
  const cuadro = { format: 'copa', copa_config: { mode: 'cuadro' } };
  assert.deepEqual([zonas, cuadro, { format: 'liga', liga_mode: 'temporada' }, { format: 'americano' }].map(usaFechas), [true, false, true, false]);
  assert.deepEqual([zonas, cuadro].map(esCopaCuadro), [false, true]);
});

test('whatsapp: del perfil y como link', async () => {
  const { whatsappDePerfil, whatsappHref, pideDatos } = await import('../src/utils/copa.js');
  assert.equal(whatsappDePerfil({ whatsapp: '+541125031107', whatsapp_public: false }), '+541125031107');
  assert.equal(whatsappDePerfil({ whatsapp: null }), '');
  assert.equal(whatsappDePerfil(null), '');
  assert.equal(whatsappHref('+54 11 5555-0101'), 'https://wa.me/541155550101');
  assert.equal(whatsappHref(''), null);
  assert.deepEqual([{ format: 'copa', copa_config: { mode: 'cuadro' } }, { format: 'liga', liga_mode: 'jornada' }].map(pideDatos), [true, false]);
});

test('primera ronda: cruces por siembra y pases directos', () => {
  assert.deepEqual(crucesPrimeraRonda(4), [[1, 4], [2, 3]]);
  assert.deepEqual(crucesPrimeraRonda(6), [[1, null], [4, 5], [2, null], [3, 6]]);
  assert.deepEqual(crucesPrimeraRonda(2), [[1, 2]]);
  assert.equal(crucesPrimeraRonda(32).length, 16);
  assert.deepEqual(crucesPrimeraRonda(1), []);
});
