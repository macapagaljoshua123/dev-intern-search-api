import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import "./App.css";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

type SearchMode = "search" | "ai";

interface SearchHistoryItem {
  id: string;
  mode: SearchMode;
  query: string;
  searchedAt: number;
}

const HISTORY_STORAGE_KEY = "search-api-history";
const MAX_HISTORY_ITEMS = 8;

const getInitialHistory = (): SearchHistoryItem[] => {
  const savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);

  if (!savedHistory) {
    return [];
  }

  try {
    return JSON.parse(savedHistory) as SearchHistoryItem[];
  } catch {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    return [];
  }
};

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("search");
  const [history, setHistory] = useState<SearchHistoryItem[]>(getInitialHistory);

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const getErrorMessage = (err: unknown) => {
    if (axios.isAxiosError(err)) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      return (
        axiosError.response?.data?.detail ||
        axiosError.message ||
        "Connection error. Make sure the backend is running."
      );
    }

    return "Connection error. Make sure the backend is running.";
  };

  const addSearchHistory = (searchQuery: string, searchMode: SearchMode) => {
    const id = `${searchMode}:${searchQuery.toLowerCase()}`;

    setHistory((currentHistory) => {
      const nextItem: SearchHistoryItem = {
        id,
        mode: searchMode,
        query: searchQuery,
        searchedAt: Date.now(),
      };

      return [
        nextItem,
        ...currentHistory.filter((item) => item.id !== id),
      ].slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const runSearch = async (searchQuery: string, nextMode: SearchMode) => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setError("Please enter a search term");
      return;
    }

    setQuery(trimmedQuery);
    setMode(nextMode);
    setLoading(true);
    setError("");
    setResults([]);
    setAnswer("");
    setSubmittedQuery(trimmedQuery);

    try {
      const endpoint = nextMode === "ai" ? "/ai-search" : "/search";
      const res = await axios.get(`${API_URL}${endpoint}`, {
        params: { q: trimmedQuery },
      });

      setAnswer(res.data.answer || "");
      setResults(res.data.results || res.data.sources || []);
      setResultCount(res.data.count || 0);
      addSearchHistory(trimmedQuery, nextMode);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (nextMode: SearchMode = mode) => {
    void runSearch(query, nextMode);
  };

  const handleHistorySearch = (item: SearchHistoryItem) => {
    void runSearch(item.query, item.mode);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setAnswer("");
    setLoading(false);
    setError("");
    setResultCount(0);
    setSubmittedQuery("");
    setMode("search");
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const hasSearchState =
    query || submittedQuery || results.length > 0 || answer || error;

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
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search the web..."
          />
          <button
            className="action-button search-button"
            onClick={() => handleSearch("search")}
            disabled={loading}
          >
            <span className="button-icon search-icon" aria-hidden="true" />
            <span>{loading ? "Searching" : "Search"}</span>
          </button>
          <button
            className="action-button ai-button"
            onClick={() => handleSearch("ai")}
            disabled={loading}
          >
            <span className="button-icon ai-icon" aria-hidden="true" />
            <span>Summary</span>
          </button>
          {hasSearchState && (
            <button
              className="action-button clear-button"
              onClick={handleClear}
              disabled={loading}
            >
              <span className="button-icon clear-icon" aria-hidden="true" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {history.length > 0 && (
          <section className="history-panel" aria-label="Search history">
            <div className="history-header">
              <h2>Recent Searches</h2>
              <button onClick={handleClearHistory} disabled={loading}>
                Clear history
              </button>
            </div>
            <div className="history-list">
              {history.map((item) => (
                <button
                  key={item.id}
                  className="history-item"
                  onClick={() => handleHistorySearch(item)}
                  disabled={loading}
                >
                  <span className="history-query">{item.query}</span>
                  <span className="history-mode">
                    {item.mode === "ai" ? "Summary" : "Search"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Searching the web for "{submittedQuery}"...</p>
        </div>
      )}

      {answer && !loading && (
        <section className="answer-container">
          <div className="results-header">
            <h3>AI Summary</h3>
            <span className="result-count">Based on top sources</span>
          </div>
          <p>{answer}</p>
        </section>
      )}

      {results.length > 0 && !loading && (
        <div className="results-container">
          <div className="results-header">
            <h3>{mode === "ai" ? "Sources" : "Search Results"}</h3>
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

      {results.length === 0 && !loading && !error && submittedQuery && (
        <div className="no-results">
          <p>No results found for "{submittedQuery}"</p>
          <p className="hint">Try different keywords or check your spelling</p>
        </div>
      )}

      {!submittedQuery && !loading && results.length === 0 && (
        <div className="welcome-message">
          <div className="welcome-icon"></div>
          <h3>Start searching</h3>
          <p>Enter a search term above to search the web</p>
          <div className="example-queries">
            <p>Try:</p>
            <button onClick={() => setQuery("Software engineering internships")}>
              Software internships
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
