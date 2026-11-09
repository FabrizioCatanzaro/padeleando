// Cuestionario de nivel del registro (modelo aprobado por Fabri, 2026-11-09).
// Puntaje de 1.0 a 8.0 en bandas de una unidad; cada banda corresponde a una o
// dos categorías numéricas. El nivel autopercibido (pregunta 2) se recorta
// contra la experiencia (preguntas 1, 3, 4, 5 y 6): si la contradice mucho,
// gana la experiencia, para bajar o para subir.

export const LEVEL_BANDS = [
  { key: 'alevin',       label: 'Alevín',       mid: 1.5, categories: [10],
    text: 'Recién empiezo. Todavía me cuesta pasar la pelota y no uso las paredes.' },
  { key: 'principiante', label: 'Principiante', mid: 2.5, categories: [9],
    text: 'Peloteo con regularidad desde el fondo. La pared todavía me complica.' },
  { key: 'basico',       label: 'Básico',       mid: 3.5, categories: [8],
    text: 'Sostengo peloteos largos, salgo de algunas paredes y empiezo a subir a la red.' },
  { key: 'intermedio',   label: 'Intermedio',   mid: 4.5, categories: [7],
    text: 'Juego cómodo en la red, uso las paredes y le doy dirección a la pelota.' },
  { key: 'avanzado',     label: 'Avanzado',     mid: 5.5, categories: [6, 5],
    text: 'Domino bandeja y víbora, leo el juego de mi pareja y compito en torneos.' },
  { key: 'maestro',      label: 'Maestro',      mid: 6.5, categories: [4, 3],
    text: 'Resuelvo cualquier situación con variedad de golpes y gano torneos de categoría.' },
  { key: 'profesional',  label: 'Profesional',  mid: 7.5, categories: [2, 1],
    text: 'Compito en el circuito más alto o jugué de forma profesional.' },
];

export const LEVEL_QUESTIONS = [
  { id: 'years', title: '¿Hace cuánto jugás al pádel?', options: [
    { label: 'Menos de 6 meses',  value: 1.0 },
    { label: '6 meses a 2 años',  value: 2.5 },
    { label: '2 a 4 años',        value: 4.5 },
    { label: 'Más de 4 años',     value: 6.5 },
  ] },
  { id: 'self', title: '¿En qué nivel te considerás?', options:
    LEVEL_BANDS.map((b) => ({ label: b.label, value: b.mid, text: b.text })) },
  { id: 'frequency', title: '¿Con qué frecuencia jugás?', options: [
    { label: '1 vez al mes o menos',    value: -0.5 },
    { label: '1 vez por semana',        value: 0 },
    { label: '2 a 3 veces por semana',  value: 0.5 },
    { label: 'Casi todos los días',     value: 1.0 },
  ] },
  { id: 'racket', title: '¿Jugaste tenis u otro deporte de raqueta?', options: [
    { label: 'No',               value: 0 },
    { label: 'Sí, recreativo',   value: 0.3 },
    { label: 'Sí, competitivo',  value: 0.8 },
  ] },
  { id: 'lessons', title: '¿Fuiste a clases de pádel?', options: [
    { label: 'No, autodidacta', value: 0 },
    { label: 'Sí',              value: 0.5 },
  ] },
  { id: 'tournaments', title: '¿Jugaste torneos alguna vez?', options: [
    { label: 'No', value: 0 },
    { label: 'Sí', value: 0.7 },
  ] },
];

const round1 = (x) => Math.round(x * 10) / 10;
const clamp  = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * @param {Record<string, number>} answers - valor elegido por id de pregunta
 * @returns {{ experience: number, self: number, score: number }}
 */
export function scoreLevelQuiz(answers) {
  const experience = answers.years + answers.frequency + answers.racket + answers.lessons + answers.tournaments;
  const self = answers.self;
  const score = clamp(round1(clamp(self, experience - 1.5, experience + 1.0)), 1.0, 8.0);
  return { experience: round1(experience), self, score };
}

/** Banda de un puntaje: Alevín 1.0–1.9 … Profesional 7.0–8.0. */
const bandIndex = (score) => clamp(Math.floor(score) - 1, 0, LEVEL_BANDS.length - 1);

export function bandForScore(score) {
  return LEVEL_BANDS.at(bandIndex(score));
}

/**
 * Número de categoría recomendado. En las bandas de dos categorías, la mitad
 * baja va a la categoría inferior (5.0–5.4 → 6ª, 5.5–5.9 → 5ª).
 */
export function categoryNumberForScore(score) {
  const i = bandIndex(score);
  const band = LEVEL_BANDS.at(i);
  if (band.categories.length === 1) return band.categories[0];
  // Profesional llega hasta 8.0 inclusive: 8.0 cuenta como mitad alta.
  return score - (i + 1) < 0.5 ? band.categories[0] : band.categories[1];
}
