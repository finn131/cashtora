// generic input helpers
export function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  return missing.length ? `Missing required field(s): ${missing.join(', ')}` : null;
}

export function requireNonNegative(body, fields) {
  for (const f of fields) {
    if (body[f] !== undefined && (typeof body[f] !== 'number' || body[f] < 0)) {
      return `${f} must be a non-negative number`;
    }
  }
  return null;
}

export function requirePositiveInt(body, fields) {
  for (const f of fields) {
    if (body[f] !== undefined && (!Number.isInteger(body[f]) || body[f] <= 0)) {
      return `${f} must be a positive integer`;
    }
  }
  return null;
}

export function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function intIdParam(req, res, next) {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Invalid id: must be a positive integer' });
  }
  req.id = id;
  next();
}

// transaction helper (async, backend-agnostic via db.transaction)
export async function withTransaction(db, fn) {
  return db.transaction(fn);
}
