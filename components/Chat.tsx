import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import { GoogleGenAI, Chat as GenAIChat, GroundingChunk } from '@google/genai';
import { Spinner } from './common/Spinner';
import { useGeolocation } from '../hooks/useGeolocation';

type ChatMode = 'Flash' | 'Pro' | 'Lite' | 'Search' | 'Maps';

const BlinkingCursor = () => <span className="inline-block w-2 h-5 bg-text-primary animate-pulse ml-1"></span>;

export const Chat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streamingResponse, setStreamingResponse] = useState('');
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatInstance, setChatInstance] = useState<GenAIChat | null>(null);
    const [mode, setMode] = useState<ChatMode>('Flash');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { latitude, longitude } = useGeolocation();
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingResponse]);

    const initializeChat = useCallback((currentMode: ChatMode) => {
        setIsLoading(true);
        const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY as string });
        let model: string;
        switch (currentMode) {
            case 'Pro': model = 'gemini-2.5-pro'; break;
            case 'Lite': model = 'gemini-flash-lite-latest'; break;
            default: model = 'gemini-2.5-flash';
        }
        
        const newChat = ai.chats.create({ model });
        setChatInstance(newChat);
        setIsLoading(false);
    }, []);


    useEffect(() => {
        if(mode !== 'Search' && mode !== 'Maps') {
          initializeChat(mode);
        }
        setMessages([]);
    }, [mode, initializeChat]);


    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages((prev) => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            if (mode === 'Search' || mode === 'Maps') {
                 const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY as string });
                const tools = [];
                if (mode === 'Search') tools.push({ googleSearch: {} });
                if (mode === 'Maps') tools.push({ googleMaps: {} });

                const toolConfig = mode === 'Maps' && latitude && longitude ? {
                    retrievalConfig: { latLng: { latitude, longitude } }
                } : undefined;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: currentInput,
                    config: { tools, toolConfig },
                });
                const modelMessage: ChatMessage = { role: 'model', text: response.text, sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks };
                setMessages((prev) => [...prev, modelMessage]);

            } else { // Streaming modes
                 if (!chatInstance) throw new Error("Chat not initialized");

                const stream = await chatInstance.sendMessageStream({ message: currentInput });
                let text = '';
                for await (const chunk of stream) {
                    text += chunk.text;
                    setStreamingResponse(text);
                }
                const modelMessage: ChatMessage = { role: 'model', text };
                setMessages((prev) => [...prev, modelMessage]);
            }
        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = { role: 'model', text: 'Sorry, something went wrong.' };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setStreamingResponse('');
        }
    };

    return (
        <div className="flex flex-col h-full p-4 md:p-6 bg-background">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h1 className="text-2xl font-bold">Chat</h1>
                <div className="flex space-x-1 p-1 bg-surface rounded-lg">
                    {(['Flash', 'Pro', 'Lite', 'Search', 'Maps'] as ChatMode[]).map((m) => (
                        <button key={m} onClick={() => setMode(m)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${mode === m ? 'bg-primary text-white shadow' : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'}`}>
                            {m}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 ${msg.role === 'user' ? 'bg-primary' : 'bg-secondary'}`}></div>
                        <div className={`p-4 rounded-lg max-w-2xl shadow-md ${msg.role === 'user' ? 'bg-primary rounded-br-none' : 'bg-surface rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-surface-light">
                                    <h4 className="text-xs font-semibold mb-2">Sources:</h4>
                                    <ul className="space-y-1.5">
                                        {msg.sources.map((source, i) => (
                                            <li key={i}>
                                                <a href={source.web?.uri || source.maps?.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary hover:underline">
                                                    {source.web?.title || source.maps?.title || 'Source'}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {streamingResponse && (
                     <div className="flex gap-3 flex-row">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-secondary"></div>
                        <div className="p-4 rounded-lg max-w-2xl shadow-md bg-surface rounded-bl-none">
                            <p className="whitespace-pre-wrap">{streamingResponse}<BlinkingCursor/></p>
                        </div>
                    </div>
                )}
                 {isLoading && !streamingResponse && (
                    <div className="flex gap-3 flex-row">
                         <div className="w-8 h-8 rounded-full flex-shrink-0 bg-secondary"></div>
                         <div className="p-4 rounded-lg bg-surface rounded-bl-none shadow-md"><Spinner /></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="mt-6 flex-shrink-0">
                <form onSubmit={sendMessage} className="flex items-center bg-surface rounded-xl p-2 shadow-lg focus-within:ring-2 focus-within:ring-primary transition-shadow">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me anything..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-text-primary placeholder-text-secondary px-2"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="p-2 rounded-full bg-primary disabled:bg-surface-light disabled:text-text-secondary hover:bg-primary-hover transition-colors text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
            </div>
        </div>
    );
};