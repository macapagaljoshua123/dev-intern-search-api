#  dev-intern-search-api

AI-powered web search app with a **TypeScript + React** frontend and a **Python FastAPI** backend using **Google Gemini AI** and **DuckDuckGo** — no API key required for search (but AI needs Gemini API key).

---

## 📁 Project Structure

```
dev-intern-search-api/
├── backend/          # FastAPI Python backend
│   ├── app.py
│   └── requirements.txt
├── frontend/         # React + TypeScript (Vite) frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

##  Features

-  **AI Chat Assistant** powered by Google Gemini AI
-  **Web Search** using DuckDuckGo (no API key needed)
-  **Website Scraping** for accurate, up-to-date information
-  **Sources included** with every answer
-  **Beautiful formatted responses** (headings, bullet points, bold text)
-  **FastAPI** backend with automatic API docs
-  **React + TypeScript** frontend with Vite


---

##  Requirements

Make sure the following are installed on your machine before proceeding:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | https://nodejs.org |
| Python | 3.12+ | https://python.org |
| npm | bundled with Node.js | — |

> **Verify your installations** by running in terminal:
> ```bash
> node -v
> python --version
> ```

---

##  Getting Started

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

---

##  API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search?q=your+query` | Perform a DuckDuckGo web search |
| `GET` | `/health` | Health check for the backend |

**Example request:**
```
http://127.0.0.1:8000/search?q=michael+jackson
```

---

##  Troubleshooting

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

##  Development Workflow

- **Backend changes:** Uvicorn auto-reloads when you save `app.py` (thanks to `--reload` flag).
- **Frontend changes:** Vite hot-reloads automatically — no restart needed.

---

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Backend | Python, FastAPI, Uvicorn |
| Search | DuckDuckGo (`ddgs` package) |
| Styling | CSS |

---

