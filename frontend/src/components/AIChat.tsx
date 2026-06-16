import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sun, Moon, Sparkles, Globe, Paperclip, Mic, Send, MoreVertical, Trash2, X } from 'lucide-react';
import './AIChat.css';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    answer?: string;
    sources?: Array<{ title: string; url: string; snippet?: string }>;
    displayText?: string;
    isAnimating?: boolean;
}

type LoadingStage = 'idle' | 'searching' | 'scraping' | 'generating';

// Type for timeout/interval (browser environment)
type TimerId = ReturnType<typeof setTimeout> | null;

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
    const [loadingStage, setLoadingStage] = useState<LoadingStage>('idle');
    
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Store the current streaming message for animation
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const streamingIntervalRef = useRef<TimerId>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Helper to get loading text based on stage
    const getLoadingText = () => {
        switch (loadingStage) {
            case 'searching':
                return '🔍 Searching the web...';
            case 'scraping':
                return '📄 Reading content from pages...';
            case 'generating':
                return '✨ Generating your answer...';
            default:
                return '🤔 Thinking...';
        }
    };

    // Get loading icon
    const getLoadingIcon = () => {
        switch (loadingStage) {
            case 'searching':
                return '🌐';
            case 'scraping':
                return '📖';
            case 'generating':
                return '🎨';
            default:
                return '⏳';
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Streaming animation function - reveals text character by character
    const startStreamingAnimation = (messageId: string, fullText: string) => {
        // Clear any existing interval for this message
        if (streamingIntervalRef.current) {
            clearInterval(streamingIntervalRef.current);
            streamingIntervalRef.current = null;
        }

        setStreamingMessageId(messageId);
        
        let currentIndex = 0;
        const chunkSize = 20; // Characters per frame for smooth animation
        
        const animate = () => {
            currentIndex += chunkSize;
            const displayText = fullText.substring(0, currentIndex);
            
            setMessages(prev => prev.map(msg => 
                msg.id === messageId 
                    ? { ...msg, displayText, isAnimating: currentIndex < fullText.length }
                    : msg
            ));
            
            if (currentIndex >= fullText.length) {
                // Animation complete
                if (streamingIntervalRef.current) {
                    clearInterval(streamingIntervalRef.current);
                    streamingIntervalRef.current = null;
                }
                setStreamingMessageId(null);
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId 
                        ? { ...msg, displayText: fullText, isAnimating: false }
                        : msg
                ));
                scrollToBottom();
            } else {
                scrollToBottom();
            }
        };
        
        // Initial display
        setMessages(prev => prev.map(msg => 
            msg.id === messageId 
                ? { ...msg, displayText: fullText.substring(0, chunkSize), isAnimating: true }
                : msg
        ));
        
        streamingIntervalRef.current = setInterval(animate, 50); // Smooth 15ms per frame
    };

    useEffect(() => {
        localStorage.setItem('appTheme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        scrollToBottom();
        if (messages.length > 0) {
            let sessionId = currentSessionId;
            const newSessions = [...sessions];
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

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (streamingIntervalRef.current) {
                clearInterval(streamingIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

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

    const deleteSession = (id: string) => {
        const updated = sessions.filter(s => s.id !== id);
        setSessions(updated);
        localStorage.setItem('chatSessions', JSON.stringify(updated));
        if (currentSessionId === id) {
            setCurrentSessionId(null);
            setMessages([]);
        }
        setShowDeleteModal(null);
        setOpenMenuId(null);
    };

    const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || inputValue;
    if (!textToSend.trim() && attachedFiles.length === 0) return;
    if (isLoading) return;

    // Read file contents if any files are attached
    let fileContents: Array<{ name: string; content: string; type: string }> = [];
    
    if (attachedFiles.length > 0) {
        setLoadingStage('searching');
        
        for (const file of attachedFiles) {
            try {
                const text = await readFileContent(file);
                fileContents.push({
                    name: file.name,
                    content: text,
                    type: file.type
                });
                console.log(`📄 Read file: ${file.name} (${text.length} chars)`);
            } catch (err) {
                console.error(`Failed to read ${file.name}:`, err);
            }
        }
    }

    const fileNote = attachedFiles.length > 0
        ? `\n\n[Attached Files: ${attachedFiles.map(f => f.name).join(', ')}]`
        : '';

    const userMessage: Message = {
        id: Date.now().toString(),
        text: textToSend + fileNote,
        isUser: true,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setAttachedFiles([]);
    setIsLoading(true);
    setLoadingStage('searching');

    const history = updatedMessages.map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.isUser ? m.text : (m.answer || m.text),
    }));

    try {
        const scrapingTimer = setTimeout(() => setLoadingStage('scraping'), 1000);
        const generatingTimer = setTimeout(() => setLoadingStage('generating'), 2500);
        
        // Send message WITH file contents to backend
        const response = await axios.post('http://127.0.0.1:8000/chat', {
            message: textToSend,
            history: history,
            files: fileContents  // ← Send actual file content
        });
        
        clearTimeout(scrapingTimer);
        clearTimeout(generatingTimer);
        
        const fullAnswer = response.data.answer;
        const aiMessageId = (Date.now() + 1).toString();
        
        const aiMessage: Message = {
            id: aiMessageId,
            text: textToSend,
            isUser: false,
            answer: fullAnswer,
            sources: response.data.sources,
            displayText: '',
            isAnimating: true,
        };
        
        setMessages(prev => [...prev, aiMessage]);
        startStreamingAnimation(aiMessageId, fullAnswer);
        
    } catch (error) {
        console.error('Error:', error);
        let errorMessage = '## Sorry, something went wrong.\n\n';
        
        if (axios.isAxiosError(error) && error.response?.status === 400) {
            errorMessage += '**File upload error:** The backend could not process your file.\n\n';
            errorMessage += 'Make sure:\n';
            errorMessage += '• File is a text-based format (.txt, .docx, .pdf, .md)\n';
            errorMessage += '• File size is under 5MB\n';
            errorMessage += '• File content is readable text\n\n';
            errorMessage += 'Try removing the attachment and sending again.';
        } else {
            errorMessage += 'Please make sure the backend server is running on port 8000.\n\n';
            errorMessage += '**Check:**\n';
            errorMessage += '• Backend is running with `uvicorn app:app --reload`\n';
            errorMessage += '• Port 8000 is not blocked';
        }
        
        const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: 'Error',
            isUser: false,
            answer: errorMessage,
            displayText: errorMessage,
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
        setLoadingStage('idle');
    }
};

// Helper function to read file content
const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const content = e.target?.result as string;
            resolve(content);
        };
        
        reader.onerror = (e) => {
            reject(new Error(`Failed to read file: ${file.name}`));
        };
        
        // Read as text for .txt, .md, .json, .csv, .js, .py, .html, .css, .xml
        // For .docx, .pdf you'd need additional libraries
        reader.readAsText(file);
    });
};

    const renderAnswer = (message: Message) => {
        if (!message.answer) return <p>{message.text}</p>;
        const processedAnswer = message.answer.replace(/• /g, '\n- ');
        // Use displayText if available (for animation), otherwise full answer
        const textToRender = message.displayText || processedAnswer;
        
        return (
            <div className={`markdown-body ${message.isAnimating ? 'streaming-text' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {textToRender}
                </ReactMarkdown>
                {message.isAnimating && (
                    <span className="typing-cursor">|</span>
                )}
            </div>
        );
    };

    return (
        <>
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <h3>Delete this chat?</h3>
                        <p>This cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="modal-cancel" onClick={() => setShowDeleteModal(null)}>Cancel</button>
                            <button className="modal-delete" onClick={() => deleteSession(showDeleteModal)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

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
                            <div key={session.id} className="history-item-wrapper">
                                <div
                                    className="history-item"
                                    onClick={() => loadSession(session.id)}
                                    style={{
                                        color: currentSessionId === session.id ? 'var(--text-main)' : 'var(--text-muted)',
                                        fontWeight: currentSessionId === session.id ? '600' : 'normal'
                                    }}
                                >
                                    {session.title}
                                </div>
                                <button
                                    className="history-menu-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(openMenuId === session.id ? null : session.id);
                                    }}
                                    title="Options"
                                >
                                    <MoreVertical size={14} />
                                </button>
                                {openMenuId === session.id && (
                                    <div className="history-dropdown">
                                        <button onClick={() => setShowDeleteModal(session.id)}>
                                            <Trash2 size={13} /> Delete
                                        </button>
                                    </div>
                                )}
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
                                    {msg.sources && msg.sources.length > 0 && !msg.isUser && !msg.isAnimating && (
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
                                    <div className="message-content loading-message">
                                        <div className="loading-animation">
                                            <span className="loading-icon">{getLoadingIcon()}</span>
                                            <span className="loading-text">{getLoadingText()}</span>
                                            <div className="loading-dots">
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}

                    <div className="input-container-wrapper">
                        <div className="input-box">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    setAttachedFiles(prev => [...prev, ...files]);
                                    e.target.value = '';
                                }}
                            />

                            {attachedFiles.length > 0 && (
                                <div className="file-preview-bar">
                                    {attachedFiles.map((f, i) => (
                                        <div key={i} className="file-chip">
                                            <Paperclip size={12} />
                                            <span>{f.name}</span>
                                            <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

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
                                    <button className="action-btn" onClick={() => fileInputRef.current?.click()}>
                                        <span className="icon"><Paperclip size={16} /></span> Attach
                                    </button>
                                    <button className="action-btn">
                                        <span className="icon"><Mic size={16} /></span> Voice
                                    </button>
                                </div>
                                <div className="right-actions">
                                    <button className="icon-btn send" onClick={() => sendMessage()} disabled={isLoading || (!inputValue.trim() && attachedFiles.length === 0)}>
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
        </>
    );
};

export default AIChat;