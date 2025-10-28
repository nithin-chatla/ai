import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { fileToBase64 } from '../utils/fileUtils';
import { Spinner } from './common/Spinner';

export const AudioTranscriber: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        setTranscription('');
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            setError('Microphone access denied. Please allow microphone access in your browser settings.');
            console.error(err);
        }
    };

    const stopRecordingAndTranscribe = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];
                
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());

                setIsLoading(true);
                try {
                    const base64Audio = await fileToBase64(new File([audioBlob], "audio.webm"));
                    const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY as string });
                    const result = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: {
                            parts: [
                                { text: 'Transcribe this audio.' },
                                { inlineData: { data: base64Audio, mimeType: 'audio/webm' } },
                            ]
                        }
                    });
                    setTranscription(result.text);
                } catch (err) {
                    setError('Failed to transcribe audio. Please try again.');
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            };
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

     const copyToClipboard = () => {
        if(transcription) {
            navigator.clipboard.writeText(transcription);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 md:p-6 border-b border-surface-light flex-shrink-0">
                <h1 className="text-2xl font-bold">Audio Transcriber</h1>
                 <p className="text-text-secondary text-sm mt-1">Record your voice and get a text transcription.</p>
            </header>
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 space-y-6">
                <button
                    onClick={isRecording ? stopRecordingAndTranscribe : startRecording}
                    className={`px-8 py-4 text-white rounded-full font-bold text-lg transition-all flex items-center gap-3 ${
                        isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-primary hover:bg-primary-hover'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                {isRecording && 
                    <div className="flex items-center gap-2 text-secondary animate-pulse">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        Recording...
                    </div>
                }
                
                {isLoading && <div className="flex items-center gap-2 text-text-secondary mt-4"><Spinner/>Transcribing...</div>}
                {error && <p className="mt-4 text-center text-red-500">{error}</p>}
                
                {transcription && (
                    <div className="mt-8 p-4 bg-surface rounded-lg w-full max-w-2xl relative">
                        <h2 className="text-xl font-semibold mb-2">Transcription</h2>
                        <button onClick={copyToClipboard} className="absolute top-4 right-4 text-sm px-3 py-1 bg-surface-light rounded hover:bg-gray-600">
                             {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <p className="whitespace-pre-wrap text-text-secondary pr-16">{transcription}</p>
                    </div>
                )}
            </div>
        </div>
    );
};