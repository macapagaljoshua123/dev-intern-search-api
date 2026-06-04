import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    answer?: string;
    sources?: Array<{ title: string; url: string; snippet?: string }>;
}

const AIChat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Welcome! I can search the web and give you accurate answers with sources. Ask me anything!',
            isUser: false,
            answer: '## Welcome! 👋\n\nI am an AI assistant that can search the web to give you accurate, up-to-date answers.\n\n### What I can do:\n• Answer questions from my knowledge base\n• Search the web for current information\n• Scrape and read websites for detailed answers\n• Provide sources for all information\n\n**Try asking me:**\n• "What is photosynthesis?"\n• "Tell me about the latest AI news"\n• "Explain quantum computing"'
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputValue,
            isUser: true,
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:8000/chat', {
                message: inputValue
            });

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: inputValue,
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
        
        // Convert markdown-like formatting to HTML
        let html = message.answer
            .replace(/## (.*?)(?:\n|$)/g, '<h2>$1</h2>')
            .replace(/### (.*?)(?:\n|$)/g, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^• (.*?)$/gm, '<li>$1</li>')
            .replace(/<li>.*?<\/li>/gs, match => `<ul>${match}</ul>`)
            .replace(/\n/g, '<br/>');
        
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1>🤖 AI Chat Assistant</h1>
                <p>Powered by Gemini AI + Web Search</p>
            </div>

            <div style={styles.messagesArea}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        ...styles.message,
                        ...(msg.isUser ? styles.userMessage : styles.aiMessage)
                    }}>
                        <div style={styles.messageHeader}>
                            {msg.isUser ? 'You' : 'AI Assistant'}
                        </div>
                        <div style={styles.messageContent}>
                            {msg.isUser ? msg.text : renderAnswer(msg)}
                        </div>
                        {msg.sources && msg.sources.length > 0 && !msg.isUser && (
                            <div style={styles.sources}>
                                <strong>📚 Sources:</strong>
                                {msg.sources.map((src, idx) => (
                                    <a key={idx} href={src.url} target="_blank" rel="noopener noreferrer" style={styles.sourceLink}>
                                        {src.title || src.url}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                
                {isLoading && (
                    <div style={styles.loading}>
                        <div style={styles.spinner}></div>
                        <span>Searching the web and thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputArea}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask me anything... I'll search the web for accurate answers!"
                    style={styles.input}
                    disabled={isLoading}
                />
                <button onClick={sendMessage} disabled={isLoading} style={styles.button}>
                    Send
                </button>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '20px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
    },
    header: {
        textAlign: 'center',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#4a90e2',
        color: 'white',
        borderRadius: '10px',
    },
    messagesArea: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        marginBottom: '20px',
    },
    message: {
        marginBottom: '16px',
        padding: '12px 16px',
        borderRadius: '12px',
        maxWidth: '80%',
    },
    userMessage: {
        backgroundColor: '#4a90e2',
        color: 'white',
        marginLeft: 'auto',
    },
    aiMessage: {
        backgroundColor: '#e9ecef',
        color: '#333',
        marginRight: 'auto',
    },
    messageHeader: {
        fontSize: '12px',
        fontWeight: 'bold',
        marginBottom: '8px',
    },
    messageContent: {
        fontSize: '14px',
        lineHeight: '1.5',
    },
    sources: {
        marginTop: '12px',
        paddingTop: '8px',
        borderTop: '1px solid #ddd',
        fontSize: '12px',
    },
    sourceLink: {
        display: 'block',
        color: '#0066cc',
        textDecoration: 'none',
        marginTop: '4px',
        fontSize: '11px',
        wordBreak: 'break-all',
    },
    inputArea: {
        display: 'flex',
        gap: '12px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '10px',
    },
    input: {
        flex: 1,
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '24px',
        fontSize: '14px',
        outline: 'none',
    },
    button: {
        padding: '12px 24px',
        backgroundColor: '#4a90e2',
        color: 'white',
        border: 'none',
        borderRadius: '24px',
        cursor: 'pointer',
        fontSize: '14px',
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#e9ecef',
        borderRadius: '12px',
        marginBottom: '16px',
    },
    spinner: {
        width: '20px',
        height: '20px',
        border: '2px solid #ddd',
        borderTop: '2px solid #4a90e2',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
};

// Add keyframes for spinner (inject into document)
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export default AIChat;