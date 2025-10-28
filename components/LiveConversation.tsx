import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { decode, encode, decodeAudioData } from '../utils/audioUtils';

type ConversationState = 'idle' | 'listening' | 'connecting' | 'error';

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const LiveConversation: React.FC = () => {
    const [conversationState, setConversationState] = useState<ConversationState>('idle');
    const [transcriptions, setTranscriptions] = useState<{ user: string; model: string }[]>([]);
    const [currentTranscription, setCurrentTranscription] = useState({ user: '', model: ''});
    
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    const analyserRef = useRef<AnalyserNode | null>(null);
    const visualizerRef = useRef<HTMLDivElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);


    const stopConversation = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        audioContextRef.current = null;


        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            sourcesRef.current.forEach(source => source.stop());
            sourcesRef.current.clear();
            outputAudioContextRef.current.close();
        }
        outputAudioContextRef.current = null;

        
        setConversationState('idle');
    }, []);

    const visualize = useCallback(() => {
        if (!analyserRef.current || !visualizerRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (const amplitude of dataArray) {
            sum += amplitude * amplitude;
        }
        const rms = Math.sqrt(sum / dataArray.length) / 128.0; // Normalize
        const scale = 1 + rms * 2;
        visualizerRef.current.style.transform = `scale(${scale})`;

        animationFrameRef.current = requestAnimationFrame(visualize);
    }, []);

    const startConversation = useCallback(async () => {
        if (conversationState !== 'idle') return;

        setConversationState('connecting');
        setTranscriptions([]);
        setCurrentTranscription({ user: '', model: '' });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY as string });

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    // FIX: voiceName should be nested in prebuiltVoiceConfig.
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: 'You are a friendly and helpful AI assistant.',
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        setConversationState('listening');
                        const source = audioContextRef.current!.createMediaStreamSource(stream);
                        scriptProcessorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        analyserRef.current = audioContextRef.current!.createAnalyser();

                        source.connect(analyserRef.current);
                        analyserRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(audioContextRef.current!.destination);
                        visualize();

                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            setCurrentTranscription(prev => ({...prev, user: prev.user + message.serverContent!.inputTranscription!.text}));
                        }
                        if (message.serverContent?.outputTranscription) {
                             setCurrentTranscription(prev => ({...prev, model: prev.model + message.serverContent!.outputTranscription!.text}));
                        }
                        if (message.serverContent?.turnComplete) {
                            setTranscriptions(prev => [...prev, currentTranscription]);
                            setCurrentTranscription({user: '', model: ''});
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            const outputCtx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            
                            const sourceNode = outputCtx.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(outputCtx.destination);
                            
                            sourceNode.addEventListener('ended', () => { sourcesRef.current.delete(sourceNode); });
                            sourceNode.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(sourceNode);
                        }

                         if (message.serverContent?.interrupted) {
                             sourcesRef.current.forEach(source => source.stop());
                             sourcesRef.current.clear();
                             nextStartTimeRef.current = 0;
                        }
                    },
                    onclose: stopConversation,
                    onerror: (e) => {
                        console.error('Live session error:', e);
                        setConversationState('error');
                        stopConversation();
                    },
                },
            });

        } catch (error) {
            console.error('Failed to start conversation:', error);
            setConversationState('error');
            stopConversation();
        }
    }, [conversationState, stopConversation, currentTranscription, visualize]);
    
     useEffect(() => stopConversation, [stopConversation]);

    return (
        <div className="p-4 md:p-6 flex flex-col h-full">
            <header className="flex-shrink-0 mb-4">
                <h1 className="text-2xl font-bold">Live Conversation</h1>
                <p className="text-text-secondary text-sm mt-1">Speak directly with Gemini and get instant audio responses.</p>
            </header>
            <div className="flex-1 overflow-y-auto bg-surface rounded-lg p-4 space-y-4">
                {transcriptions.map((t, i) => (
                    <div key={i} className="space-y-2">
                        <p><span className="font-bold text-primary">You:</span> {t.user}</p>
                        <p><span className="font-bold text-secondary">AI:</span> {t.model}</p>
                    </div>
                ))}
                { (currentTranscription.user || currentTranscription.model) &&
                    <div className="space-y-2 opacity-70">
                        {currentTranscription.user && <p><span className="font-bold text-primary">You:</span> {currentTranscription.user}</p>}
                        {currentTranscription.model && <p><span className="font-bold text-secondary">AI:</span> {currentTranscription.model}</p>}
                    </div>
                }
            </div>
            <div className="mt-6 text-center flex-shrink-0">
                {conversationState === 'idle' && <button onClick={startConversation} className="px-6 py-3 bg-primary text-white rounded-full font-bold text-lg hover:bg-primary-hover transition-colors">Start Conversation</button>}
                {conversationState === 'connecting' && <p className="text-text-secondary">Connecting...</p>}
                {conversationState === 'listening' && (
                    <div className="flex flex-col items-center">
                        <div className="relative w-24 h-24 mb-4">
                            <div ref={visualizerRef} className="absolute inset-0 bg-secondary/50 rounded-full transition-transform duration-100"></div>
                            <div className="absolute inset-2 bg-secondary rounded-full animate-pulse-fast"></div>
                            <div className="absolute inset-4 bg-primary/50 rounded-full"></div>
                        </div>
                        <button onClick={stopConversation} className="px-6 py-3 bg-red-600 text-white rounded-full font-bold text-lg hover:bg-red-500 transition-colors">Stop Conversation</button>
                    </div>
                )}
                 {conversationState === 'error' && <p className="text-red-500">An error occurred. Please try again.</p>}
            </div>
        </div>
    );
};