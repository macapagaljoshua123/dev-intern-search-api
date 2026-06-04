"""
Multiple search providers - lahat free, may fallback kung may mawala
"""

from ddgs import DDGS
import httpx
from typing import List, Dict, Optional
import asyncio

class DuckDuckGoProvider:
    """DuckDuckGo search - no API key needed, unlimited"""
    
    name = "DuckDuckGo"
    
    @staticmethod
    async def search(query: str, max_results: int = 10) -> List[Dict]:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
                return [
                    {
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": r.get("body", ""),
                        "source": "DuckDuckGo"
                    }
                    for r in results
                ]
        except Exception as e:
            print(f"DuckDuckGo error: {e}")
            return []


class MarginaliaProvider:
    """Marginalia Search - no API key needed, uses 'public' as key"""
    
    name = "Marginalia"
    
    @staticmethod
    async def search(query: str, max_results: int = 10) -> List[Dict]:
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(
                    "https://search.marginalia.nu/search",
                    params={
                        "query": query,
                        "count": max_results,
                        "format": "json"
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    return [
                        {
                            "title": r.get("title", ""),
                            "url": r.get("url", ""),
                            "snippet": r.get("snippet", ""),
                            "source": "Marginalia"
                        }
                        for r in results[:max_results]
                    ]
        except Exception as e:
            print(f"Marginalia error: {e}")
        return []


class BraveProvider:
    """Brave Search - needs API key pero may $5 free credits/month"""
    
    name = "Brave"
    
    @staticmethod
    async def search(query: str, api_key: Optional[str] = None, max_results: int = 10) -> List[Dict]:
        if not api_key:
            return []
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    headers={
                        "Accept": "application/json",
                        "X-Subscription-Token": api_key
                    },
                    params={
                        "q": query,
                        "count": max_results
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("web", {}).get("results", [])
                    return [
                        {
                            "title": r.get("title", ""),
                            "url": r.get("url", ""),
                            "snippet": r.get("description", ""),
                            "source": "Brave"
                        }
                        for r in results[:max_results]
                    ]
        except Exception as e:
            print(f"Brave error: {e}")
        return []


class SearchManager:
    """Manage multiple search providers with fallback"""
    
    def __init__(self, brave_api_key: Optional[str] = None):
        self.providers = [
            DuckDuckGoProvider(),
            MarginaliaProvider(),
        ]
        self.brave_api_key = brave_api_key
    
    async def search(self, query: str, max_results: int = 10) -> Dict:
        """Try each provider until one works"""
        
        # Try DuckDuckGo first (most reliable, no key needed)
        results = await DuckDuckGoProvider.search(query, max_results)
        if results:
            return {
                "query": query,
                "results": results,
                "provider_used": "DuckDuckGo",
                "total_results": len(results)
            }
        
        # Fallback to Marginalia
        results = await MarginaliaProvider.search(query, max_results)
        if results:
            return {
                "query": query,
                "results": results,
                "provider_used": "Marginalia",
                "total_results": len(results)
            }
        
        # Optional: Try Brave if API key available
        if self.brave_api_key:
            results = await BraveProvider.search(query, self.brave_api_key, max_results)
            if results:
                return {
                    "query": query,
                    "results": results,
                    "provider_used": "Brave",
                    "total_results": len(results)
                }
        
        # If all fail
        return {
            "query": query,
            "results": [],
            "provider_used": "None",
            "total_results": 0,
            "error": "All search providers failed. Please try again later."
        }
    
    async def search_all(self, query: str, max_results: int = 5) -> Dict:
        """Search from ALL providers simultaneously (for cross-validation)"""
        
        tasks = [
            DuckDuckGoProvider.search(query, max_results),
            MarginaliaProvider.search(query, max_results),
        ]
        
        if self.brave_api_key:
            tasks.append(BraveProvider.search(query, self.brave_api_key, max_results))
        
        results_list = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine results
        all_results = []
        providers_working = []
        
        for i, results in enumerate(results_list):
            if isinstance(results, list) and results:
                all_results.extend(results)
                providers_working.append(self.providers[i].name if i < len(self.providers) else "Brave")
        
        # Remove duplicates (by URL)
        unique_results = {}
        for r in all_results:
            url = r.get("url", "")
            if url and url not in unique_results:
                unique_results[url] = r
        
        return {
            "query": query,
            "results": list(unique_results.values())[:max_results * 2],
            "providers_working": providers_working,
            "total_results": len(unique_results)
        }