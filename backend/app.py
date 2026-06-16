from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import httpx
import re
import time
from collections import deque
from datetime import datetime

load_dotenv()

app = FastAPI(title="AI Chat API - Gemini Powered")

import sys
import os

# Add the directory containing this file to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ============ CORS MIDDLEWARE ============
# ✅ FIX: Allow all origins so deployed frontend can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ RATE LIMITER FOR GEMINI API ============
class GeminiRateLimiter:
    def __init__(self, requests_per_minute=5):
        self.requests_per_minute = requests_per_minute
        self.request_times = deque(maxlen=requests_per_minute)

    def wait_if_needed(self):
        now = datetime.now()
        # Remove requests older than 60 seconds
        while self.request_times and (now - self.request_times[0]).total_seconds() > 60:
            self.request_times.popleft()

        if len(self.request_times) >= self.requests_per_minute:
            oldest = self.request_times[0]
            wait_seconds = 60 - (now - oldest).total_seconds()
            if wait_seconds > 0:
                print(f"Rate limit reached. Waiting {wait_seconds:.1f} seconds...")
                time.sleep(wait_seconds + 0.5)

        self.request_times.append(datetime.now())

# Create global rate limiter
rate_limiter = GeminiRateLimiter(requests_per_minute=5)

# ============ GEMINI SETUP ============
# ✅ FIX: No live API calls at startup — just configure the client.
#    Model is picked once and reused across all requests.
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ACTIVE_MODEL = "gemini-2.0-flash"  # Single reliable default — no startup probing

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found. Set it in Vercel Environment Variables.")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"Gemini configured with model: {ACTIVE_MODEL}")

# ============ WEB SEARCH ============
from search_providers import SearchManager

def search_web(query: str, max_results: int = 5):
    import asyncio
    manager = SearchManager()

    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            search_response = pool.submit(
                lambda: asyncio.run(manager.search(query, max_results=max_results))
            ).result()
    else:
        search_response = loop.run_until_complete(
            manager.search(query, max_results=max_results)
        )

    return search_response.get("results", [])

# ============ SCRAPE ============
async def scrape_url(url: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                text = response.text
                text = re.sub(r'<[^>]+>', ' ', text)
                text = re.sub(r'\s+', ' ', text)
                return text[:2000]
    except Exception as e:
        print(f"Scrape error: {e}")
    return ""

# ============ CHAT ENDPOINT ============
@app.post("/chat")
async def chat(request: dict):
    question = request.get("message", "")
    history = request.get("history", [])
    files = request.get("files", [])

    # Allow empty question if files are attached
    if not question and not files:
        raise HTTPException(status_code=400, detail="Message or file is required")

    print(f"Question received: {question if question else '(No question - analyzing files only)'}")

    if files:
        print(f"Files received: {len(files)} file(s)")
        for f in files:
            content_preview = f['content'][:100].replace('\n', ' ')
            print(f"  - {f['name']} ({len(f['content'])} chars) - Preview: {content_preview}...")

    # Search web (skip if no question)
    search_results = []
    if question and question.strip():
        search_results = search_web(question, max_results=5)
        print(f"Found {len(search_results)} search results")

    # Scrape content from top results
    scraped_content = []
    for result in search_results[:2]:
        if result.get("url"):
            content = await scrape_url(result["url"])
            if content:
                scraped_content.append({
                    "title": result["title"],
                    "url": result["url"],
                    "content": content
                })

    # Build context for AI
    context = ""

    if files:
        context += "\n\n=== ATTACHED FILES ===\n"
        for file in files:
            context += f"\n[File: {file['name']}]\n"
            file_content = file['content'][:5000]
            context += f"{file_content}\n"
            if len(file['content']) > 5000:
                context += f"\n... (truncated, original size: {len(file['content'])} chars)\n"
        context += "\n=== END OF ATTACHED FILES ===\n"

    if scraped_content:
        context += "\n\n=== WEB SEARCH RESULTS ===\n"
        for i, src in enumerate(scraped_content, 1):
            context += f"\n[Source {i}] {src['title']}\nURL: {src['url']}\nContent: {src['content'][:1000]}\n"

    # ✅ FIX: Check Gemini availability using the pre-configured ACTIVE_MODEL
    if not GEMINI_API_KEY or not ACTIVE_MODEL:
        # Fallback: return search results directly without Gemini
        answer = f"## {question if question else 'File Analysis'}\n\n"
        if files:
            answer += "### Attached Files:\n"
            for f in files:
                answer += f"- {f['name']}\n"
            answer += f"\n### File Content Preview:\n```\n{files[0]['content'][:1000] if files else 'No content'}\n```\n\n"
        if search_results:
            answer += "Here's what I found from web search:\n\n"
            for i, r in enumerate(search_results[:3], 1):
                answer += f"### {i}. {r['title']}\n"
                answer += f"{r['snippet']}\n\n"
                answer += f"Source: {r['url']}\n\n"
        else:
            answer += "No search results found. Please try a different question.\n"

        return {"answer": answer, "sources": search_results}

    # Build prompt
    if files and not question:
        prompt = f"""Analyze the attached file(s) and provide a summary.

{context}

Instructions:
- Analyze the ATTACHED FILES content
- Provide a clear summary of what's in the file(s)
- If there are multiple files, explain how they relate
- Format with ## headings, markdown lists (-), **bold**
- No emojis

Summary:"""
    else:
        prompt = f"""Answer this question: {question}

{context}

Instructions:
- Use the ATTACHED FILES content FIRST if files are provided
- Then use your knowledge AND the WEB SEARCH RESULTS above
- If files are attached, analyze their content and answer based on them
- If the question is about the attached files, focus on the file content
- Format with ## headings, markdown lists (-), **bold**
- At the end, list Sources with URLs
- No emojis

Answer:"""

    try:
        # ✅ FIX: Use the pre-configured ACTIVE_MODEL — no probing loop here
        model = genai.GenerativeModel(ACTIVE_MODEL)

        rate_limiter.wait_if_needed()

        response = model.generate_content(prompt)

        if hasattr(response, 'usage_metadata'):
            print(
                f"Token usage - Prompt: {response.usage_metadata.prompt_token_count}, "
                f"Response: {response.usage_metadata.candidates_token_count}, "
                f"Total: {response.usage_metadata.total_token_count}"
            )

        print("Gemini response received successfully")
        return {"answer": response.text, "sources": search_results}

    except Exception as e:
        print(f"Gemini error: {e}")
        # Fallback to search results
        answer = f"## {question if question else 'File Analysis'}\n\n"

        if files:
            answer += "### Attached Files:\n"
            for f in files:
                answer += f"- {f['name']}\n"
            answer += f"\n### File Preview:\n```\n{files[0]['content'][:1000]}\n```\n\n"

        if search_results:
            answer += "Based on web search:\n\n"
            for i, r in enumerate(search_results[:3], 1):
                answer += f"**{i}. {r['title']}**\n"
                answer += f"{r['snippet']}\n\n"
                answer += f"Source: {r['url']}\n\n"
        else:
            if not files:
                answer = f"## {question}\n\nSorry, I couldn't find information about that. Please try rephrasing your question."

        return {"answer": answer, "sources": search_results}


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "gemini_configured": bool(GEMINI_API_KEY and ACTIVE_MODEL),
        "active_model": ACTIVE_MODEL,
    }


@app.get("/")
async def root():
    return {
        "name": "AI Chat API",
        "endpoints": {
            "POST /chat": "Send a message to AI (searches web + provides answers). Can also accept files.",
            "GET /health": "Check API status",
        },
    }