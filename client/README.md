# Client

Frontend SPA untuk Cashtora (POS + Inventory).

## Stack

- React 18
- Vite
- React Router

## Struktur

```
client/
  src/
    App.jsx
    main.jsx
    components/       # Reusable UI components
    pages/            # Route-level page components
    context/          # React context (AuthContext)
    api.js            # Axios instance + interceptors
    index.css         # Global styles
  api/index.js        # Vercel serverless entry (Express)
  index.html
  vite.config.js
```

## Menjalankan

```bash
npm install
npm run dev       # dev server :5173 (proxy /api → :3000)
npm run build     # produksi → dist/
```
