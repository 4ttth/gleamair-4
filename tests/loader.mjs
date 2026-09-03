/* Redirects api/_lib/db.js to the in-memory fake so the real route handlers
   can be exercised without a live MongoDB. Registered via --import. */
import { register } from 'node:module';
register('./resolve-hook.mjs', import.meta.url);
