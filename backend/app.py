from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from datetime import datetime
from ddgs import DDGS

app = FastAPI(title="Search API", description="Free Web Search API for development")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def search_web(query: str, max_results: int = 15) -> List[Dict]:
    """Search the web using DuckDuckGo - Free, no API key needed"""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            
            if not results:
                return []
            
            search_results = []
            for r in results:
                search_results.append({
                    'title': r.get('title', 'No title'),
                    'url': r.get('href', '#'),
                    'snippet': r.get('body', 'No description available'),
                })
            
            return search_results
            
    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(
            status_code=502,
            detail="Search provider failed. Please try again in a moment.",
        ) from e


def build_ai_summary(query: str, results: List[Dict]) -> str:
    if not results:
        return f"I could not find enough web results to summarize for '{query}'."

    snippets = [
        result["snippet"].strip()
        for result in results[:5]
        if result.get("snippet") and result["snippet"] != "No description available"
    ]

    if not snippets:
        return f"I found sources for '{query}', but they did not include enough description text to summarize."

    summary = " ".join(snippets)
    if len(summary) > 700:
        summary = f"{summary[:697].rstrip()}..."

    return summary

@app.get("/")
def root():
    return {
        "name": "Search API",
        "version": "1.0.0",
        "description": "Free web search API for development",
        "endpoints": {
            "/search": "GET - Search the web",
            "/ai-search": "GET - Search and generate a source-based summary",
            "/health": "GET - Check API status"
        },
        "example": "GET /search?q=michael jackson"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/search")
async def search(q: str = Query(..., min_length=1, description="Search query")):
    """
    Search the web endpoint
    Example: /search?q=latest technology news
    """
    print(f"Searching for: {q}")
    results = search_web(q, max_results=15)
    
    return {
        "query": q,
        "results": results,
        "count": len(results),
        "source": "DuckDuckGo (Free API)"
    }


@app.get("/ai-search")
async def ai_search(q: str = Query(..., min_length=1, description="Search query")):
    """
    Search the web and return a lightweight source-based summary.
    This does not call a paid AI model; it summarizes the top snippets.
    """
    print(f"AI-style search for: {q}")
    results = search_web(q, max_results=8)

    return {
        "query": q,
        "answer": build_ai_summary(q, results),
        "sources": results[:5],
        "count": len(results),
        "source": "DuckDuckGo snippets",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
