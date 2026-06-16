import { useState, useRef, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Source {
  title: string;
  url: string;
  snippet: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  error?: boolean;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:8000";

// ── Helpers ────────────────────────────────────────────────────────────────────

async function sendMessage(message: string): Promise<{ answer: string; sources: Source[] }> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? `Server error ${res.status}`);
  }

  const data = await res.json();

  return {
    answer: data.answer ?? "No answer returned.",
    sources: Array.isArray(data.sources) ? data.sources : [],
  };
}

// ── Components ─────────────────────────────────────────────────────────────────

function SourceCard({ source }: { source: Source }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="source-card"
    >
      <span className="source-title">{source.title || "Source"}</span>
      {source.snippet && (
        <span className="source-snippet">{source.snippet}</span>
      )}
      <span className="source-url">{source.url}</span>
    </a>
  );
}

function Message({ msg }: { msg: ChatMessage }) {
  if (msg.role === "user") {
    return (
      <div className="message user-message">
        <div className="bubble user-bubble">{msg.content}</div>
      </div>
    );
  }

  return (
    <div className="message assistant-message">
      <div className={`bubble assistant-bubble ${msg.error ? "error-bubble" : ""}`}>
        <div className="answer-text">
          {msg.content
            ? msg.content.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))
            : <p>No response received.</p>}
        </div>

        {msg.sources && msg.sources.length > 0 && (
          <div className="sources-section">
            <h4 className="sources-heading">Sources</h4>
            <div className="sources-list">
              {msg.sources.map((s, i) => (
                <SourceCard key={i} source={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentChat, setCurrentChat] = useState<string>("New Chat");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setHistory((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Save to sidebar history on first message of new chat
    if (history.length === 0) {
      setChatHistory((prev) => [text, ...prev]);
      setCurrentChat(text);
    }

    try {
      const { answer, sources } = await sendMessage(text);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
        sources,
      };
      setHistory((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errText =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `⚠️ Error: ${errText}`,
        error: true,
      };
      setHistory((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setHistory([]);
    setCurrentChat("New Chat");
    setInput("");
  };

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🤖</span>
            <span className="logo-text">AI Assistant</span>
            <span className="web-badge">Web Search</span>
          </div>
          <button className="settings-btn" title="Settings">⚙️</button>
        </div>

        <button className="new-chat-btn" onClick={handleNewChat}>
          + New Chat
        </button>

        <div className="history-section">
          <span className="history-label">HISTORY</span>
          {chatHistory.map((title, i) => (
            <button
              key={i}
              className={`history-item ${currentChat === title ? "active" : ""}`}
              onClick={() => {
                /* In a full app you'd restore the chat here */
                setCurrentChat(title);
              }}
            >
              {title.length > 28 ? title.slice(0, 28) + "…" : title}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="chat-main">
        {/* ── Messages ── */}
        <div className="messages-area">
          {history.length === 0 && !loading && (
            <div className="empty-state">
              <p className="empty-title">Ask me anything</p>
              <p className="empty-sub">I'll search the web and summarise the results for you.</p>
            </div>
          )}

          {history.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}

          {loading && (
            <div className="message assistant-message">
              <div className="bubble assistant-bubble loading-bubble">
                <span className="dot" /><span className="dot" /><span className="dot" />
                &nbsp; Searching the web and thinking…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div className="input-area">
          <div className="input-box">
            <textarea
              className="input-field"
              placeholder="Ask me anything…"
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="input-actions">
              <button className="action-btn" title="Search">🌐 Search</button>
              <button className="action-btn" title="Attach">📎 Attach</button>
              <button className="action-btn" title="Voice">🎤 Voice</button>
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                title="Send"
              >
                ➤
              </button>
            </div>
          </div>
          <p className="input-hint">
            Press <kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for new line
          </p>
        </div>
      </main>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #0d0d0f;
          color: #e8e8f0;
          height: 100vh;
          overflow: hidden;
        }

        .app {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 210px;
          min-width: 210px;
          background: #111114;
          border-right: 1px solid #222228;
          display: flex;
          flex-direction: column;
          padding: 12px;
          gap: 8px;
          overflow-y: auto;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0 8px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 600;
        }

        .logo-icon { font-size: 18px; }

        .web-badge {
          background: #6c3bff22;
          color: #a78bfa;
          border: 1px solid #6c3bff44;
          border-radius: 4px;
          font-size: 10px;
          padding: 2px 5px;
          font-weight: 500;
        }

        .settings-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          opacity: 0.6;
        }

        .new-chat-btn {
          background: #1e1e24;
          color: #e8e8f0;
          border: 1px solid #333340;
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 13px;
          text-align: left;
          transition: background 0.15s;
        }

        .new-chat-btn:hover { background: #2a2a34; }

        .history-section {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 4px;
        }

        .history-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #555568;
          padding: 4px 4px 6px;
        }

        .history-item {
          background: none;
          border: none;
          color: #aaaabc;
          font-size: 12.5px;
          text-align: left;
          padding: 6px 8px;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: background 0.15s, color 0.15s;
        }

        .history-item:hover { background: #1e1e28; color: #e8e8f0; }
        .history-item.active { background: #1e1e28; color: #e8e8f0; }

        /* ── Main ── */
        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── Messages ── */
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 32px 20% 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          scrollbar-width: thin;
          scrollbar-color: #333340 transparent;
        }

        @media (max-width: 900px) {
          .messages-area { padding: 24px 5% 16px; }
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #55556a;
          text-align: center;
          padding-top: 20vh;
        }

        .empty-title { font-size: 20px; font-weight: 600; color: #888899; }
        .empty-sub   { font-size: 14px; }

        /* ── Message Bubbles ── */
        .message {
          display: flex;
          max-width: 100%;
        }

        .user-message { justify-content: flex-end; }
        .assistant-message { justify-content: flex-start; }

        .bubble {
          border-radius: 14px;
          padding: 12px 16px;
          font-size: 14px;
          line-height: 1.6;
          max-width: 80%;
        }

        .user-bubble {
          background: #1e1e2a;
          border: 1px solid #2e2e3e;
          color: #e8e8f0;
          border-bottom-right-radius: 4px;
        }

        .assistant-bubble {
          background: #111118;
          border: 1px solid #222230;
          color: #d8d8e8;
          border-bottom-left-radius: 4px;
          width: 100%;
          max-width: 100%;
        }

        .error-bubble {
          border-color: #7f1d1d;
          background: #1c0a0a;
          color: #fca5a5;
        }

        .answer-text p {
          margin-bottom: 6px;
        }

        .answer-text p:last-child { margin-bottom: 0; }

        /* ── Loading dots ── */
        .loading-bubble {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #666680;
          font-size: 13px;
        }

        .dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #6c3bff;
          animation: bounce 1.2s infinite;
        }

        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }

        /* ── Sources ── */
        .sources-section {
          margin-top: 14px;
          border-top: 1px solid #222230;
          padding-top: 12px;
        }

        .sources-heading {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #555568;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .sources-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .source-card {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: #18181f;
          border: 1px solid #28283a;
          border-radius: 8px;
          padding: 8px 10px;
          text-decoration: none;
          transition: border-color 0.15s, background 0.15s;
        }

        .source-card:hover { border-color: #6c3bff55; background: #1c1c26; }

        .source-title {
          font-size: 13px;
          font-weight: 500;
          color: #a78bfa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .source-snippet {
          font-size: 12px;
          color: #888898;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .source-url {
          font-size: 11px;
          color: #44445a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Input Area ── */
        .input-area {
          padding: 12px 20% 16px;
          border-top: 1px solid #1a1a22;
          background: #0d0d0f;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        @media (max-width: 900px) {
          .input-area { padding: 12px 5% 16px; }
        }

        .input-box {
          background: #111118;
          border: 1px solid #2a2a3a;
          border-radius: 14px;
          padding: 12px 14px 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.15s;
        }

        .input-box:focus-within { border-color: #6c3bff66; }

        .input-field {
          background: transparent;
          border: none;
          outline: none;
          color: #e8e8f0;
          font-size: 14px;
          resize: none;
          font-family: inherit;
          line-height: 1.5;
          min-height: 24px;
          max-height: 120px;
          overflow-y: auto;
        }

        .input-field::placeholder { color: #44445a; }

        .input-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .action-btn {
          background: none;
          border: 1px solid #2a2a3a;
          border-radius: 6px;
          color: #666680;
          font-size: 12px;
          padding: 4px 8px;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }

        .action-btn:hover { border-color: #6c3bff55; color: #a78bfa; }

        .send-btn {
          margin-left: auto;
          background: #6c3bff;
          border: none;
          border-radius: 8px;
          color: #fff;
          width: 32px;
          height: 32px;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, opacity 0.15s;
        }

        .send-btn:hover:not(:disabled) { background: #7c52ff; }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .input-hint {
          font-size: 11px;
          color: #33334a;
          text-align: center;
        }

        kbd {
          background: #1e1e28;
          border: 1px solid #2a2a3a;
          border-radius: 3px;
          padding: 1px 4px;
          font-size: 10px;
          font-family: monospace;
          color: #666680;
        }
      `}</style>
    </div>
  );
}
