import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileUpload } from './common/FileUpload';
import { Spinner } from './common/Spinner';

// Make pdfjs an ambient declaration
declare const pdfjsLib: any;

type CompressionLevel = 'low' | 'medium' | 'high';

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const PdfCompressor: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string>('');
    const [result, setResult] = useState<{ url: string; originalSize: number; newSize: number } | null>(null);

    const handleFileChange = (selectedFile: File) => {
        if (selectedFile.type !== 'application/pdf') {
            setError('Please upload a valid PDF file.');
            return;
        }
        setFile(selectedFile);
        setError(null);
        setResult(null);
        setProgress('');
    };

    const handleCompress = async () => {
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setResult(null);
        setProgress('Initializing...');
        
        // This is required by pdf.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        try {
            const qualityMap = { low: 0.9, medium: 0.75, high: 0.5 };
            const quality = qualityMap[compressionLevel];

            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
            const newPdfDoc = await PDFDocument.create();
            const numPages = pdfDoc.numPages;

            for (let i = 1; i <= numPages; i++) {
                setProgress(`Processing page ${i} of ${numPages}...`);
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                const jpgImageBytes = await new Promise<Uint8Array>((resolve) => {
                    canvas.toBlob(
                        (blob) => {
                           const reader = new FileReader();
                           reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
                           reader.readAsArrayBuffer(blob!);
                        },
                        'image/jpeg',
                        quality
                    );
                });

                const jpgImage = await newPdfDoc.embedJpg(jpgImageBytes);
                const newPage = newPdfDoc.addPage([jpgImage.width, jpgImage.height]);
                newPage.drawImage(jpgImage, { x: 0, y: 0, width: jpgImage.width, height: jpgImage.height });
            }

            const pdfBytes = await newPdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setResult({
                url,
                originalSize: file.size,
                newSize: blob.size,
            });

        } catch (err) {
            setError('Failed to compress PDF. The file might be corrupted or protected.');
            console.error(err);
        } finally {
            setIsLoading(false);
            setProgress('');
        }
    };

    const reductionPercentage = result ? ((result.originalSize - result.newSize) / result.originalSize) * 100 : 0;

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 md:p-6 border-b border-surface-light flex-shrink-0">
                <h1 className="text-2xl font-bold">PDF Compressor</h1>
                <p className="text-text-secondary text-sm mt-1">Reduce the file size of your PDFs directly in your browser.</p>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    {!file && <FileUpload onFileUpload={handleFileChange} accept="application/pdf" title="Drop your PDF here, or" />}
                    
                    {file && (
                        <div className="bg-surface p-6 rounded-lg space-y-6">
                            <div>
                                <h2 className="text-xl font-bold">Compress Settings</h2>
                                <p className="text-sm text-text-secondary mt-1">File: {file.name} ({formatBytes(file.size)})</p>
                            </div>

                            {/* Compression Level Selection */}
                            <fieldset>
                                <legend className="text-lg font-medium text-text-primary mb-2">Compression Level</legend>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(['low', 'medium', 'high'] as CompressionLevel[]).map((level) => (
                                        <label key={level} className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${compressionLevel === level ? 'bg-primary/20 border-primary' : 'border-surface-light hover:border-primary/50'}`}>
                                            <input
                                                type="radio"
                                                name="compression-level"
                                                value={level}
                                                checked={compressionLevel === level}
                                                onChange={() => setCompressionLevel(level)}
                                                className="sr-only"
                                            />
                                            <h3 className="font-bold capitalize">{level} Compression</h3>
                                            <p className="text-sm text-text-secondary">
                                                {level === 'low' && 'Good quality, moderate size reduction.'}
                                                {level === 'medium' && 'Balanced quality and file size.'}
                                                {level === 'high' && 'Smallest file size, lower quality.'}
                                            </p>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="border-t border-surface-light pt-4">
                                <p className="text-xs text-yellow-400/80">
                                    <strong>Note:</strong> Compressing the PDF will convert text into images, making it non-selectable. This is best for documents where text selection is not a priority.
                                </p>
                            </div>

                            <button
                                onClick={handleCompress}
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover disabled:bg-surface-light disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Spinner /> : null}
                                {isLoading ? progress : 'Compress PDF'}
                            </button>
                        </div>
                    )}
                    
                    {error && <p className="text-center text-red-500">{error}</p>}
                    
                    {result && (
                        <div className="bg-green-500/10 border border-green-500/30 text-center p-6 rounded-lg">
                            <h2 className="text-2xl font-bold text-green-400">Compression Successful!</h2>
                            <div className="flex justify-around items-center my-4 text-lg">
                                <div>
                                    <p className="text-sm text-text-secondary">Original Size</p>
                                    <p className="font-bold">{formatBytes(result.originalSize)}</p>
                                </div>
                                <div className="text-3xl font-bold text-green-400">
                                    &rarr;
                                </div>
                                <div>
                                    <p className="text-sm text-text-secondary">New Size</p>
                                    <p className="font-bold">{formatBytes(result.newSize)}</p>
                                </div>
                            </div>
                            <p className="text-xl font-semibold text-green-300 mb-4">
                                Reduced by {reductionPercentage.toFixed(1)}%
                            </p>
                            <a
                                href={result.url}
                                download={file?.name.replace('.pdf', '_compressed.pdf')}
                                className="inline-block px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Download Compressed PDF
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};