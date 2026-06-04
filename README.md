# dev-intern-search-api

Lightweight web search project with a TypeScript React frontend and a Python FastAPI backend using DuckDuckGo (no API key required).

## Overview

- **Frontend:** TypeScript + React (Vite) serving the UI.
- **Backend:** FastAPI app that performs free DuckDuckGo searches via `ddgs` and returns JSON results.

## Requirements

- Node.js 18+
- Python 3.12+

## Quickstart

1. Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the frontend at http://localhost:5173 and the backend API at http://127.0.0.1:8000 (docs at /docs).

## API Endpoints

- `GET /search?q=your+query` — Perform a web search and return results.
- `GET /health` — Health check.

Example: `http://127.0.0.1:8000/search?q=michael+jackson`

## Backend notes

- Search implementation uses the `ddgs` package (DuckDuckGo scraper). If you see `ModuleNotFoundError: ddgs`, run `pip install ddgs`.
- Main backend file: [backend/app.py](backend/app.py)

## Development

- Edit backend code, then restart uvicorn (or use `--reload`).
- Frontend uses Vite; changes are hot-reloaded by default.
