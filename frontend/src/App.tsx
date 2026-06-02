import { useState } from "react";
import axios from "axios";
import "./App.css";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultCount, setResultCount] = useState(0);

  const API_URL = "http://127.0.0.1:8000";

  const handleSearch = async () => {
    if (!query.trim()) {
      setError("Please enter a search term");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await axios.get(`${API_URL}/search`, {
        params: { q: query },
      });

      setResults(res.data.results || []);
      setResultCount(res.data.count || 0);
    } catch (err: any) {
      setError(
        err.message || "Connection error. Make sure backend is running.",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Search API</h1>
        <p className="subtitle">Free Web Search | Powered by DuckDuckGo</p>
        <p className="subtitle-small">
          No API key required | For development only
        </p>
      </header>

      <div className="search-container">
        <div className="search-box">
          <input
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search the web... (e.g., Michael Jackson, latest news, technology)"
          />
          <button
            className="search-button"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Searching the web for "{query}"...</p>
        </div>
      )}

      {results.length > 0 && !loading && (
        <div className="results-container">
          <div className="results-header">
            <h3>Search Results</h3>
            <span className="result-count">About {resultCount} results</span>
          </div>

          <div className="results-list">
            {results.map((result, index) => (
              <div key={index} className="result-item">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="result-title"
                >
                  {result.title}
                </a>
                <div className="result-url">{result.url}</div>
                <p className="result-snippet">{result.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !loading && !error && query && (
        <div className="no-results">
          <p>No results found for "{query}"</p>
          <p className="hint">Try different keywords or check your spelling</p>
        </div>
      )}

      {!query && !loading && results.length === 0 && (
        <div className="welcome-message">
          <div className="welcome-icon"></div>
          <h3>Start searching</h3>
          <p>Enter a search term above to search the web</p>
          <div className="example-queries">
            <p>Try:</p>
            <button onClick={() => setQuery("Michael Jackson")}>
              Michael Jackson
            </button>
            <button onClick={() => setQuery("Latest technology news 2026")}>
              Latest technology news
            </button>
            <button onClick={() => setQuery("What is artificial intelligence")}>
              What is AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
