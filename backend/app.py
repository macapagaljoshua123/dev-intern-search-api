from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from ddgs import DDGS
import httpx
import re
import time
from collections import deque
from datetime import datetime

load_dotenv()

app = FastAPI(title="AI Chat API - Gemini Powered")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
                print(f"⏳ Rate limit reached. Waiting {wait_seconds:.1f} seconds...")
                time.sleep(wait_seconds + 0.5)  # Add small buffer
        
        self.request_times.append(datetime.now())

# Create global rate limiter
rate_limiter = GeminiRateLimiter(requests_per_minute=5)

# ============ GEMINI SETUP ============
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ACTIVE_MODEL = None

if not GEMINI_API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY not found in .env file")
else:
    genai.configure(api_key=GEMINI_API_KEY)
    
    # Updated model names for 2026
    model_names_to_try = [
        'gemini-2.5-flash',      # Fast, general use (recommended)
        'gemini-2.5-pro',         # Complex reasoning
        'gemini-2.5-flash-lite',  # Lightweight
        'gemini-2.0-flash',       # Stable baseline
        'models/gemini-2.5-flash', # With models/ prefix
    ]
    
    for model_name in model_names_to_try:
        try:
            test_model = genai.GenerativeModel(model_name)
            # Simple test to verify it works
            test_response = test_model.generate_content("Say OK")
            ACTIVE_MODEL = model_name
            print(f"✅ Gemini working with model: {ACTIVE_MODEL}")
            break
        except Exception as e:
            print(f"Model {model_name} failed: {e}")
            continue
    
    if not ACTIVE_MODEL:
        print("⚠️ No working model found. Please check your API key and internet connection.")

# ============ WEB SEARCH ============
from search_providers import SearchManager

def search_web(query: str, max_results: int = 5):
    import asyncio
    manager = SearchManager()
    
    # Run the async method in a synchronous wrapper since search_web is used synchronously
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    if loop.is_running():
        # If we are already in an async context, this shouldn't be called directly, 
        # but chat() runs in FastAPI which uses threadpool for sync functions.
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            search_response = pool.submit(lambda: asyncio.run(manager.search(query, max_results=max_results))).result()
    else:
        search_response = loop.run_until_complete(manager.search(query, max_results=max_results))
        
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

# ============ CHAT ENDPOINT (SINGLE VERSION WITH FILE SUPPORT) ============
@app.post("/chat")
async def chat(request: dict):
    question = request.get("message", "")
    history = request.get("history", [])
    files = request.get("files", [])  # Get file contents
    
    # Allow empty question if files are attached
    if not question and not files:
        raise HTTPException(status_code=400, detail="Message or file is required")
    
    print(f"📝 Question received: {question if question else '(No question - analyzing files only)'}")
    
    if files:
        print(f"📎 Files received: {len(files)} file(s)")
        for f in files:
            content_preview = f['content'][:100].replace('\n', ' ')
            print(f"   - {f['name']} ({len(f['content'])} chars) - Preview: {content_preview}...")
    
    # Search web (skip if no question)
    search_results = []
    if question and question.strip():
        search_results = search_web(question, max_results=5)
        print(f"🔍 Found {len(search_results)} search results")
    
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
    
    # Add file content to context if files are attached
    if files:
        context += "\n\n=== ATTACHED FILES ===\n"
        for file in files:
            context += f"\n[File: {file['name']}]\n"
            # Limit file content to reasonable size (5000 chars)
            file_content = file['content'][:5000]
            context += f"{file_content}\n"
            if len(file['content']) > 5000:
                context += f"\n... (truncated, original size: {len(file['content'])} chars)\n"
        context += "\n=== END OF ATTACHED FILES ===\n"
    
    # Add web search results to context
    if scraped_content:
        context += "\n\n=== WEB SEARCH RESULTS ===\n"
        for i, src in enumerate(scraped_content, 1):
            context += f"\n[Source {i}] {src['title']}\nURL: {src['url']}\nContent: {src['content'][:1000]}\n"
    
    # Check if Gemini is available
    if not GEMINI_API_KEY or not ACTIVE_MODEL:
        # Fallback: return search results directly
        answer = f"## {question if question else 'File Analysis'}\n\n"
        if files:
            answer += f"### Attached Files:\n"
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
    
    # Build the prompt based on whether files are attached
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
        model = genai.GenerativeModel(ACTIVE_MODEL)
        
        # Apply rate limiting before making the API call
        rate_limiter.wait_if_needed()
        
        response = model.generate_content(prompt)
        
        # Optional: Print token usage for monitoring
        if hasattr(response, 'usage_metadata'):
            print(f"📊 Token usage - Prompt: {response.usage_metadata.prompt_token_count}, Response: {response.usage_metadata.candidates_token_count}, Total: {response.usage_metadata.total_token_count}")
        
        print(f"✅ Gemini response received successfully")
        return {"answer": response.text, "sources": search_results}
    except Exception as e:
        print(f"❌ Gemini error: {e}")
        # Fallback to search results
        answer = f"## {question if question else 'File Analysis'}\n\n"
        
        if files:
            answer += f"### Attached Files:\n"
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
        "active_model": ACTIVE_MODEL
    }

@app.get("/")
async def root():
    return {
        "name": "AI Chat API",
        "endpoints": {
            "POST /chat": "Send a message to AI (searches web + provides answers). Can also accept files.",
            "GET /health": "Check API status"
        }
    }