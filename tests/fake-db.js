/* Minimal in-memory stand-in for the subset of the MongoDB driver the API
   uses. Swapped in for api/_lib/db.js so the REAL route handlers can be
   exercised without a live database. */

import { ObjectId } from 'mongodb';

const store = new Map();
const coll = (n) => { if (!store.has(n)) store.set(n, []); return store.get(n); };
export function resetDb() { store.clear(); }
export function dump(n) { return coll(n); }

const eq = (a, b) => {
  if (a instanceof ObjectId || b instanceof ObjectId) return String(a) === String(b);
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
};

function matchOp(value, cond) {
  if (cond instanceof RegExp) return cond.test(String(value ?? ''));
  if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof ObjectId) && !(cond instanceof Date)) {
    for (const [op, arg] of Object.entries(cond)) {
      if (op === '$in'  && !arg.some((x) => eq(value, x))) return false;
      else if (op === '$ne'  && eq(value, arg)) return false;
      else if (op === '$gt'  && !(value > arg)) return false;
      else if (op === '$lt'  && !(value < arg)) return false;
      else if (op === '$exists' && (value !== undefined) !== arg) return false;
      else if (!['$in','$ne','$gt','$lt','$exists'].includes(op)) throw new Error('fake-db: unsupported op ' + op);
    }
    return true;
  }
  return eq(value, cond);
}

const get = (doc, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), doc);

function matches(doc, query) {
  for (const [key, cond] of Object.entries(query || {})) {
    if (key === '$or')  { if (!cond.some((q) => matches(doc, q))) return false; continue; }
    if (key === '$and') { if (!cond.every((q) => matches(doc, q))) return false; continue; }
    if (!matchOp(get(doc, key), cond)) return false;
  }
  return true;
}

function applyUpdate(doc, update) {
  for (const [k, v] of Object.entries(update.$set || {})) {
    const parts = k.split('.');
    let cur = doc;
    for (const p of parts.slice(0, -1)) { cur[p] ??= {}; cur = cur[p]; }
    cur[parts.at(-1)] = v;
  }
  for (const [k, v] of Object.entries(update.$inc || {})) doc[k] = (doc[k] ?? 0) + v;
  return doc;
}

function project(doc, projection) {
  if (!doc || !projection) return doc;
  const out = { ...doc };
  for (const [k, v] of Object.entries(projection)) {
    if (v === 0) delete out[k];
  }
  const includes = Object.entries(projection).filter(([k, v]) => v === 1 && k !== '_id');
  if (includes.length) {
    const kept = { _id: doc._id };
    for (const [k] of includes) kept[k] = doc[k];
    return kept;
  }
  return out;
}

function collection(name) {
  const rows = coll(name);
  return {
    async createIndex() { return name; },
    async findOne(query = {}, opts = {}) {
      const hit = rows.find((d) => matches(d, query));
      return hit ? project(structuredClone2(hit), opts.projection) : null;
    },
    find(query = {}, opts = {}) {
      let out = rows.filter((d) => matches(d, query)).map((d) => project(structuredClone2(d), opts.projection));
      const api = {
        sort(spec) {
          const [[k, dir]] = Object.entries(spec);
          out.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir);
          return api;
        },
        limit(n) { out = out.slice(0, n); return api; },
        async toArray() { return out; },
      };
      return api;
    },
    async insertOne(doc) {
      if (name === 'users' && rows.some((r) => r.email === doc.email)) {
        const err = new Error('duplicate key'); err.code = 11000; throw err;
      }
      if (name === 'bookings' && rows.some((r) => r.reference === doc.reference)) {
        const err = new Error('duplicate key'); err.code = 11000; throw err;
      }
      const _id = doc._id ?? new ObjectId();
      rows.push({ ...doc, _id });
      return { insertedId: _id };
    },
    async updateOne(query, update, opts = {}) {
      const hit = rows.find((d) => matches(d, query));
      if (hit) { applyUpdate(hit, update); return { modifiedCount: 1 }; }
      if (opts.upsert) {
        const doc = { ...(query._id ? { _id: query._id } : {}), ...query, ...(update.$setOnInsert || {}) };
        applyUpdate(doc, update);
        if (!doc._id) doc._id = new ObjectId();
        rows.push(doc);
        return { upsertedCount: 1 };
      }
      return { modifiedCount: 0 };
    },
    async updateMany(query, update) {
      let n = 0;
      for (const d of rows) if (matches(d, query)) { applyUpdate(d, update); n++; }
      return { modifiedCount: n };
    },
    async findOneAndUpdate(query, update, opts = {}) {
      const hit = rows.find((d) => matches(d, query));
      if (!hit) {
        if (!opts.upsert) return null;
        const doc = { ...(query._id !== undefined ? { _id: query._id } : {}), ...(update.$setOnInsert || {}) };
        for (const [k, v] of Object.entries(query)) if (typeof v !== 'object') doc[k] = v;
        applyUpdate(doc, update);
        rows.push(doc);
        return { value: project(structuredClone2(doc), opts.projection) };
      }
      applyUpdate(hit, update);
      return { value: project(structuredClone2(hit), opts.projection) };
    },
    async deleteOne(query) {
      const i = rows.findIndex((d) => matches(d, query));
      if (i >= 0) rows.splice(i, 1);
      return { deletedCount: i >= 0 ? 1 : 0 };
    },
    async deleteMany(query) {
      let n = 0;
      for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], query)) { rows.splice(i, 1); n++; }
      return { deletedCount: n };
    },
  };
}

// structuredClone chokes on ObjectId/Date graphs in some Node builds.
function structuredClone2(o) {
  if (o === null || typeof o !== 'object') return o;
  if (o instanceof ObjectId || o instanceof Date) return o;
  if (Array.isArray(o)) return o.map(structuredClone2);
  const out = {};
  for (const [k, v] of Object.entries(o)) out[k] = structuredClone2(v);
  return out;
}

export async function getDb() { return { collection }; }

export const Collections = {
  users:         () => collection('users'),
  sessions:      () => collection('sessions'),
  bookings:      () => collection('bookings'),
  counters:      () => collection('counters'),
  loginAttempts: () => collection('loginAttempts'),
};

export async function nextSequence(db, name) {
  const res = await collection('counters').findOneAndUpdate(
    { _id: name }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' }
  );
  return res?.value?.value ?? 1;
}
