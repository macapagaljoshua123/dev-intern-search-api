import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  sources?: { title: string; url: string; snippet: string }[];
  confidence?: number;
  fromWebSearch?: boolean;
  timestamp: Date;
  images?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("chat_sessions");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        messages: s.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      }));
    }
    return [
      {
        id: "default",
        title: "New Chat",
        messages: [
          {
            id: "welcome",
            text: "Hello! 👋 I'm your AI assistant. I have knowledge about many topics, and if I don't know something, I'll search the web for you. How can I help you today?",
            isUser: false,
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
      },
    ];
  });

  const [currentSessionId, setCurrentSessionId] = useState(
    sessions[0]?.id || "",
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const API_URL = "http://127.0.0.1:8000";

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    localStorage.setItem("chat_sessions", JSON.stringify(sessions));
  }, [sessions]);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [
        {
          id: "welcome",
          text: "Hello! 👋 I'm your AI assistant. I have knowledge about many topics, and if I don't know something, I'll search the web for you. How can I help you today?",
          isUser: false,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteChat = (sessionId: string) => {
    const newSessions = sessions.filter((s) => s.id !== sessionId);
    setSessions(newSessions);
    if (sessionId === currentSessionId && newSessions.length > 0) {
      setCurrentSessionId(newSessions[0].id);
    }
  };

  const updateSessionTitle = (sessionId: string, firstMessage: string) => {
    const title =
      firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "");
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title } : s)),
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: string[] = [];
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              newImages.push(event.target.result as string);
              setUploadedImages((prev) => [
                ...prev,
                event.target!.result as string,
              ]);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && uploadedImages.length === 0) return;

    let messageText = input;
    if (uploadedImages.length > 0) {
      messageText += `\n\n[Uploaded ${uploadedImages.length} image(s)]`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
      images: uploadedImages,
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, userMessage] };
        }
        return s;
      }),
    );

    const question = input;
    setInput("");
    setUploadedImages([]);
    setLoading(true);

    const isFirstMessage = currentSession?.messages.length === 1;
    if (isFirstMessage && question) {
      updateSessionTitle(currentSessionId, question);
    }

    try {
      const res = await axios.get(`${API_URL}/chat`, {
        params: { message: question || "What's in this image?" },
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: res.data.answer,
        isUser: false,
        sources: res.data.sources,
        confidence: res.data.confidence,
        fromWebSearch: res.data.from_web_search,
        timestamp: new Date(),
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            return { ...s, messages: [...s.messages, aiMessage] };
          }
          return s;
        }),
      );
    } catch (err) {
      console.error(err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting. Please make sure the backend is running.",
        isUser: false,
        timestamp: new Date(),
      };
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            return { ...s, messages: [...s.messages, errorMessage] };
          }
          return s;
        }),
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={createNewChat}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="chat-history">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`chat-item ${session.id === currentSessionId ? "active" : ""}`}
            >
              <div
                className="chat-item-content"
                onClick={() => setCurrentSessionId(session.id)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{session.title}</span>
              </div>
              <button
                className="delete-chat-btn"
                onClick={() => deleteChat(session.id)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="ai-status">
            <span className="status-dot"></span>
            <span>AI Ready</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="main-chat">
        {/* Messages */}
        <div className="messages-container">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.isUser ? "user" : "assistant"}`}
            >
              <div className="message-avatar">
                {msg.isUser ? (
                  <div className="user-avatar">👤</div>
                ) : (
                  <div className="ai-avatar">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="1.5"
                    >
                      <path d="M12 2a10 10 0 1 0 10 10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-author">
                    {msg.isUser ? "You" : "AI Assistant"}
                  </span>
                  <span className="message-time">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-text">
                  {msg.images &&
                    msg.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Uploaded"
                        className="uploaded-image"
                      />
                    ))}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: msg.text.replace(/\n/g, "<br/>"),
                    }}
                  />
                </div>

                {msg.fromWebSearch && !msg.isUser && (
                  <div className="web-badge">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Searched the web
                  </div>
                )}

                {msg.confidence && !msg.isUser && (
                  <div className="confidence-container">
                    <span className="confidence-label">Confidence</span>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${msg.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="confidence-value">
                      {Math.round(msg.confidence * 100)}%
                    </span>
                  </div>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="sources">
                    <div className="sources-title">📚 Sources</div>
                    <div className="sources-list">
                      {msg.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-link"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          {src.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="message-avatar">
                <div className="ai-avatar">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                  >
                    <path d="M12 2a10 10 0 1 0 10 10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="typing-text">AI is thinking...</div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-area">
          <div className="input-container">
            {uploadedImages.length > 0 && (
              <div className="image-preview">
                {uploadedImages.map((img, idx) => (
                  <div key={idx} className="preview-image">
                    <img src={img} alt="Preview" />
                    <button
                      onClick={() =>
                        setUploadedImages((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                className="message-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                rows={1}
                disabled={loading}
              />
              <div className="input-buttons">
                <label className="attach-btn">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                  />
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="20"
                      height="20"
                      rx="2.18"
                      ry="2.18"
                    />
                    <line x1="8" y1="2" x2="8" y2="22" />
                    <line x1="16" y1="2" x2="16" y2="22" />
                    <line x1="2" y1="8" x2="22" y2="8" />
                    <line x1="2" y1="16" x2="22" y2="16" />
                  </svg>
                </label>
                <button
                  className="send-btn"
                  onClick={sendMessage}
                  disabled={
                    loading || (!input.trim() && uploadedImages.length === 0)
                  }
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
