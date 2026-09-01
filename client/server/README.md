# Server

Backend API for Kasir+Inventory.

## Stack

- Express.js
- PostgreSQL (Supabase) via `pg`
- JWT auth (jsonwebtoken + bcrypt)

## Categories

Merupakan bagian dari rootDirectory Vercel (`client/`), sehingga ter-deploy sebagai serverless function di `/api`.

## Status

Selesai & terverifikasi — 21 integration test pass (login, produk, stok, sales, PO, laporan, auth guard).
