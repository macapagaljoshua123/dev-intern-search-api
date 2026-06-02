# Search API with TypeScript Frontend + Python Backend

Web search application with AI capabilities using free DuckDuckGo search API.

## Requirements

- TypeScript 5.2+
- Python 3.12+
- Node.js 18+

## Setup

### Backend (Python)

1. Navigate to backend folder:
   cd backend

2. Create virtual environment:
   python -m venv venv
   venv\Scripts\activate    # Windows
   source venv/bin/activate # WSL/Mac

3. Install dependencies:
   pip install -r requirements.txt

4. Start backend server:
   uvicorn app:app --reload --host 0.0.0.0 --port 8000

### Frontend (TypeScript + React)

1. Navigate to frontend folder:
   cd frontend

2. Install dependencies:
   npm install

3. Start frontend server:
   npm run dev

## Usage

- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8000
- API Documentation: http://127.0.0.1:8000/docs

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /search?q=query | Search the web |
| GET /ai-search?q=question | AI search with sources |
| GET /health | Check API status |

## Project Structure

dev-intern-search-api/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── venv/
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   ├── package.json
│   └── index.html
└── README.md

## Common Issues

- Module not found 'ddgs': Run pip install ddgs
- Module not found 'axios': Run npm install axios
- Connection refused on port 8000: Make sure backend is running
- No search results: Check your internet connection

Developer: Joshua Macapagal
Collaborator: Ady
