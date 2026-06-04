import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sun, Moon, Sparkles, Globe, Paperclip, Mic, Send } from 'lucide-react';
import './AIChat.css';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    answer?: string;
    sources?: Array<{ title: string; url: string; snippet?: string }>;
}

const AIChat: React.FC = () => {
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (localStorage.getItem('appTheme') as 'dark' | 'light') || 'dark';
    });
    const [sessions, setSessions] = useState<{id: string, title: string, messages: Message[]}[]>(() => {
        const saved = localStorage.getItem('chatSessions');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [];
    });
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem('appTheme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
        
        // Save session to history whenever messages change
        if (messages.length > 0) {
            let sessionId = currentSessionId;
            let newSessions = [...sessions];
            
            if (!sessionId) {
                sessionId = Date.now().toString();
                setCurrentSessionId(sessionId);
                const title = messages[0].text.substring(0, 30) + (messages[0].text.length > 30 ? '...' : '');
                newSessions.unshift({ id: sessionId, title, messages });
            } else {
                const sessionIndex = newSessions.findIndex(s => s.id === sessionId);
                if (sessionIndex !== -1) {
                    newSessions[sessionIndex].messages = messages;
                }
            }
            setSessions(newSessions);
            localStorage.setItem('chatSessions', JSON.stringify(newSessions));
        }
    }, [messages]);

    const loadSession = (id: string) => {
        const session = sessions.find(s => s.id === id);
        if (session) {
            setCurrentSessionId(session.id);
            setMessages(session.messages);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
    };

    const sendMessage = async (overrideText?: string) => {
        const textToSend = overrideText || inputValue;
        if (!textToSend.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: textToSend,
            isUser: true,
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:8000/chat', {
                message: textToSend
            });

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: textToSend,
                isUser: false,
                answer: response.data.answer,
                sources: response.data.sources,
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Error',
                isUser: false,
                answer: '## Sorry, something went wrong.\n\nPlease make sure the backend server is running on port 8000.\n\n**Check:**\n• Backend is running with `uvicorn app:app --reload`\n• Gemini API key is set in `.env` file',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderAnswer = (message: Message) => {
        if (!message.answer) return <p>{message.text}</p>;
        
        // Preprocess to replace literal bullet points with markdown list markers
        // This ensures old chat history also renders correctly
        const processedAnswer = message.answer.replace(/• /g, '\n- ');
        
        return (
            <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {processedAnswer}
                </ReactMarkdown>
            </div>
        );
    };

    return (
        <div className="app-container" data-theme={theme}>
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="logo-icon"><Sparkles size={20} /></span>
                            <span className="logo-text">AI Assistant</span>
                            <span className="badge">Web Search</span>
                        </div>
                        <button 
                            onClick={toggleTheme} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                    <button className="new-chat-btn" onClick={handleNewChat}>
                        + New Chat
                    </button>
                </div>
                <div className="sidebar-history">
                    <div className="history-section">HISTORY</div>
                    {sessions.map(session => (
                        <div 
                            key={session.id} 
                            className="history-item" 
                            onClick={() => loadSession(session.id)}
                            style={{ 
                                color: currentSessionId === session.id ? 'var(--text-main)' : 'var(--text-muted)',
                                fontWeight: currentSessionId === session.id ? '600' : 'normal'
                            }}
                        >
                            {session.title}
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <div className="history-item" style={{ fontStyle: 'italic', opacity: 0.5 }}>
                            No past chats
                        </div>
                    )}
                </div>
            </aside>

            <main className="main-content">
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <div className="main-logo">
                            <Sparkles size={48} />
                        </div>
                        <h1>What can I help you with?</h1>
                        <p className="subtitle">Ask anything — I'll search the web and give you accurate answers.</p>
                        
                        <div className="suggestions-grid">
                            <button className="suggestion-btn" onClick={() => sendMessage("Latest AI news")}>
                                <span className="icon"><Globe size={16} /></span> Latest AI news
                            </button>
                            <button className="suggestion-btn" onClick={() => sendMessage("Explain React")}>
                                <span className="icon"><Sparkles size={16} /></span> Explain React
                            </button>
                            <button className="suggestion-btn" onClick={() => sendMessage("Python basics")}>
                                <span className="icon"><Globe size={16} /></span> Python basics
                            </button>
                            <button className="suggestion-btn" onClick={() => sendMessage("Market trends")}>
                                <span className="icon"><Globe size={16} /></span> Market trends
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="messages-area">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message ${msg.isUser ? 'user' : 'ai'}`}>
                                <div className="message-content">
                                    {msg.isUser ? msg.text : renderAnswer(msg)}
                                </div>
                                {msg.sources && msg.sources.length > 0 && !msg.isUser && (
                                    <div className="sources">
                                        <strong>📚 Sources:</strong>
                                        {msg.sources.map((src, idx) => (
                                            <a key={idx} href={src.url} target="_blank" rel="noopener noreferrer" className="source-link">
                                                {src.title || src.url}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message ai">
                                <div className="message-content">Searching the web and thinking...</div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                <div className="input-container-wrapper">
                    <div className="input-box">
                        <input 
                            type="text" 
                            placeholder="Ask me anything..." 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            disabled={isLoading}
                        />
                        <div className="input-actions">
                            <div className="left-actions">
                                <button className="action-btn" onClick={() => sendMessage()}>
                                    <span className="icon"><Globe size={16} /></span> Search
                                </button>
                                <button className="action-btn">
                                    <span className="icon"><Paperclip size={16} /></span> Attach
                                </button>
                                <button className="action-btn">
                                    <span className="icon"><Mic size={16} /></span> Voice
                                </button>
                            </div>
                            <div className="right-actions">
                                <button className="icon-btn send" onClick={() => sendMessage()} disabled={isLoading || !inputValue.trim()}>
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="input-footer">
                        Press <kbd>Enter</kbd> to send - <kbd>Shift</kbd>+<kbd>Enter</kbd> for new line
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AIChat;