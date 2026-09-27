import { z } from 'zod';
import { AppError } from '../utils/AppError.js';

// Mensajes por defecto en español para los casos sin mensaje propio.
z.config(z.locales.es());

function formatIssues(issues) {
  const details = {};
  for (const issue of issues) {
    const field = issue.path.join('.') || '_';
    details[field] ??= issue.message;
  }
  return details;
}

/**
 * Valida `params`, `query` y `body` con esquemas zod.
 * - body: se sustituye por los datos validados (sin campos desconocidos).
 * - query: Express 5 no permite reasignarla; queda en `req.validatedQuery`.
 * - params: solo se valida.
 */
export const validate = (schemas) => (req, _res, next) => {
  const details = {};
  const parsed = {};

  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (result.success) parsed[key] = result.data;
    else Object.assign(details, formatIssues(result.error.issues));
  }

  if (Object.keys(details).length > 0) {
    const [firstMessage] = Object.values(details);
    return next(AppError.badRequest(firstMessage, details));
  }

  if (parsed.body) req.body = parsed.body;
  if (parsed.query) req.validatedQuery = parsed.query;
  return next();
};
