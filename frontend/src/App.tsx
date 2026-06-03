import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import "./App.css";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
  }>;
  sourceType?: string; // NEW: Track where answer came from
  timestamp: Date;
  isStreaming?: boolean;
}

interface Source {
  title: string;
  url: string;
  snippet: string;
  source: string;
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setQuery(trimmedQuery);
    setMode(nextMode);
    setLoading(true);
    setStatusMessage("");

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
      setStatusMessage("");
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

        <main className="landing-main">
          <div className="hero-content">
            <h1 className="hero-title">
              Chat with AI That{" "}
              <span className="gradient-text">Thinks Like Humans</span>
            </h1>

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

        <footer className="landing-footer">
          <p>Created by Joshua Macapagal & Ady</p>
        </footer>
      </div>
    );
  }

  // Chat Page
  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <button className="back-button" onClick={() => setPage("landing")}>
            ← Back
          </button>
          <h1>AI Assistant</h1>
          <div className="header-status">
            {statusMessage && (
              <span className="status-indicator active">{statusMessage}</span>
            )}
          </div>
        </div>
      </div>

      <div className="messages-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h2>Welcome!</h2>
            <p>Ask me anything! I have knowledge about many topics.</p>
            <div className="suggested-questions">
              <button onClick={() => setInput("What is photosynthesis?")}>
                What is photosynthesis?
              </button>
              <button onClick={() => setInput("Tell me about Albert Einstein")}>
                Tell me about Albert Einstein
              </button>
              <button
                onClick={() => setInput("How does machine learning work?")}
              >
                How does machine learning work?
              </button>
              <button onClick={() => setInput("Latest AI news 2026")}>
                Latest AI news 2026
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-wrapper ${message.type === "user" ? "user" : "ai"}`}
          >
            <div className={`message-bubble ${message.type}`}>
              {/* NEW: Source type badge */}
              {message.type === "ai" && message.sourceType && (
                <div
                  className={`source-badge ${
                    message.sourceType.includes("Web")
                      ? "web-search"
                      : "knowledge-base"
                  }`}
                >
                  {message.sourceType.includes("Web")
                    ? "🔍 Web Search"
                    : "📚 Knowledge Base"}
                </div>
              )}

              <div className="message-content">
                {message.isStreaming && (
                  <span className="typing-indicator"></span>
                )}
                {message.content && (
                  <div className="message-text">
                    {message.content.split("\n").map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                )}
              </div>

              {message.sources && message.sources.length > 0 && (
                <div className="message-sources">
                  <div className="sources-title">📚 Sources:</div>
                  {message.sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                      title={source.snippet}
                    >
                      <span className="source-favicon">🔗</span>
                      <span className="source-text">{source.title}</span>
                      <span className="source-domain">({source.source})</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {statusMessage && (
          <div className="message-wrapper ai">
            <div className="message-bubble ai">
              <div className="message-content">
                <div className="status-message">
                  <span>{statusMessage}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="input-form"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={loading}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="send-button"
          >
            {loading ? "⏳" : "📤"}
          </button>
        </form>
        <p className="input-hint">
          I'll answer from my knowledge base, and search the web for the latest
          info when needed
        </p>
      </div>
    </div>
  );
}
