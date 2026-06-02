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
venv\Scripts\activate # Windows
source venv/bin/activate # WSL/Mac


3. Install dependencies:
pip install -r requirements.txt


Or install manually:
pip install fastapi uvicorn ddgs httpx beautifulsoup4 python-dotenv


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

Open in browser:
- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8000
- API Docs: http://127.0.0.1:8000/docs

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /search?q=query | Search the web |
| GET /ai-search?q=question | AI search with sources |
| GET /health | Check API status |

## requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
ddgs==7.0.0
httpx==0.25.1
beautifulsoup4==4.12.2
python-dotenv==1.0.0


## Common Issues

- **Module not found 'ddgs'**: Run `pip install ddgs`
- **Module not found 'axios'**: Run `npm install axios`
- **Connection refused on port 8000**: Make sure backend is running
- **No search results**: Check your internet connection

---

Developer: Joshua Macapagal | Collaborator: Ady
