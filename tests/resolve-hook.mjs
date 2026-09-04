import { pathToFileURL } from 'node:url';
import path from 'node:path';

const FAKE = pathToFileURL(path.resolve(process.cwd(), 'tests/fake-db.js')).href;

export async function resolve(specifier, context, next) {
  const parent = context.parentURL ?? '';
  // Only swap the database module, and only for imports coming from api/.
  if (/(^|\/)(_lib\/)?db\.js$/.test(specifier) && parent.includes('/api/')) {
    return { url: FAKE, shortCircuit: true };
  }
  return next(specifier, context);
}
