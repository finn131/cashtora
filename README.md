# Cashtora — POS & Manajemen Inventori (tanpa AI)

POS (Point of Sale) cashier + inventory management untuk toko/kasir. Full-stack app: React frontend + Express/SQLite backend. Tanpa fitur AI.

## Fitur Utama

- **Autentikasi** — login JWT + bcrypt, role-based access (admin/cashier).
- **Produk** — CRUD produk, SKU unik, kategori, harga beli/jual.
- **Stok** — kelola stok masuk/keluar, riwayat mutasi.
- **Kasir / POS** — transaksi penjualan, hitung pajak (10%), anti oversell (cek stok).
- **Supplier & Purchase Order** — kelola supplier, PO pending → receive (stok bertambah otomatis).
- **Laporan & Analitik** — dashboard (total penjualan, stok, dll) & laporan per periode.
- **Rekomendasi Restock** — berbasis logic (stok minimum + lead time supplier), bukan AI.

## Stack

| Lapisan | Teknologi |
|---------|-----------|
| Backend | Express 5, PostgreSQL di Supabase, JWT, bcrypt |
| Frontend | React 18, Vite |
| Auth | JWT (jsonwebtoken) + bcryptjs |

## Instalasi & Menjalankan

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Mode develop (dari folder root)

```bash
npm run dev
```

Menjalankan backend (port 3000) & frontend (port 5173) bersamaan.

Atau manual, dua terminal terpisah:

```bash
# Terminal 1 — backend
cd server && node --watch src/index.js

# Terminal 2 — frontend
cd client && npm run dev
```

Frontend dev server: http://localhost:5173 — proxy ke backend di port 3000.

### 3. Mode produksi (build + start)

```bash
npm run build   # build frontend → client/dist/
npm start       # start backend Express (port 3000)
```

### 4. Via systemd (user service)

```bash
systemctl --user start cashtora-server
systemctl --user start cashtora-vite
```

### Test & lint

```bash
npm test   # 21 integration test backend
```

## Kredensial Seed Default

Login awal:

- **Username:** admin
- **Password:** admin123

> **PENTING:** Ganti password admin segera di produksi. Kredensial default bersifat publik.

## Konfigurasi Lingkungan (env)

- `DATABASE_URL` — connection string PostgreSQL/Supabase (wajib di produksi).
- `JWT_SECRET` — wajib di produksi. Backend menolak start dengan fallback insecure secret saat `NODE_ENV=production`.

Buat secret kuat:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Struktur Folder

```
cashier-inventory/
  client/              # Frontend React + Vite (SPA, port 5173)
    api/index.js       # Vercel serverless entry (re-export Express app)
    vercel.json        # SPA rewrites untuk Vercel
  server/              # Backend Express API (port 3000)
    src/
      index.js         # Entry point
      app.js           # Express app
      db.js            # pg Pool + transaction helper
      routes/          # auth, products, stock, sales, suppliers, purchase-orders, reports
      middleware/      # JWT auth guard
      utils/           # jwt, validate
    test/api.test.mjs  # 21 integration test
  package.json         # Root scripts
```

## Status

**Selesai & terverifikasi** — QA pass (21 test, 0 failed), build produksi sukses.
