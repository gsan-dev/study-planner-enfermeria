// Instrucciones y esquema de salida comunes a todos los proveedores de IA.

export const SYSTEM_PROMPT = `Extraes horarios de clase a partir de fotos, capturas o PDF de horarios universitarios (normalmente del Grado en Enfermería, en España). La persona revisará el resultado en una tabla antes de guardarlo, así que prioriza la fidelidad a lo que aparece en el documento.

Devuelve una entrada en "clases" por cada bloque de clase que aparezca en la semana:
- "asignatura": el nombre tal como aparece. Si el horario usa siglas y tiene una leyenda que las explica, usa el nombre completo de la leyenda; si no, deja las siglas. Usa el mismo texto exacto para todos los bloques de una misma asignatura, aunque sean de teoría, prácticas o seminario; si el tipo de sesión aparece, no lo incluyas en el nombre.
- "dia": 1 = lunes, 2 = martes, 3 = miércoles, 4 = jueves, 5 = viernes, 6 = sábado, 0 = domingo.
- "horaInicio" y "horaFin": formato 24 h "HH:mm". Si un bloque ocupa varias filas de la tabla, usa la hora de inicio de la primera y la de fin de la última.
- "aula" y "profesor": el texto si aparece junto al bloque; si no, cadena vacía.

Si el documento tiene varias semanas o grupos distintos, extrae la semana o grupo más completo o el primero, y explícalo en "avisos". Usa también "avisos" para cualquier cosa dudosa (texto ilegible, horas que no se leen bien). Si la imagen no es un horario de clases, devuelve "clases" vacío y explica el motivo en "avisos". Escribe los avisos en español, en frases breves; deja "avisos" vacío si no hay nada que señalar.`;

export const USER_PROMPT = 'Extrae las clases de este horario.';

// Esquema de salida estructurada (JSON Schema): la respuesta siempre lo cumple.
export const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    clases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          asignatura: { type: 'string' },
          dia: { type: 'integer', enum: [0, 1, 2, 3, 4, 5, 6] },
          horaInicio: { type: 'string' },
          horaFin: { type: 'string' },
          aula: { type: 'string' },
          profesor: { type: 'string' },
        },
        required: ['asignatura', 'dia', 'horaInicio', 'horaFin', 'aula', 'profesor'],
        additionalProperties: false,
      },
    },
    avisos: { type: 'string' },
  },
  required: ['clases', 'avisos'],
  additionalProperties: false,
};
