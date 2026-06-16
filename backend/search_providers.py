"""Search providers for the AI assistant."""

import os
import requests
from urllib.parse import quote
from typing import List, Dict, Optional

class SearchProvider:
    """Base class for search providers."""
    
    def search(self, query: str) -> Dict:
        raise NotImplementedError

class WikipediaSearch(SearchProvider):
    """Wikipedia search provider."""
    
    def search(self, query: str) -> Dict:
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
            print(f"Wikipedia error: {e}")
        
        return {
            "answer": "No Wikipedia article found.",
            "sources": [],
            "search_performed": False
        }

class GrokSearch(SearchProvider):
    """Grok AI search provider."""
    
    def __init__(self):
        try:
            from xai_sdk import Client
            from xai_sdk.chat import user, system
            from xai_sdk.tools import web_search
            
            api_key = os.getenv("XAI_API_KEY")
            if api_key:
                self.client = Client(api_key=api_key)
                self.available = True
            else:
                self.available = False
        except ImportError:
            self.available = False
    
    def search(self, query: str) -> Dict:
        if not self.available:
            return {"answer": "Grok not available", "sources": [], "search_performed": False}
        
        try:
            chat = self.client.chat.create(
                model=os.getenv("GROK_MODEL", "grok-4.20-reasoning"),
                tools=[web_search()],
                include=["verbose_streaming"]
            )
            
            chat.append(system("You are a helpful assistant. Use web search when needed."))
            chat.append(user(query))
            
            response = chat.sample()
            
            sources = []
            if hasattr(response, 'citations') and response.citations:
                for i, citation in enumerate(response.citations[:5]):
                    sources.append({
                        "title": f"Source {i+1}",
                        "url": citation if isinstance(citation, str) else str(citation)
                    })
            
            return {
                "answer": response.content,
                "sources": sources,
                "search_performed": True
            }
        except Exception as e:
            print(f"Grok error: {e}")
            return {"answer": f"Error: {e}", "sources": [], "search_performed": False}