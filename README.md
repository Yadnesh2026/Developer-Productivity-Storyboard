# Developer Productivity MVP

Small full-stack assignment MVP built with:

- React on the frontend
- Node.js built-in HTTP server on the backend
- Mock workbook-like data for developer productivity metrics

## What it shows

- Individual contributor dashboard
- Metric interpretation, likely story, and suggested next steps
- Lightweight manager snapshot
- Backend-computed org benchmarks and narrative hints

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## Notes

This version uses sample data shaped like the assignment workbook. The next obvious extension is replacing `data/dashboard.json` with parsed workbook data and keeping the same UI/API contract.
