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

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(""); // NEW: Dynamic status
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
      let sourceType = ""; // NEW: Track source type

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
              // NEW: Get source type from metadata
              sourceType = data.source_type;
              const statusText = data.source_type.includes("Web")
                ? "🔍 Searching the web..."
                : "📚 Using knowledge base...";
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
                        sourceType: data.source_type || sourceType, // NEW: Save source type
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
        content: "❌ Error connecting to AI. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // Landing Page
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
            <span className="logo-icon">🤖</span>
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
                <div className="feature-icon">🧠</div>
                <h3>Smart Knowledge Base</h3>
                <p>50+ topics of built-in expertise</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Instant Answers</h3>
                <p>Responds from memory first</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">🌐</div>
                <h3>Web When Needed</h3>
                <p>Searches only for latest info</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">📚</div>
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
                📚 I know this! Let me explain...
              </div>
              <div className="chat-bubble user-bubble">Latest AI news 2026</div>
              <div className="chat-bubble ai-bubble">
                🔍 Let me search the web for you...
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
