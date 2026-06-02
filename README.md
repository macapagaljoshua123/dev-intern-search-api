# Search API

Full-stack web search app with a React + TypeScript frontend and a Python FastAPI backend.

The backend searches DuckDuckGo through the free `ddgs` package. The AI Summary feature does not call a paid AI model; it creates a lightweight summary from the top search result snippets and returns those sources.

## Requirements

- Python 3.12+
- Node.js 18+

## Backend Setup

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Backend URL:

```txt
http://127.0.0.1:8000
```

API docs:

```txt
http://127.0.0.1:8000/docs
```

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

```txt
http://localhost:5173
```

To point the frontend at a different backend, create `frontend/.env.local`:

```txt
VITE_API_URL=http://127.0.0.1:8000
```

## API Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /` | API overview |
| `GET /health` | Backend health check |
| `GET /search?q=query` | DuckDuckGo search results |
| `GET /ai-search?q=query` | Source-based summary plus top sources |

## Notes

- If the frontend says the backend is unavailable, make sure the backend server is running on port `8000`.
- If search fails, the backend now returns a clear API error instead of silently pretending there were no results.
- Generated files such as virtual environments, `node_modules`, and Python cache folders are ignored by Git.
