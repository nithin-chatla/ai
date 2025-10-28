import React, { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Spinner } from './common/Spinner';
import { decode, decodeAudioData } from '../utils/audioUtils';

export const PodcastCreator: React.FC = () => {
    const [script, setScript] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    const generatePodcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!script.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setAudioUrl(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Say this in a clear, engaging voice like a podcast host: ${script}` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                },
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio data returned");

            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputAudioContext,
                24000,
                1,
            );
            
            const wavBlob = bufferToWave(audioBuffer);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);

        } catch (err) {
            setError('Failed to generate audio. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const bufferToWave = (abuffer: AudioBuffer) => {
        const numOfChan = abuffer.numberOfChannels;
        const length = abuffer.length * numOfChan * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);
        let pos = 0;
    
        const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
        const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };
        
        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length - 8
        setUint32(0x45564157); // "WAVE"
        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16); // length = 16
        setUint16(1); // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(abuffer.sampleRate);
        setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2); // block-align
        setUint16(16); // 16-bit
        setUint32(0x61746164); // "data" - chunk
        setUint32(length - pos - 4); // chunk length
    
        const channels = Array.from({ length: abuffer.numberOfChannels }, (_, i) => abuffer.getChannelData(i));
        for (let i = 0; i < abuffer.length; i++) {
            for (let j = 0; j < numOfChan; j++) {
                let sample = Math.max(-1, Math.min(1, channels[j][i]));
                sample = sample < 0 ? sample * 32768 : sample * 32767;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
        }
    
        return new Blob([view], { type: 'audio/wav' });
    }

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 md:p-6 border-b border-surface-light flex-shrink-0">
                <h1 className="text-2xl font-bold">Podcast Creator (TTS)</h1>
                <p className="text-text-secondary text-sm mt-1">Convert your written scripts into high-quality audio.</p>
            </header>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 md:p-6 overflow-y-auto">
                <div className="flex flex-col space-y-4">
                    <form onSubmit={generatePodcast} className="space-y-4 flex flex-col flex-1">
                        <div className="flex-1 flex flex-col">
                            <label htmlFor="script" className="block text-sm font-medium text-text-secondary mb-2">Podcast Script</label>
                            <textarea
                                id="script"
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                                placeholder="Enter your podcast script here..."
                                className="w-full flex-1 p-3 bg-surface rounded-lg border border-surface-light focus:ring-primary focus:border-primary resize-none"
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !script.trim()}
                            className="w-full px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover disabled:bg-surface-light disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading && <Spinner/>}
                            {isLoading ? 'Generating Audio...' : 'Generate Podcast Audio'}
                        </button>
                    </form>
                     {error && <p className="text-center text-red-500">{error}</p>}
                </div>
                 <div className="flex flex-col items-center justify-center bg-surface/50 rounded-lg p-4 min-h-[300px]">
                    {isLoading && (
                        <div className="text-center">
                            <Spinner />
                            <p className="mt-2 text-text-secondary">Generating audio, please wait...</p>
                        </div>
                    )}
                    {!isLoading && !audioUrl && <div className="text-text-secondary text-center">Your generated audio will appear here.</div>}
                    {audioUrl && (
                        <div className="w-full">
                            <h2 className="text-xl font-semibold mb-4 text-center">Generated Audio</h2>
                            <audio ref={audioRef} src={audioUrl} controls className="w-full" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};