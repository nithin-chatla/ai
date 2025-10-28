import React, { useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Spinner } from './common/Spinner';
import { FileUpload } from './common/FileUpload';
import { fileToBase64 } from '../utils/fileUtils';
import { SkeletonLoader } from './common/SkeletonLoader';

export const ImageEditor: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [originalImage, setOriginalImage] = useState<{ file: File, url: string, base64: string, mimeType: string } | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // FIX: The onFileUpload prop from FileUpload provides a FileList. This function now accepts a FileList and takes the first file.
    const handleFileChange = async (files: FileList) => {
        const file = files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file.');
            return;
        }
        const url = URL.createObjectURL(file);
        const base64 = await fileToBase64(file);
        setOriginalImage({ file, url, base64, mimeType: file.type });
        setEditedImage(null);
        setError(null);
    };

    const editImage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || !originalImage || isLoading) return;

        setIsLoading(true);
        setError(null);
        setEditedImage(null);

        try {
            const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: originalImage.base64, mimeType: originalImage.mimeType } },
                        { text: prompt },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            for (const part of response.candidates?.[0]?.content?.parts ?? []) {
                if (part.inlineData) {
                    setEditedImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    break;
                }
            }
             if (!response.candidates?.[0]?.content?.parts?.some(p => p.inlineData)) {
                setError('The model did not return an image. It might not have understood the edit request.');
            }
        } catch (err) {
            setError('Failed to edit image. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full">
             <header className="p-4 md:p-6 border-b border-surface-light flex-shrink-0">
                <h1 className="text-2xl font-bold">Image Editor</h1>
                <p className="text-text-secondary text-sm mt-1">Modify your images with simple text commands.</p>
            </header>
             <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {!originalImage ? (
                    <FileUpload onFileUpload={handleFileChange} accept="image/*" title="Drop image here, or" />
                ) : (
                    <div className="space-y-4">
                        <form onSubmit={editImage} className="space-y-4">
                             <div>
                                <label htmlFor="prompt" className="block text-sm font-medium text-text-secondary mb-2">Editing instruction</label>
                                <textarea
                                    id="prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., Add a retro filter, make the sky dramatic"
                                    className="w-full p-2 bg-surface rounded-lg border border-surface-light focus:ring-primary focus:border-primary"
                                    rows={2}
                                    disabled={isLoading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !prompt.trim() || !originalImage}
                                className="w-full md:w-auto px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover disabled:bg-surface-light disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading && <Spinner/>}
                                {isLoading ? 'Editing...' : 'Edit Image'}
                            </button>
                        </form>
                    </div>
                )}
                {error && <p className="text-red-500 mt-4">{error}</p>}
                
                {originalImage && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">Original</h2>
                            <img src={originalImage.url} alt="Original" className="rounded-lg w-full" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold mb-2">Edited</h2>
                            <div className="aspect-square bg-surface/50 rounded-lg flex items-center justify-center">
                                {isLoading && <SkeletonLoader className="w-full h-full" />}
                                {!isLoading && !editedImage && <div className="text-text-secondary">Your edited image will appear here</div>}
                                {editedImage && <img src={editedImage} alt="Edited" className="rounded-lg w-full" />}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};