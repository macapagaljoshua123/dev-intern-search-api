from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
import traceback
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Grok client
try:
    from xai_sdk import Client
    from xai_sdk.chat import user, system
    from xai_sdk.tools import web_search
    
    XAI_API_KEY = os.getenv("XAI_API_KEY")
    if not XAI_API_KEY:
        print("⚠️ WARNING: XAI_API_KEY not found in .env file")
        print("Please get your API key from https://x.ai/api")
        GROK_AVAILABLE = False
    else:
        client = Client(api_key=XAI_API_KEY)
        GROK_AVAILABLE = True
        print("✅ Grok AI client initialized successfully")
except ImportError:
    print("⚠️ xai-sdk not installed. Run: pip install xai-sdk")
    GROK_AVAILABLE = False
except Exception as e:
    print(f"⚠️ Error initializing Grok: {e}")
    GROK_AVAILABLE = False

app = FastAPI(title="AI Search Assistant API - Powered by Grok")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class Source(BaseModel):
    title: str
    url: str

class ChatResponse(BaseModel):
    question: str
    answer: str
    sources: List[Source] = []
    search_performed: bool = False
    model: str = "grok"

# Fallback search when Grok is not available
def fallback_search(query: str) -> dict:
    """Simple fallback when Grok is not available."""
    import requests
    from urllib.parse import quote
    
    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(query)}"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('extract'):
                return {
                    "answer": f"**{data.get('title', query)}**:\n\n{data.get('extract', '')[:1000]}",
                    "sources": [{
                        "title": data.get('title', query),
                        "url": f"https://en.wikipedia.org/wiki/{quote(data.get('title', query))}"
                    }],
                    "search_performed": True
                }
    except Exception as e:
        print(f"Fallback search error: {e}")
    
    return {
        "answer": "I couldn't find information about your question. Please try rephrasing.",
        "sources": [],
        "search_performed": False
    }

@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "AI Search Assistant is running 🚀",
        "powered_by": "Grok AI",
        "grok_available": GROK_AVAILABLE
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "grok_available": GROK_AVAILABLE
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_post(request: ChatRequest):
    return await _handle_chat(request.message)

@app.get("/chat")
async def chat_get(message: str):
    return await _handle_chat(message)

async def _handle_chat(message: str) -> ChatResponse:
    message = message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    print(f"📝 Question received: {message}")

    # Use Grok if available
    if GROK_AVAILABLE:
        try:
            # Create chat session with web search
            chat_session = client.chat.create(
                model=os.getenv("GROK_MODEL", "grok-4.20-reasoning"),
                tools=[web_search()],
                include=["verbose_streaming"]
            )
            
            # Add system prompt and user message
            chat_session.append(system(
                """You are a helpful AI assistant with web search capabilities.
                Provide accurate, well-structured answers with citations.
                When using web search, always cite your sources.
                Format your responses using Markdown for readability.
                Use bullet points, headings, and bold text for clarity."""
            ))
            chat_session.append(user(message))
            
            # Get response
            print("🔄 Getting response from Grok AI...")
            response = chat_session.sample()
            
            # Extract sources from citations
            sources = []
            if hasattr(response, 'citations') and response.citations:
                for i, citation in enumerate(response.citations[:5]):
                    sources.append(Source(
                        title=f"Source {i+1}",
                        url=citation if isinstance(citation, str) else str(citation)
                    ))
            
            print("✅ Response received from Grok")
            
            return ChatResponse(
                question=message,
                answer=response.content,
                sources=sources,
                search_performed=True,
                model="grok"
            )
            
        except Exception as e:
            print(f"⚠️ Grok API error: {e}")
            traceback.print_exc()
            # Fallback to Wikipedia
            print("🔄 Falling back to Wikipedia search...")
            fallback_result = fallback_search(message)
            return ChatResponse(
                question=message,
                answer=fallback_result["answer"],
                sources=[Source(**s) for s in fallback_result["sources"]],
                search_performed=fallback_result["search_performed"],
                model="fallback"
            )
    
    # Fallback when Grok is not available
    print("🔄 Using fallback search (Grok not available)")
    fallback_result = fallback_search(message)
    return ChatResponse(
        question=message,
        answer=fallback_result["answer"],
        sources=[Source(**s) for s in fallback_result["sources"]],
        search_performed=fallback_result["search_performed"],
        model="fallback"
    )

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)