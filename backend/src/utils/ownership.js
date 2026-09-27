import { AppError } from './AppError.js';

/**
 * Busca un documento por id que pertenezca al usuario. Si no existe o es de
 * otro usuario responde 404 (no se revela si el id existe).
 */
export async function findOwned(Model, id, userId, notFoundMessage) {
  const doc = await Model.findOne({ _id: id, userId });
  if (!doc) throw AppError.notFound(notFoundMessage);
  return doc;
}
