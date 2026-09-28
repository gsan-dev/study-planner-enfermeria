// Días de calendario a medianoche UTC (igual que las fechas de examen y del plan).

export const DIA_MS = 24 * 60 * 60 * 1000;

export const hoyUTC = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

export const sumarDias = (fecha, dias) => new Date(fecha.getTime() + dias * DIA_MS);

/** Lunes de la semana que contiene `fecha`. */
export const lunesDe = (fecha) => sumarDias(fecha, -((fecha.getUTCDay() + 6) % 7));

export const primeroDeMes = (fecha) => new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
