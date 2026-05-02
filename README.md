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

## Deploy on Render

This app is ready to deploy as a Node web service.

1. Push the repo to GitHub.
2. In Render, create a new Web Service from the GitHub repo.
3. Use:
   - Build command: `npm install`
   - Start command: `npm start`
4. Deploy.

The included `render.yaml` also describes the same setup.
