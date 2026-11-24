'use client';

import { useEffect, useRef, useState } from 'react';
import api from '../api/api';

export default function Chat({ docId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }, [messages, isLoading]);

    const send = async () => {
        const query = input.trim();
        if (!query || !docId || isLoading) return;

        setMessages((prev) => [...prev, { role: 'user', content: query }]);
        setInput('');
        setIsLoading(true);

        try {
            const { data } = await api.post('/chat', { query, docId });
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: data.answer, sources: data.sources },
            ]);
        } catch (e) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content:
                        e?.response?.data?.error ||
                        'Something went wrong while generating the answer.',
                    isError: true,
                },
            ]);
        } finally {
            setIsLoading(false);
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    const placeholder = !docId
        ? 'Upload a document to start chatting…'
        : 'Ask a question about your document…';

    return (
        <div className="flex flex-col h-full bg-gray-950">
            {/* Message history */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                                className="text-gray-400">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-400 text-sm">
                            {docId
                                ? 'Ask anything about your uploaded document.'
                                : 'No document uploaded yet.'}
                        </p>
                    </div>
                )}

                {messages.map((m, i) => (
                    <MessageBubble key={i} message={m} />
                ))}

                {isLoading && <TypingIndicator />}
            </div>

            {/* Input bar */}
            <div className="flex-shrink-0 border-t border-gray-800 bg-gray-950 px-6 py-4">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={!docId || isLoading}
                        rows={1}
                        style={{ minHeight: '44px' }}
                        className="flex-1 resize-none bg-gray-900 border border-gray-700 rounded-lg
                                   px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500
                                   focus:outline-none focus:border-blue-500
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   max-h-40"
                    />
                    <button
                        onClick={send}
                        disabled={!docId || isLoading || !input.trim()}
                        className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500
                                   disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
                                   text-sm font-medium text-white transition flex items-center gap-1.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                        Send
                    </button>
                </div>
                <p className="mt-2 text-[11px] text-gray-600">
                    Press <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400">Enter</kbd> to send,
                    <kbd className="ml-1 px-1 py-0.5 rounded bg-gray-800 text-gray-400">Shift+Enter</kbd> for newline.
                </p>
            </div>
        </div>
    );
}

function MessageBubble({ message }) {
    if (message.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-blue-600
                                px-4 py-2.5 text-sm text-white whitespace-pre-wrap break-words">
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-start">
            <div className={`max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5
                             text-sm whitespace-pre-wrap break-words
                ${message.isError
                    ? 'bg-red-900/30 border border-red-800 text-red-200'
                    : 'bg-gray-800 text-gray-100'}`}>
                {message.content}
                {message.sources?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700/60 text-[11px] text-gray-400">
                        Retrieved {message.sources.length} source chunk(s)
                    </div>
                )}
            </div>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                {[0, 150, 300].map((delay) => (
                    <span
                        key={delay}
                        className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}