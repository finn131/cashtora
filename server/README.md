# Server

Backend API untuk Cashtora (POS + Inventory).

## Stack

- Express.js
- PostgreSQL via Supabase (`pg`)
- JWT auth (jsonwebtoken + bcrypt)

## Struktur

```
server/
  src/
    index.js          # Entry point
    app.js            # Express app + CORS + rate limit
    db.js             # pg Pool + transaction (AsyncLocalStorage)
    routes/           # auth, products, stock, sales, suppliers, purchase-orders, reports
    middleware/       # JWT auth guard
    utils/            # jwt, validate
  test/api.test.mjs   # 21 integration test (E2E)
```

## Menjalankan

```bash
# local dev
DATABASE_URL="postgresql://..." npm run dev

# test (22 integration test)
DATABASE_URL="postgresql://..." npm test
```

> Wajib `DATABASE_URL` (PostgreSQL/Supabase) untuk menjalankan & test.
