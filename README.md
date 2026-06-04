#  dev-intern-search-api

AI-powered web search app with a **TypeScript + React** frontend and a **Python FastAPI** backend using **Google Gemini AI** and **DuckDuckGo** — no API key required for search (but AI needs Gemini API key).

---

## 📁 Project Structure

```
dev-intern-search-api/
├── backend/
│   ├── app.py                 # FastAPI application with AI chat
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # API keys (NOT committed)
│   └── venv/                  # Virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AIChat.tsx     # Main AI chat component
│   │   │   └── ...            # Other components
│   │   ├── App.tsx            # Main app component
│   │   └── main.tsx           # Entry point
│   ├── package.json           # Node.js dependencies
│   └── index.html             # HTML template
└── README.md                  # This file
```

## Features

-  **AI Chat Assistant** powered by Google Gemini AI
-  **Web Search** using DuckDuckGo (no API key needed)
-  **Website Scraping** for accurate, up-to-date information
-  **Sources included** with every answer
-  **Beautiful formatted responses** (headings, bullet points, bold text)
-  **FastAPI** backend with automatic API docs
-  **React + TypeScript** frontend with Vite


---

Requirements

Make sure the following are installed on your machine before proceeding:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | https://nodejs.org |
| Python | 3.12+ | https://python.org |
| npm | bundled with Node.js | — |
| Google Gemini API Key | Free | https://aistudio.google.com/ |

> **Verify your installations** by running in terminal:
> ```bash
> node -v
> python --version
> ```
---

## Getting Started

You need to run **two terminals** simultaneously — one for the backend, one for the frontend.

---

### 1️ Backend Setup (FastAPI)

Open a terminal and run the following commands:

```bash
# 1. Navigate to the backend folder
cd backend

# 2. Create a Python virtual environment
python -m venv venv

# 3. Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start the backend server
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Backend is running at: **http://127.0.0.1:8000**

---

### 2️ Frontend Setup (React + Vite)

Open a **second terminal** and run:

```bash
# 1. Navigate to the frontend folder
cd frontend

# 2. Install Node.js dependencies
npm install

# 3. Start the development server
npm run dev
```

Frontend is running at: **http://localhost:5173**

---

## 🌐 Accessing the App

Once both servers are running:

| Service | URL |
|---------|-----|
|  Frontend (Landing Page) | http://localhost:5173 |
|  Backend API | http://127.0.0.1:8000 |
|  API Docs (Swagger UI) | http://127.0.0.1:8000/docs |
|  Health Check | http://127.0.0.1:8000/health |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search?q=your+query` | Perform a DuckDuckGo web search |
| `GET` | `/health` | Health check for the backend |
| `GET` | `/` | API information |

**Example request:**
```
curl -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is photosynthesis?"}'
```

**Example response:**
```
{
  "answer": "## Photosynthesis\n\nPhotosynthesis is the process...",
  "sources": [
    {
      "title": "Photosynthesis - Wikipedia",
      "url": "https://en.wikipedia.org/wiki/Photosynthesis",
      "snippet": "Photosynthesis is a process used by plants..."
    }
  ]
}
```

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'ddgs'`
The DuckDuckGo search package is missing. Install it manually:
```bash
pip install ddgs
```

### `venv\Scripts\activate` not working on Windows
Try using **Git Bash** or **PowerShell** instead of Command Prompt. In PowerShell, you may need to run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Frontend can't connect to backend (CORS error)
Make sure the backend is running on port **8000** before starting the frontend. Both servers must be active at the same time.

### Port already in use
If port 8000 or 5173 is already occupied, use a different port:
```bash
# Backend on a different port
uvicorn app:app --reload --port 8001

# Frontend on a different port
npm run dev -- --port 3000
```

---

## Development Workflow

- **Backend changes:** Uvicorn auto-reloads when you save `app.py` (thanks to `--reload` flag).
- **Frontend changes:** Vite hot-reloads automatically — no restart needed.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Backend | Python, FastAPI, Uvicorn |
| Search | DuckDuckGo (`ddgs` package) |
| Styling | CSS |

---

---
Backend Dependencies (backend/requirements.txt)

| Package | Version | Purpose |
|--------|----------|-------------|
| `fastapi` | `	0.115.0 ` | Web framework for API |
| `uvicorn` | `	0.30.0 ` | ASGI server |
| `ddgs` | `	9.0.0 ` | 	DuckDuckGo search API |
| `python-dotenv` | ` 1.0.0 ` | Environment variable management |
| `google-generativeai` | ` 0.8.0 ` | 	Google Gemini AI integration |
| `httpx` | ` 0.27.0 ` | 	Async HTTP client for web scraping |
---

---
Frontend Dependencies (frontend/package.json)

| Package | Version | Purpose |
|--------|----------|-------------|
| `react` | `	^18.2.0` | 	UI framework |
| `react-dom` | `		^18.2.0 ` | 	DOM rendering |
| `axios` | `		^1.6.0 ` | 		HTTP client for API calls |
| `vite` | ` 	^5.0.0 ` | 	Build tool and dev server |
| `typescript` | ` 	^5.2.0 ` | 		Type safety |
---

---
Getting Your Gemini API Key (Free)
1. Go to Google AI Studio

2. Sign in with your Google account

3. Click "Get API key"

4. Click "Create API key"

5. Give it a name (e.g., "dev-intern-search")

6. Copy your API key

7. Create a .env file in the backend/ folder:

```text
Set-GEMINI_API_KEY=your_api_key_here
```
Important: Never commit your .env file to GitHub! Add it to .gitignore.
---

---

How It Works
1. User asks a question in the chat interface

2. Backend searches the web using DuckDuckGo

3. Top results are scraped for detailed content

4. Gemini AI processes the question + search results

5. AI generates a formatted answer with:
• Main explanation from its knowledge base
• Enhanced information from web search
•Properly cited sources

6. Frontend displays the beautiful formatted response
