import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Spinner } from './common/Spinner';
import { SkeletonLoader } from './common/SkeletonLoader';
import { AspectRatio } from '../types';

export const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY as string });
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio,
        },
      });
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      setImage(`data:image/jpeg;base64,${base64ImageBytes}`);
    } catch (err) {
      setError('Failed to generate image. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
        <header className="p-4 md:p-6 border-b border-surface-light flex-shrink-0">
            <h1 className="text-2xl font-bold">Image Generator</h1>
            <p className="text-text-secondary text-sm mt-1">Create stunning visuals from text prompts using Imagen 4.</p>
        </header>
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 md:p-6 overflow-y-auto">
            <div className="flex flex-col space-y-6">
                <form onSubmit={generateImage} className="space-y-4">
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-text-secondary mb-2">Prompt</label>
                        <textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A neon hologram of a cat driving at top speed"
                            className="w-full p-2 bg-surface rounded-lg border border-surface-light focus:ring-primary focus:border-primary"
                            rows={4}
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="aspectRatio" className="block text-sm font-medium text-text-secondary mb-2">Aspect Ratio</label>
                        <select
                            id="aspectRatio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                            className="w-full bg-surface rounded-lg border border-surface-light p-2 focus:ring-primary focus:border-primary"
                            disabled={isLoading}
                        >
                            <option value="1:1">1:1 (Square)</option>
                            <option value="16:9">16:9 (Landscape)</option>
                            <option value="9:16">9:16 (Portrait)</option>
                            <option value="4:3">4:3</option>
                            <option value="3:4">3:4</option>
                        </select>
                    </div>
                     <button
                        type="submit"
                        disabled={isLoading || !prompt.trim()}
                        className="w-full px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover disabled:bg-surface-light disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading && <Spinner/>}
                        {isLoading ? 'Generating...' : 'Generate Image'}
                    </button>
                </form>
                {error && <p className="text-center text-red-500">{error}</p>}
            </div>

            <div className="flex items-center justify-center bg-surface/50 rounded-lg p-4 h-[60vh] lg:h-auto">
                {isLoading && <SkeletonLoader className="w-full h-full" />}
                {!isLoading && !image && <div className="text-text-secondary text-center">Your generated image will appear here.</div>}
                {image && (
                    <div className="relative group">
                        <img src={image} alt={prompt} className="rounded-lg max-w-full max-h-full object-contain" />
                        <a 
                            href={image} 
                            download={`creator-ai-${Date.now()}.jpg`}
                            className="absolute bottom-4 right-4 bg-background/70 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Download image"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </a>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};