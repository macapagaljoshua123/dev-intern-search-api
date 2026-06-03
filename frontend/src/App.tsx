import React, { useState, useRef, useEffect } from "react";
import "./App.css";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  sources?: Source[];
  sourceType?: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface Source {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

const API_URL = "http://127.0.0.1:8000";

/* ─── Markdown Renderer ──────────────────────────────────────────────── */

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  const parseInline = (str: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let buf = "";
    let j = 0;
    while (j < str.length) {
      if (str[j] === "*" && str[j + 1] === "*") {
        const end = str.indexOf("**", j + 2);
        if (end !== -1) {
          if (buf) { parts.push(buf); buf = ""; }
          parts.push(<strong key={`b${j}`}>{str.slice(j + 2, end)}</strong>);
          j = end + 2;
          continue;
        }
      }
      if (str[j] === "`") {
        const end = str.indexOf("`", j + 1);
        if (end !== -1) {
          if (buf) { parts.push(buf); buf = ""; }
          parts.push(
            <code key={`c${j}`} className="inline-code">
              {str.slice(j + 1, end)}
            </code>
          );
          j = end + 1;
          continue;
        }
      }
      if (str[j] === "[") {
        const textEnd = str.indexOf("]", j);
        if (textEnd !== -1 && str[textEnd + 1] === "(") {
          const urlEnd = str.indexOf(")", textEnd + 2);
          if (urlEnd !== -1) {
            if (buf) { parts.push(buf); buf = ""; }
            parts.push(
              <a
                key={`l${j}`}
                href={str.slice(textEnd + 2, urlEnd)}
                target="_blank"
                rel="noopener noreferrer"
                className="md-link"
              >
                {str.slice(j + 1, textEnd)}
              </a>
            );
            j = urlEnd + 1;
            continue;
          }
        }
      }
      buf += str[j];
      j++;
    }
    if (buf) parts.push(buf);
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={`pre${i}`} className="md-pre">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      nodes.push(<h3 key={`h${i}`} className="md-h3">{parseInline(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      nodes.push(<h2 key={`h${i}`} className="md-h2">{parseInline(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      nodes.push(<h1 key={`h${i}`} className="md-h1">{parseInline(line.slice(2))}</h1>);
    } else if (line.trim() === "---") {
      nodes.push(<hr key={`hr${i}`} className="md-hr" />);
    } else if (line.match(/^[-*•]\s/)) {
      nodes.push(
        <div key={`li${i}`} className="md-li">
          <span className="md-bullet">•</span>
          <span>{parseInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\.\s/)![1];
      nodes.push(
        <div key={`li${i}`} className="md-li">
          <span className="md-bullet">{num}.</span>
          <span>{parseInline(line.slice(num.length + 2))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      nodes.push(<div key={`sp${i}`} className="md-spacer" />);
    } else {
      nodes.push(<p key={`p${i}`} className="md-p">{parseInline(line)}</p>);
    }
    i++;
  }

  return nodes;
}

/* ─── SVG Icons ──────────────────────────────────────────────────────── */

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const WebSearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const KnowledgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const BotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M12 2a4 4 0 0 1 4 4v5H8V6a4 4 0 0 1 4-4z" />
    <circle cx="9" cy="16" r="1" fill="currentColor" /><circle cx="15" cy="16" r="1" fill="currentColor" />
  </svg>
);

/* ─── Helpers ────────────────────────────────────────────────────────── */

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/* ─── Main App ───────────────────────────────────────────────────────── */

export default function App() {
  const [page, setPage] = useState<"landing" | "chat">("landing");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statusMessage]);

  useEffect(() => {
    if (page === "chat") fetchHistory();
  }, [page]);

  /* ── API Functions ─────────────────────────────────────────────────── */

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/history`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/history/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          (data.messages || []).map((m: Message) => ({
            ...m,
            isStreaming: false,
          }))
        );
        setCurrentConvId(id);
        if (window.innerWidth < 768) setSidebarOpen(false);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  const saveConversation = async (convId: string, msgs: Message[]) => {
    if (msgs.length === 0) return;
    const firstUserMsg = msgs.find((m) => m.type === "user");
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 60) +
        (firstUserMsg.content.length > 60 ? "..." : "")
      : "New Chat";

    try {
      await fetch(`${API_URL}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: convId,
          title,
          messages: msgs.map((m) => ({
            id: m.id,
            type: m.type,
            content: m.content,
            sources: m.sources || null,
            sourceType: m.sourceType || null,
            timestamp: m.timestamp,
          })),
        }),
      });
      fetchHistory();
    } catch (err) {
      console.error("Failed to save conversation:", err);
    }
  };

  const handleDeleteConversation = async (
    id: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/history/${id}`, { method: "DELETE" });
      if (currentConvId === id) {
        setMessages([]);
        setCurrentConvId(null);
      }
      fetchHistory();
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  /* ── Chat Functions ────────────────────────────────────────────────── */

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConvId(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const convId = currentConvId || generateId();
    if (!currentConvId) setCurrentConvId(convId);

    const userMessage: Message = {
      id: generateId(),
      type: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setStatusMessage("");

    try {
      const response = await fetch(
        `${API_URL}/chat-stream?message=${encodeURIComponent(input)}`
      );
      if (!response.ok) throw new Error("Failed to fetch");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";
      let sources: Source[] = [];
      let sourceType = "";

      const aiMessageId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          type: "ai",
          content: "",
          timestamp: new Date().toISOString(),
          isStreaming: true,
        },
      ]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "metadata") {
              sourceType = data.source_type || "";
            } else if (data.type === "status") {
              setStatusMessage(data.status);
            } else if (data.type === "text") {
              aiResponse += data.content;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: aiResponse, isStreaming: true }
                    : msg
                )
              );
              setStatusMessage("");
            } else if (data.type === "sources") {
              sources = data.sources || [];
            } else if (data.type === "done") {
              const finalSourceType = data.source_type || sourceType;
              setMessages((prev) => {
                const finalMessages = prev.map((msg) =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        content: aiResponse,
                        sources: sources.length > 0 ? sources : undefined,
                        sourceType: finalSourceType,
                        isStreaming: false,
                      }
                    : msg
                );
                // Auto-save after AI response completes
                saveConversation(convId, finalMessages);
                return finalMessages;
              });
            }
          } catch {
            /* skip malformed JSON */
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          type: "ai",
          content:
            "Error connecting to AI. Please make sure the backend is running and try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  /* ── Landing Page ──────────────────────────────────────────────────── */

  if (page === "landing") {
    return (
      <div className="landing-container">
        <div className="background-animation">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
          <div className="grid-overlay"></div>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <header className="landing-header">
          <div className="logo">
            <div className="logo-icon-wrapper">
              <BotIcon />
            </div>
            <span className="logo-text">AI Assistant</span>
          </div>
          <nav className="landing-nav">
            <span className="nav-status">
              <span className="status-dot"></span>
              Online
            </span>
            <button className="nav-cta" onClick={() => setPage("chat")}>
              Open Chat →
            </button>
          </nav>
        </header>

        {/* ── Hero Section ───────────────────────────────────────────── */}
        <main className="landing-main">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              Powered by Knowledge Base + Web Search
            </div>

            <h1 className="hero-title">
              Your AI That{" "}
              <span className="gradient-text">Actually Knows Things</span>
            </h1>

            <p className="hero-subtitle">
              Built with a <strong>50+ topic knowledge base</strong> that
              answers instantly from memory. When you need the latest info, it
              automatically searches the web and synthesizes the results.
            </p>

            {/* Stats Row */}
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">50+</span>
                <span className="stat-label">Knowledge Topics</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">&lt;1s</span>
                <span className="stat-label">Response Time</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">∞</span>
                <span className="stat-label">Chat History</span>
              </div>
            </div>

            <div className="hero-actions">
              <button
                className="cta-button"
                onClick={() => setPage("chat")}
              >
                Start Chatting Now
                <span className="button-arrow">→</span>
              </button>
              <span className="cta-hint">No sign-up required</span>
            </div>
          </div>

          {/* ── Chat Preview ────────────────────────────────────────── */}
          <div className="hero-graphic">
            <div className="chat-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="preview-title">AI Assistant</span>
              </div>
              <div className="preview-messages">
                <div className="chat-bubble user-bubble">
                  What is quantum computing?
                </div>
                <div className="chat-bubble ai-bubble">
                  <div className="ai-bubble-badge">📚 Knowledge Base</div>
                  Quantum computing uses <strong>qubits</strong> that can exist
                  in multiple states simultaneously, enabling parallel
                  processing at unprecedented speeds...
                </div>
                <div className="chat-bubble user-bubble">
                  Latest AI news 2026
                </div>
                <div className="chat-bubble ai-bubble">
                  <div className="ai-bubble-badge">🔍 Web Search</div>
                  Searching the web for the latest info...
                  <span className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              </div>
            </div>
            {/* Glow behind preview */}
            <div className="preview-glow"></div>
          </div>
        </main>

        {/* ── Features Section ───────────────────────────────────────── */}
        <section className="features-section">
          <h2 className="section-title">
            How It <span className="gradient-text">Works</span>
          </h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-bg knowledge">
                <KnowledgeIcon />
              </div>
              <h3>Smart Knowledge Base</h3>
              <p>
                Answers from 50+ built-in topics instantly — no API calls, no
                latency, no cost.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-bg speed">⚡</div>
              <h3>Instant Responses</h3>
              <p>
                Knowledge base answers stream in real-time, word by word — just
                like talking to a real AI.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-bg search">
                <WebSearchIcon />
              </div>
              <h3>Web Fallback</h3>
              <p>
                When you need the latest info, DuckDuckGo search kicks in
                automatically and synthesizes results.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-bg history">
                <ChatIcon />
              </div>
              <h3>Persistent History</h3>
              <p>
                Every conversation is auto-saved. Browse, load, and delete past
                chats from the sidebar.
              </p>
            </div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="landing-footer">
          <p>
            Built with FastAPI + React · Created by{" "}
            <strong>Joshua Macapagal &amp; Ady</strong>
          </p>
        </footer>
      </div>
    );
  }

  /* ── Chat Page ─────────────────────────────────────────────────────── */

  return (
    <div className="chat-page-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── History Sidebar ─────────────────────────────────────────── */}
      <aside className={`history-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>
            <ChatIcon /> History
          </h2>
          <button className="new-chat-btn" onClick={handleNewChat}>
            <PlusIcon /> New Chat
          </button>
        </div>

        <div className="conversation-list">
          {conversations.length === 0 ? (
            <div className="no-history">
              <p>No conversations yet</p>
              <p className="no-history-hint">
                Start chatting to see your history here
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${
                  conv.id === currentConvId ? "active" : ""
                }`}
                onClick={() => loadConversation(conv.id)}
              >
                <div className="conv-info">
                  <span className="conv-title">{conv.title}</span>
                  <span className="conv-meta">
                    {conv.message_count} messages ·{" "}
                    {formatDate(conv.updated_at || conv.created_at)}
                  </span>
                </div>
                <button
                  className="conv-delete"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  title="Delete conversation"
                >
                  <TrashIcon />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Main Chat Area ──────────────────────────────────────────── */}
      <div className="chat-main">
        <div className="chat-header">
          <div className="header-content">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle history"
            >
              <MenuIcon />
            </button>
            <h1>AI Assistant</h1>
            <div className="header-actions">
              {statusMessage && (
                <span className="status-indicator active">
                  {statusMessage}
                </span>
              )}
              <button
                className="back-button"
                onClick={() => setPage("landing")}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        <div className="messages-area">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <BotIcon />
              </div>
              <h2>Welcome!</h2>
              <p>Ask me anything! I have knowledge about many topics.</p>
              <div className="suggested-questions">
                <button onClick={() => setInput("What is photosynthesis?")}>
                  What is photosynthesis?
                </button>
                <button
                  onClick={() => setInput("Tell me about Albert Einstein")}
                >
                  Tell me about Albert Einstein
                </button>
                <button
                  onClick={() =>
                    setInput("How does machine learning work?")
                  }
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
              className={`message-wrapper ${
                message.type === "user" ? "user" : "ai"
              }`}
            >
              {message.type === "ai" && (
                <div className="ai-avatar">
                  <BotIcon />
                </div>
              )}

              <div className={`message-bubble ${message.type}`}>
                {message.type === "ai" && message.sourceType && (
                  <div
                    className={`source-badge ${
                      message.sourceType.includes("Web")
                        ? "web-search"
                        : "knowledge-base"
                    }`}
                  >
                    {message.sourceType.includes("Web") ? (
                      <>
                        <WebSearchIcon /> Web Search
                      </>
                    ) : (
                      <>
                        <KnowledgeIcon /> Knowledge Base
                      </>
                    )}
                  </div>
                )}

                <div className="message-content">
                  {message.isStreaming && !message.content && (
                    <span className="typing-indicator"></span>
                  )}
                  {message.content && (
                    <div className="message-text">
                      {message.type === "ai" ? (
                        renderMarkdown(message.content)
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  )}
                </div>

                {message.sources && message.sources.length > 0 && (
                  <div className="message-sources">
                    <div className="sources-title">
                      <LinkIcon /> Sources
                    </div>
                    {message.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-link"
                        title={source.snippet}
                      >
                        <span className="source-favicon">
                          <LinkIcon />
                        </span>
                        <span className="source-text">{source.title}</span>
                        <span className="source-domain">
                          {source.source.replace("www.", "")}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {statusMessage && (
            <div className="message-wrapper ai">
              <div className="ai-avatar">
                <BotIcon />
              </div>
              <div className="message-bubble ai">
                <div className="message-content">
                  <div className="status-message">
                    <span className="loading-spinner"></span>
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
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                <SendIcon />
              )}
            </button>
          </form>
          <p className="input-hint">
            I'll answer from my knowledge base, and search the web for the
            latest info when needed
          </p>
        </div>
      </div>
    </div>
  );
}
