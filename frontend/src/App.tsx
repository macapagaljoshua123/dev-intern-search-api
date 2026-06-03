import React, { useState, useRef, useEffect } from "react";
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
  sourceType?: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface Source {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

// ─── Simple Markdown Renderer ───────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  const parseInline = (str: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let buf = "";
    let j = 0;
    while (j < str.length) {
      // Bold **text**
      if (str[j] === "*" && str[j + 1] === "*") {
        const end = str.indexOf("**", j + 2);
        if (end !== -1) {
          if (buf) {
            parts.push(buf);
            buf = "";
          }
          parts.push(<strong key={j}>{str.slice(j + 2, end)}</strong>);
          j = end + 2;
          continue;
        }
      }
      // Inline code `code`
      if (str[j] === "`") {
        const end = str.indexOf("`", j + 1);
        if (end !== -1) {
          if (buf) {
            parts.push(buf);
            buf = "";
          }
          parts.push(
            <code key={j} className="inline-code">
              {str.slice(j + 1, end)}
            </code>,
          );
          j = end + 1;
          continue;
        }
      }
      // Markdown link [text](url)
      if (str[j] === "[") {
        const textEnd = str.indexOf("]", j);
        if (textEnd !== -1 && str[textEnd + 1] === "(") {
          const urlEnd = str.indexOf(")", textEnd + 2);
          if (urlEnd !== -1) {
            if (buf) {
              parts.push(buf);
              buf = "";
            }
            const linkText = str.slice(j + 1, textEnd);
            const url = str.slice(textEnd + 2, urlEnd);
            parts.push(
              <a
                key={j}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="md-link"
              >
                {linkText}
              </a>,
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

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={i} className="md-pre">
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={i} className="md-h3">
          {parseInline(line.slice(4))}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={i} className="md-h2">
          {parseInline(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={i} className="md-h1">
          {parseInline(line.slice(2))}
        </h1>,
      );
    }
    // Horizontal rule
    else if (line.trim() === "---") {
      nodes.push(<hr key={i} className="md-hr" />);
    }
    // List item
    else if (line.match(/^[-*•]\s/)) {
      nodes.push(
        <div key={i} className="md-li">
          <span className="md-bullet">•</span>
          <span>{parseInline(line.slice(2))}</span>
        </div>,
      );
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\.\s/)![1];
      nodes.push(
        <div key={i} className="md-li">
          <span className="md-bullet">{num}.</span>
          <span>{parseInline(line.slice(num.length + 2))}</span>
        </div>,
      );
    }
    // Blank line → spacer
    else if (line.trim() === "") {
      nodes.push(<div key={i} className="md-spacer" />);
    }
    // Regular paragraph
    else {
      nodes.push(
        <p key={i} className="md-p">
          {parseInline(line)}
        </p>,
      );
    }

    i++;
  }

  return nodes;
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const SendIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const LoadingIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
    className="spin-icon"
  >
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

const WebSearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="14"
    height="14"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const KnowledgeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="14"
    height="14"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const LinkIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="12"
    height="12"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const BotIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M12 2a4 4 0 0 1 4 4v5H8V6a4 4 0 0 1 4-4z" />
    <circle cx="9" cy="16" r="1" fill="currentColor" />
    <circle cx="15" cy="16" r="1" fill="currentColor" />
  </svg>
);

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [page, setPage] = useState<"landing" | "chat">("landing");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentSources, setCurrentSources] = useState<Source[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setStatusMessage("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/chat-stream?message=${encodeURIComponent(input)}`,
      );

      if (!response.ok) throw new Error("Failed to fetch");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = "";
      let sources: Source[] = [];
      let sourceType = "";

      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        type: "ai",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, aiMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.type === "metadata") {
              sourceType = data.source_type;
              const statusText = data.source_type.includes("Web")
                ? "Searching the web..."
                : "Using knowledge base...";
              setStatusMessage(statusText);
            } else if (data.type === "status") {
              setStatusMessage(data.status);
            } else if (data.type === "text") {
              aiResponse += data.content;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: aiResponse, isStreaming: !data.done }
                    : msg,
                ),
              );
              setStatusMessage("");
            } else if (data.type === "sources") {
              sources = data.sources;
              setCurrentSources(sources);
            } else if (data.type === "done") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        sources: sources.length > 0 ? sources : undefined,
                        sourceType: data.source_type || sourceType,
                        isStreaming: false,
                      }
                    : msg,
                ),
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "ai",
        content:
          "Error connecting to AI. Please make sure the backend is running and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // ─── Landing Page ──────────────────────────────────────────────────────────
  if (page === "landing") {
    return (
      <div className="landing-container">
        <div className="background-animation">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>

        <header className="landing-header">
          <div className="logo">
            <span className="logo-icon">
              <BotIcon />
            </span>
            <span className="logo-text">AI Assistant</span>
          </div>
        </header>

        <main className="landing-main">
          <div className="hero-content">
            <h1 className="hero-title">
              Chat with AI That{" "}
              <span className="gradient-text">Thinks Like Humans</span>
            </h1>

            <p className="hero-subtitle">
              I have my own knowledge base like Claude and Gemini. I answer from
              what I know first, and only search the web when I need the latest
              information. Fast, accurate, reliable.
            </p>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <KnowledgeIcon />
                </div>
                <h3>Smart Knowledge Base</h3>
                <p>50+ topics of built-in expertise</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="28"
                    height="28"
                  >
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <h3>Instant Answers</h3>
                <p>Responds from memory first</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <WebSearchIcon />
                </div>
                <h3>Web When Needed</h3>
                <p>Searches only for latest info</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <LinkIcon />
                </div>
                <h3>Source Attribution</h3>
                <p>Always shows where info comes from</p>
              </div>
            </div>

            <button className="cta-button" onClick={() => setPage("chat")}>
              Start Chatting Now
              <span className="button-arrow">→</span>
            </button>
          </div>

          <div className="hero-graphic">
            <div className="chat-preview">
              <div className="chat-bubble user-bubble">
                What is photosynthesis?
              </div>
              <div className="chat-bubble ai-bubble">
                I know this! Let me explain...
              </div>
              <div className="chat-bubble user-bubble">Latest AI news 2026</div>
              <div className="chat-bubble ai-bubble">
                Let me search the web for you...
              </div>
            </div>
          </div>
        </main>

        <footer className="landing-footer">
          <p>Created by Joshua Macapagal & Ady</p>
        </footer>
      </div>
    );
  }

  // ─── Chat Page ─────────────────────────────────────────────────────────────
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
            <div className="empty-icon">
              <BotIcon />
            </div>
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
                {message.isStreaming && (
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
                  <LoadingIcon />
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
            {loading ? <LoadingIcon /> : <SendIcon />}
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
