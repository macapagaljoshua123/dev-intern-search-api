from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from ddgs import DDGS
import httpx
import re

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

# ============ CHAT ENDPOINT ============
@app.post("/chat")
async def chat(request: dict):
    question = request.get("message", "")
    if not question:
        raise HTTPException(status_code=400, detail="Message is required")
    
    print(f"Question received: {question}")
    
    # Search web
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
    if scraped_content:
        context = "\n\nWeb search results:\n"
        for i, src in enumerate(scraped_content, 1):
            context += f"\n[Source {i}] {src['title']}\nURL: {src['url']}\nContent: {src['content'][:1000]}\n"
    
    # Check if Gemini is available
    if not GEMINI_API_KEY or not ACTIVE_MODEL:
        # Fallback: return search results directly
        answer = f"## {question}\n\n"
        if search_results:
            answer += "Here's what I found from web search:\n\n"
            for i, r in enumerate(search_results[:3], 1):
                answer += f"### {i}. {r['title']}\n"
                answer += f"{r['snippet']}\n\n"
                answer += f"Source: {r['url']}\n\n"
        else:
            answer += "No search results found. Please try a different question.\n"
        
        return {"answer": answer, "sources": search_results}
    
    # Use Gemini AI
    prompt = f"""Answer this question: {question}

{context}

Instructions:
- Use your knowledge AND the web search results above
- Format with ## headings, markdown lists (-), **bold**
- At the end, list Sources with URLs
- No emojis

Answer:"""

    try:
        model = genai.GenerativeModel(ACTIVE_MODEL)
        response = model.generate_content(prompt)
        print(f"Gemini response received successfully")
        return {"answer": response.text, "sources": search_results}
    except Exception as e:
        print(f"Gemini error: {e}")
        # Fallback to search results
        answer = f"## {question}\n\n"
        if search_results:
            answer += "Based on web search:\n\n"
            for i, r in enumerate(search_results[:3], 1):
                answer += f"**{i}. {r['title']}**\n"
                answer += f"{r['snippet']}\n\n"
                answer += f"Source: {r['url']}\n\n"
        else:
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
            "POST /chat": "Send a message to AI (searches web + provides answers)",
            "GET /health": "Check API status"
        }
    }