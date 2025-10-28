import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI, Chat as GenAIChat } from '@google/genai';
import { ChatMessage } from '../types';

const SYSTEM_INSTRUCTION = `You are an expert web developer. Your task is to generate and iteratively update a complete, single-file HTML document based on the user's requests. The user will provide an initial description and then may ask for changes. With each new prompt from the user, you must output the complete, updated HTML code for the website. The HTML file must be self-contained, with all CSS and JavaScript included within <style> and <script> tags respectively. Use Tailwind CSS from a CDN for styling. Your response should ONLY be the raw HTML code inside a single markdown block. Do not include any other text, explanations, or apologies.`;

const TypingIndicator = () => (
    <div className="flex items-center space-x-1.5">
        <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse"></div>
    </div>
);


export const WebsiteCreator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInstance, setChatInstance] = useState<GenAIChat | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
    const [isCopied, setIsCopied] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const newChat = ai.chats.create({
            model: 'gemini-2.5-pro',
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                thinkingConfig: { thinkingBudget: 32768 },
            },
        });
        setChatInstance(newChat);
        setMessages([
            { role: 'model', text: "Hello! Describe the website you want me to create. I'll generate the code and a live preview for you." }
        ]);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading || !chatInstance) return;

        const userMessage: ChatMessage = { role: 'user', text: prompt };
        setMessages(prev => [...prev, userMessage]);
        setPrompt('');
        setIsLoading(true);
        setError(null);

        try {
            const result = await chatInstance.sendMessage({ message: prompt });
            const rawCode = result.text;
            const cleanedCode = rawCode.replace(/^```(html)?\n|```$/g, '').trim();
            
            const modelMessage: ChatMessage = { role: 'model', text: cleanedCode };
            setMessages(prev => [...prev, modelMessage]);

        } catch (err) {
            setError('Failed to generate website code. Please try again.');
            console.error(err);
             const errorMessage: ChatMessage = { role: 'model', text: 'Sorry, something went wrong.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const latestCode = useMemo(() => {
        const lastModelMessage = [...messages].reverse().find(m => m.role === 'model' && m.text.trim().startsWith('<!DOCTYPE html>'));
        return lastModelMessage ? lastModelMessage.text : '';
    }, [messages]);

    const processedCode = useMemo(() => {
        if (!latestCode) {
             return '<div style="display:flex;justify-content:center;align-items:center;height:100%;font-family:sans-serif;color:#94a3b8;">Your website preview will appear here.</div>';
        }
        let code = latestCode;
        const tailwindScript = '<script src="https://cdn.tailwindcss.com"></script>';
        if (!code.includes('cdn.tailwindcss.com')) {
            code = code.includes('</head>')
                ? code.replace('</head>', `  ${tailwindScript}\n</head>`)
                : `<!DOCTYPE html>\n<html>\n<head>${tailwindScript}</head>\n<body>${code}</body></html>`;
        }
        return code;
    }, [latestCode]);
    
    const copyToClipboard = () => {
        if(latestCode) {
            navigator.clipboard.writeText(latestCode);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="p-4 md:p-6 flex flex-col h-full">
            <header className="flex justify-between items-center mb-4 flex-shrink-0">
                <h1 className="text-2xl font-bold">Website Creator</h1>
                 <button 
                    onClick={copyToClipboard} 
                    className="text-sm px-4 py-2 bg-surface rounded-lg hover:bg-surface-light disabled:bg-surface-light/50 disabled:cursor-not-allowed transition-colors"
                    disabled={!latestCode}
                >
                    {isCopied ? 'Copied!' : 'Copy Code'}
                </button>
            </header>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                {/* Chat Panel */}
                <div className="flex flex-col h-full min-h-0 bg-surface rounded-lg">
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                         {messages.map((msg, index) => (
                             <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 ${msg.role === 'user' ? 'bg-primary' : 'bg-secondary'}`}></div>
                                <div className={`p-3 rounded-lg max-w-full break-words shadow ${msg.role === 'user' ? 'bg-primary rounded-br-none' : 'bg-surface-light rounded-bl-none'}`}>
                                    {msg.role === 'model' && msg.text.trim().startsWith('<!DOCTYPE html>') ? (
                                        <p className="text-sm italic text-text-secondary">Code updated. Check the Preview and Code tabs.</p>
                                    ) : (
                                         <p className="whitespace-pre-wrap">{msg.text}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 flex-row">
                                <div className="w-8 h-8 rounded-full flex-shrink-0 bg-secondary"></div>
                                <div className="p-3 rounded-lg bg-surface-light flex items-center shadow">
                                    <TypingIndicator />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                     <div className="p-2 flex-shrink-0 border-t border-surface-light">
                        <form onSubmit={sendMessage} className="flex items-center bg-surface-light rounded-lg p-1">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe your website or the changes..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-text-primary placeholder-text-secondary px-2"
                                disabled={isLoading}
                            />
                            <button type="submit" disabled={isLoading || !prompt.trim()} className="p-2 rounded-lg bg-primary disabled:bg-surface disabled:text-text-secondary hover:bg-primary-hover transition-colors text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                        </form>
                     </div>
                </div>
                
                {/* Preview/Code Panel */}
                <div className="flex flex-col h-full min-h-0 bg-surface rounded-lg">
                    <div className="flex border-b border-surface-light flex-shrink-0 px-2">
                        <button onClick={() => setActiveTab('preview')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'preview' ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>Preview</button>
                        <button onClick={() => setActiveTab('code')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'code' ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>Code</button>
                    </div>
                    <div className="flex-1 overflow-auto bg-background">
                        {activeTab === 'preview' ? (
                            <iframe
                                srcDoc={processedCode}
                                title="Website Preview"
                                className="w-full h-full bg-white border-none rounded-b-lg"
                                sandbox="allow-scripts allow-same-origin"
                            />
                        ) : (
                            <pre className="p-4 text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto h-full font-mono">
                                <code>{latestCode || "No code generated yet."}</code>
                            </pre>
                        )}
                    </div>
                </div>
            </div>
            {error && <p className="mt-4 text-center text-red-500 flex-shrink-0">{error}</p>}
        </div>
    );
};