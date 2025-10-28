import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { Spinner } from './common/Spinner';
import { FileUpload } from './common/FileUpload';
import { fileToBase64 } from '../utils/fileUtils';
import { VideoAspectRatio } from '../types';
import { SkeletonLoader } from './common/SkeletonLoader';

const VEO_LOADING_MESSAGES = [
    "Brewing pixels into motion...",
    "This can take a few minutes...",
    "Assembling your masterpiece frame by frame...",
    "Teaching pixels to dance...",
    "Almost there, the final cut is rendering...",
];

export const VideoGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
    const [image, setImage] = useState<{ file: File, url: string, base64: string, mimeType: string } | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState(VEO_LOADING_MESSAGES[0]);
    const [isKeySelected, setIsKeySelected] = useState(false);

    const checkApiKey = useCallback(async () => {
        try {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setIsKeySelected(hasKey);
        } catch (e) {
            console.error('aistudio.hasSelectedApiKey not available');
            setIsKeySelected(true);
        }
    }, []);
    
    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    const handleSelectKey = async () => {
        try {
            await (window as any).aistudio.openSelectKey();
            setIsKeySelected(true);
        } catch (e) {
            console.error('aistudio.openSelectKey not available or failed', e);
            setError('Could not open API key selection. Please ensure you are in a supported environment.');
        }
    };

    // FIX: The onFileUpload prop from FileUpload provides a FileList. This function now accepts a FileList and takes the first file.
    const handleFileChange = async (files: FileList) => {
        const file = files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file.');
            return;
        }
        const base64 = await fileToBase64(file);
        const url = URL.createObjectURL(file);
        setImage({ file, url, base64, mimeType: file.type });
        setError(null);
    };

    const pollOperation = async (operation: GenerateVideosOperation, ai: GoogleGenAI) => {
        let currentOperation = operation;
        let messageIndex = 0;
        
        const intervalId = setInterval(() => {
            messageIndex = (messageIndex + 1) % VEO_LOADING_MESSAGES.length;
            setLoadingMessage(VEO_LOADING_MESSAGES[messageIndex]);
        }, 5000);

        while (!currentOperation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            try {
                currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
            } catch (err: any) {
                clearInterval(intervalId);
                if(err.message.includes('Requested entity was not found.')) {
                    setError('API Key is invalid. Please select a valid key.');
                    setIsKeySelected(false);
                } else {
                    setError('An error occurred while checking video status.');
                }
                setIsLoading(false);
                return null;
            }
        }
        clearInterval(intervalId);
        return currentOperation;
    };


    const generateVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!prompt.trim() && !image) || isLoading) return;

        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        setLoadingMessage(VEO_LOADING_MESSAGES[0]);

        try {
            const apiKey = (window as any).process.env.API_KEY as string;
            const ai = new GoogleGenAI({ apiKey });

            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt,
                image: image ? { imageBytes: image.base64, mimeType: image.mimeType } : undefined,
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio,
                }
            });

            const finalOperation = await pollOperation(operation, ai);
            if (!finalOperation) return;

            const downloadLink = finalOperation.response?.generatedVideos?.[0]?.video?.uri;

            if (downloadLink) {
                const response = await fetch(`${downloadLink}&key=${apiKey}`);
                const blob = await response.blob();
                setVideoUrl(URL.createObjectURL(blob));
            } else {
                setError('Video generation completed, but no video URI was returned.');
            }
        } catch (err: any) {
            console.error(err);
             if (err.message.includes('API key not valid')) {
                setError('Your API Key is not valid. Please select another one.');
                setIsKeySelected(false);
            } else {
                setError('Failed to generate video. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isKeySelected) {
        return (
            <div className="p-4 md:p-6 flex flex-col items-center justify-center h-full text-center">
                <h1 className="text-2xl font-bold mb-4">API Key Required for Video Generation</h1>
                <p className="mb-4 text-text-secondary">Veo video generation requires a valid API key with billing enabled.</p>
                <p className="mb-6 text-sm text-text-secondary">Please refer to the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-primary underline">billing documentation</a> for more information.</p>
                <button onClick={handleSelectKey} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover">Select API Key</button>
                {error && <p className="mt-4 text-red-500">{error}</p>}
            </div>
        );
    }

    return (
         <div className="flex flex-col h-full">
            <header className="p-4 md:p-6 border-b border-surface-light flex-shrink-0">
                <h1 className="text-2xl font-bold">Video Generator (Veo)</h1>
                <p className="text-text-secondary text-sm mt-1">Generate high-quality video from text or an initial image.</p>
            </header>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 md:p-6 overflow-y-auto">
                 <div className="flex flex-col space-y-6">
                    <form onSubmit={generateVideo} className="space-y-4">
                        <div>
                            <label htmlFor="prompt" className="block text-sm font-medium text-text-secondary mb-2">Prompt</label>
                            <textarea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., A majestic lion roaring on a cliff at sunset"
                                className="w-full p-2 bg-surface rounded-lg border border-surface-light focus:ring-primary focus:border-primary"
                                rows={3}
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-text-secondary mb-2">Starting Image (Optional)</label>
                           <FileUpload onFileUpload={handleFileChange} accept="image/*" title="Click to upload or drag and drop" />
                           {image && <p className="text-sm text-text-secondary mt-2">Image selected: {image.file.name}</p>}
                        </div>
                        <div>
                            <label htmlFor="aspectRatio" className="block text-sm font-medium text-text-secondary mb-2">Aspect Ratio</label>
                            <select
                                id="aspectRatio"
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value as VideoAspectRatio)}
                                className="w-full bg-surface rounded-lg border border-surface-light p-2 focus:ring-primary focus:border-primary"
                                disabled={isLoading}
                            >
                                <option value="16:9">16:9 (Landscape)</option>
                                <option value="9:16">9:16 (Portrait)</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || (!prompt.trim() && !image)}
                            className="w-full px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover disabled:bg-surface-light disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading && <Spinner/>}
                            {isLoading ? 'Generating...' : 'Generate Video'}
                        </button>
                    </form>
                    {error && <p className="mt-4 text-center text-red-500">{error}</p>}
                </div>
                 <div className="flex items-center justify-center bg-surface/50 rounded-lg p-4 min-h-[300px]">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center text-center">
                            <Spinner />
                            <p className="mt-4 text-text-primary font-medium">{loadingMessage}</p>
                            <p className="text-sm text-text-secondary">Video generation can take several minutes.</p>
                        </div>
                    )}
                    {!isLoading && !videoUrl && <div className="text-text-secondary text-center">Your generated video will appear here.</div>}
                    {videoUrl && (
                        <div className="relative group w-full">
                            <video src={videoUrl} controls autoPlay loop className="rounded-lg max-w-full mx-auto" />
                             <a 
                                href={videoUrl} 
                                download={`creator-ai-video-${Date.now()}.mp4`}
                                className="absolute bottom-4 right-4 bg-background/70 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Download video"
                            >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </a>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};