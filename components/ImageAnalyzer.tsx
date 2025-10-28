import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Spinner } from './common/Spinner';
import { FileUpload } from './common/FileUpload';
import { fileToBase64 } from '../utils/fileUtils';

export const ImageAnalyzer: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState<{ file: File, url: string, base64: string, mimeType: string } | null>(null);
    const [response, setResponse] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file.');
            return;
        }
        const url = URL.createObjectURL(file);
        const base64 = await fileToBase64(file);
        setImage({ file, url, base64, mimeType: file.type });
        setResponse(null);
        setError(null);
    };

    const analyzeImage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || !image || isLoading) return;

        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY as string });
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { data: image.base64, mimeType: image.mimeType } },
                        { text: prompt },
                    ],
                },
            });
            setResponse(result.text);
        } catch (err) {
            setError('Failed to analyze image. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full">
             <header className="p-4 md:p-6 border-b border-surface-light flex-shrink-0">
                <h1 className="text-2xl font-bold">Image Analyzer</h1>
                <p className="text-text-secondary text-sm mt-1">Upload an image and ask Gemini anything about it.</p>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                    {!image && <FileUpload onFileUpload={handleFileChange} accept="image/*" title="Drop image to analyze, or" />}
                    
                    {image && (
                        <div className="space-y-6">
                            <div className="text-center bg-surface p-4 rounded-lg">
                                <img src={image.url} alt="To be analyzed" className="rounded-lg max-h-[40vh] mx-auto mb-4" />
                            </div>
                            <form onSubmit={analyzeImage} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="What do you want to know about the image?"
                                    className="flex-1 p-3 bg-surface rounded-lg border border-surface-light focus:ring-primary focus:border-primary"
                                    disabled={isLoading}
                                />
                                 <button
                                    type="submit"
                                    disabled={isLoading || !prompt.trim() || !image}
                                    className="px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover disabled:bg-surface-light disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Spinner/> : 'Analyze'}
                                </button>
                            </form>
                        </div>
                    )}
                    {error && <p className="text-red-500 text-center mt-4">{error}</p>}

                    {isLoading && response === null && <div className="mt-8 flex justify-center"><Spinner /></div>}
                    
                    {response && (
                        <div className="mt-8 p-6 bg-surface rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-3">Analysis Result</h2>
                            <p className="whitespace-pre-wrap text-text-secondary leading-relaxed">{response}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};