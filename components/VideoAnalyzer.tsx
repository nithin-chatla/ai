import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Spinner } from './common/Spinner';
import { FileUpload } from './common/FileUpload';

const FRAME_INTERVAL_MS = 1000; // 1 frame per second

export const VideoAnalyzer: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [video, setVideo] = useState<{ file: File, url: string } | null>(null);
    const [response, setResponse] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // FIX: The onFileUpload prop from FileUpload provides a FileList. This function now accepts a FileList and takes the first file.
    const handleFileChange = (files: FileList) => {
        const file = files[0];
        if (!file) return;
        
        if (!file.type.startsWith('video/')) {
            setError('Please upload a valid video file.');
            return;
        }
        const url = URL.createObjectURL(file);
        setVideo({ file, url });
        setResponse(null);
        setError(null);
    };

    const extractFrames = (): Promise<string[]> => {
        return new Promise((resolve) => {
            if (!videoRef.current || !canvasRef.current) {
                resolve([]);
                return;
            }
            const videoElement = videoRef.current;
            const canvasElement = canvasRef.current;
            const context = canvasElement.getContext('2d');
            const frames: string[] = [];
    
            videoElement.onloadeddata = () => {
                canvasElement.width = videoElement.videoWidth;
                canvasElement.height = videoElement.videoHeight;
                let currentTime = 0;
                
                const captureFrame = () => {
                    if (currentTime >= videoElement.duration) {
                        resolve(frames);
                        return;
                    }
                    videoElement.currentTime = currentTime;
                };

                videoElement.onseeked = () => {
                    context?.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
                    const dataUrl = canvasElement.toDataURL('image/jpeg');
                    frames.push(dataUrl.split(',')[1]); // remove prefix
                    currentTime += FRAME_INTERVAL_MS / 1000;
                    captureFrame();
                };
                
                captureFrame();
            };
        });
    };

    const analyzeVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || !video || isLoading) return;

        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            const frames = await extractFrames();
            if (frames.length === 0) {
                // Try to load video metadata another way if onloadeddata doesn't fire
                if(videoRef.current?.duration){
                     // give it a moment to settle
                    await new Promise(r => setTimeout(r, 100));
                    const framesRetry = await extractFrames();
                     if(framesRetry.length === 0) throw new Error("Could not extract frames from video.");
                } else {
                     throw new Error("Could not extract frames from video.");
                }
            }
            
            const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY as string });
            
            const frameParts = frames.map(frame => ({
                inlineData: {
                    data: frame,
                    mimeType: 'image/jpeg'
                }
            }));

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { parts: [{text: prompt}, ...frameParts] },
            });
            
            setResponse(result.text);

        } catch (err) {
            setError('Failed to analyze video. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
         <div className="flex flex-col h-full">
             <header className="p-4 md:p-6 border-b border-surface-light flex-shrink-0">
                <h1 className="text-2xl font-bold">Video Analyzer</h1>
                <p className="text-text-secondary text-sm mt-1">Ask questions about the content of your videos.</p>
            </header>
             <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                    {!video && <FileUpload onFileUpload={handleFileChange} accept="video/*" title="Drop video to analyze, or" />}
                    
                    {video && (
                        <div className="space-y-6">
                            <div className="text-center bg-surface p-4 rounded-lg">
                                 <video ref={videoRef} src={video.url} controls className="rounded-lg max-h-[40vh] mx-auto mb-4" />
                                <canvas ref={canvasRef} className="hidden" />
                            </div>
                             <form onSubmit={analyzeVideo} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="What do you want to know about the video?"
                                     className="flex-1 p-3 bg-surface rounded-lg border border-surface-light focus:ring-primary focus:border-primary"
                                    disabled={isLoading}
                                />
                                 <button
                                    type="submit"
                                    disabled={isLoading || !prompt.trim() || !video}
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