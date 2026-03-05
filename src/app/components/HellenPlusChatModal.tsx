import { useState, useRef, useEffect } from 'react';
import { X, Send, User, Clock, BookOpen, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import hellenLogo from '@/assets/a1c07c8833c1385f9acba9acb24b2ea7df9be827.png';
import { useSound } from '@/utils/sounds';
import ReactMarkdown from "react-markdown";

interface HellenPlusChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    moduleName: string;
    submoduleNames: string[];
}

interface ChatSource {
    submodule: string;
    timestamp: string;
    snippet?: string;
}

interface ChatMessage {
    text: string;
    sender: 'bot' | 'user';
    sources?: ChatSource[];
    isLoading?: boolean;
    isStreaming?: boolean;
}

interface HistoryEntry {
    role: 'user' | 'assistant';
    content: string;
}

// Quick-action suggestion chips shown in the welcome state
const QUICK_ACTIONS = [
    { label: '📖 Explain this module', message: 'Explain this module in simple terms' },
    { label: '🎯 Key takeaways', message: 'Give me the key takeaways' },
    { label: '🧪 Quiz me', message: 'Quiz me on this topic' },
    { label: '💡 Real-world example', message: 'Give a real world example' },
];

export function HellenPlusChatModal({ isOpen, onClose, moduleName, submoduleNames }: HellenPlusChatModalProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [expandedSnippets, setExpandedSnippets] = useState<Set<string>>(new Set());
    const chatHistoryRef = useRef<HistoryEntry[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { playTyping, playClick } = useSound();
    const API_BASE = import.meta.env.VITE_API_URL;

    const welcomeMessage: ChatMessage = {
        text: `Hi! I'm Hellen+, your AI tutor for **${moduleName}**. I can explain concepts, give key takeaways, quiz you, or answer any question — all based on the video transcripts! 💡`,
        sender: 'bot'
    };

    useEffect(() => {
        if (isOpen && moduleName) {
            setMessages([welcomeMessage]);
            setInput('');
            setIsTyping(false);
            setExpandedSnippets(new Set());
            chatHistoryRef.current = [];
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, moduleName]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const toggleSnippet = (key: string) => {
        setExpandedSnippets(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    /** Core send logic — uses streaming endpoint */
    const sendMessage = async (userMessage: string) => {
        if (!userMessage.trim() || isTyping) return;

        setInput('');
        playTyping();

        // Add user message
        setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);

        // Add a streaming placeholder for bot
        setIsTyping(true);
        setMessages(prev => [...prev, { text: '', sender: 'bot', isLoading: true, isStreaming: true }]);

        const history = chatHistoryRef.current.slice(-6);

        let accumulatedText = '';
        let finalSources: ChatSource[] = [];

        try {
            const response = await fetch(`${API_BASE}/hellen-chat-stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    module_name: moduleName,
                    submodule_names: submoduleNames,
                    message: userMessage,
                    history
                })
            });

            if (!response.ok || !response.body) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            // Switch loading → streaming on first chunk
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.isLoading) {
                    updated[updated.length - 1] = { ...last, isLoading: false, isStreaming: true };
                }
                return updated;
            });

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';  // keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (!payload) continue;

                    try {
                        const event = JSON.parse(payload);

                        if (event.type === 'sources') {
                            finalSources = event.sources || [];

                        } else if (event.type === 'token') {
                            accumulatedText += event.content;
                            const snapshot = accumulatedText;
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last?.sender === 'bot') {
                                    updated[updated.length - 1] = { ...last, text: snapshot, isLoading: false };
                                }
                                return updated;
                            });

                        } else if (event.type === 'done') {
                            // Finalize
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last?.sender === 'bot') {
                                    updated[updated.length - 1] = {
                                        ...last,
                                        text: accumulatedText,
                                        sources: finalSources,
                                        isStreaming: false,
                                        isLoading: false
                                    };
                                }
                                return updated;
                            });

                        } else if (event.type === 'no_content') {
                            accumulatedText = 'This topic is not covered in this module.';
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last?.sender === 'bot') {
                                    updated[updated.length - 1] = {
                                        ...last, text: accumulatedText,
                                        isStreaming: false, isLoading: false, sources: []
                                    };
                                }
                                return updated;
                            });

                        } else if (event.type === 'error') {
                            accumulatedText = `Sorry, an error occurred: ${event.detail}`;
                            setMessages(prev => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last?.sender === 'bot') {
                                    updated[updated.length - 1] = {
                                        ...last, text: accumulatedText,
                                        isStreaming: false, isLoading: false
                                    };
                                }
                                return updated;
                            });
                        }
                    } catch { /* ignore malformed SSE lines */ }
                }
            }

        } catch (error) {
            console.error('Hellen+ stream error:', error);
            const errText = 'Sorry, I encountered an error. Please try again.';
            setMessages(prev => {
                const updated = prev.filter(m => !m.isLoading);
                return [...updated, { text: errText, sender: 'bot' as const }];
            });
        } finally {
            setIsTyping(false);
            if (accumulatedText) {
                chatHistoryRef.current.push({ role: 'user', content: userMessage });
                chatHistoryRef.current.push({ role: 'assistant', content: accumulatedText });
            }
        }
    };

    const handleSendMessage = () => sendMessage(input.trim());

    const formatMessageText = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, li) => {
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
                <span key={li}>
                    {parts.map((part, pi) =>
                        part.startsWith('**') && part.endsWith('**')
                            ? <strong key={pi}>{part.slice(2, -2)}</strong>
                            : <span key={pi}>{part}</span>
                    )}
                    {li < lines.length - 1 && <br />}
                </span>
            );
        });
    };

    if (!isOpen) return null;

    const showQuickActions = messages.length <= 1;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[700px] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-[#F40009] to-[#DC0012] text-white p-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                Hellen+
                                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-normal">AI Tutor</span>
                            </h3>
                            <p className="text-xs text-white/80 truncate max-w-[250px]">{moduleName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <img src={hellenLogo} alt="Hellen" className="h-7 opacity-90" />
                        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Sub-header: modules covered */}
                <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <BookOpen className="w-3.5 h-3.5 text-[#F40009]" />
                        <span className="font-medium text-gray-700">Covers:</span>
                        <span className="truncate">
                            {submoduleNames.slice(0, 3).join(', ')}
                            {submoduleNames.length > 3 ? ` +${submoduleNames.length - 3} more` : ''}
                        </span>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((message, index) => (
                        <div key={index} className={`flex gap-2 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.sender === 'bot' ? 'bg-[#F40009]' : 'bg-gray-300'}`}>
                                {message.sender === 'bot'
                                    ? <Sparkles className="w-4 h-4 text-white" />
                                    : <User className="w-4 h-4 text-gray-600" />
                                }
                            </div>

                            <div className="max-w-[78%]">
                                {/* Bubble */}
                                <div className={`rounded-2xl px-4 py-2.5 ${message.sender === 'bot' ? 'bg-white text-gray-800 shadow-sm' : 'bg-[#F40009] text-white'}`}>
                                    {message.isLoading ? (
                                        <div className="flex items-center gap-1.5 py-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    ) : (
                                        <p className="text-sm leading-relaxed prose prose-sm max-w-none">
                                            <ReactMarkdown>{message.text}</ReactMarkdown>
                                            {/* Blinking cursor while streaming */}
                                            {message.isStreaming && (
                                                <span className="inline-block w-0.5 h-4 bg-gray-500 ml-0.5 animate-pulse" />
                                            )}
                                        </p>
                                    )}
                                </div>

                                {/* Source attribution */}
                                {message.sources && message.sources.length > 0 && !message.isStreaming && (
                                    <div className="mt-2 ml-1 space-y-1.5">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sources</p>
                                        {message.sources.map((source, sIdx) => {
                                            const snippetKey = `${index}-${sIdx}`;
                                            const isExpanded = expandedSnippets.has(snippetKey);
                                            return (
                                                <div key={sIdx} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                                    <div className="flex items-center gap-2 px-3 py-2">
                                                        <Clock className="w-3 h-3 text-[#F40009]/70 flex-shrink-0" />
                                                        <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{source.submodule}</span>
                                                        <span className="font-mono text-[10px] text-[#F40009] bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">{source.timestamp}</span>
                                                        {source.snippet && (
                                                            <button
                                                                onClick={() => toggleSnippet(snippetKey)}
                                                                className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-1"
                                                                title={isExpanded ? 'Hide excerpt' : 'Show excerpt'}
                                                            >
                                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {source.snippet && isExpanded && (
                                                        <div className="px-3 pb-2.5 border-t border-gray-50">
                                                            <p className="text-[11px] text-gray-500 leading-relaxed italic pt-2">"{source.snippet}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Quick-action chips (shown on welcome state only) */}
                    {showQuickActions && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {QUICK_ACTIONS.map(qa => (
                                <button
                                    key={qa.label}
                                    onClick={() => { playClick(); sendMessage(qa.message); }}
                                    className="text-xs bg-white border border-red-200 text-[#F40009] px-3 py-1.5 rounded-full hover:bg-red-50 transition-all shadow-sm font-medium"
                                >
                                    {qa.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
                    <div className="flex gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                                if (e.key.length === 1 || e.key === 'Backspace') playTyping();
                            }}
                            placeholder="Ask about this module, or try a quick action above..."
                            disabled={isTyping}
                            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-full focus:outline-none focus:border-[#F40009] disabled:bg-gray-50 disabled:cursor-not-allowed text-sm transition-colors"
                        />
                        <button
                            onClick={() => { playClick(); handleSendMessage(); }}
                            disabled={!input.trim() || isTyping}
                            className="w-11 h-11 bg-[#F40009] text-white rounded-full flex items-center justify-center hover:bg-[#DC0012] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex-shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                        Answers based on video transcripts only • Streaming • Follow-up questions supported
                    </p>
                </div>
            </div>
        </div>
    );
}
