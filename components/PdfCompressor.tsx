import React, { useState, useMemo } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileUpload } from './common/FileUpload';
import { Spinner } from './common/Spinner';

// Make pdfjs an ambient declaration
declare const pdfjsLib: any;

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

type CompressionLevel = 'low' | 'medium' | 'high';

type Result = {
    name: string;
    url: string;
    originalSize: number;
    newSize: number;
};

type ProgressData = {
    currentFileNumber: number;
    totalFiles: number;
    fileName: string;
    currentPage: number;
    totalPages: number;
};


export const PdfCompressor: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progressData, setProgressData] = useState<ProgressData | null>(null);
    const [results, setResults] = useState<Result[]>([]);

    const handleFileChange = (selectedFiles: FileList) => {
        const pdfFiles = Array.from(selectedFiles).filter(f => f.type === 'application/pdf');

        if (pdfFiles.length === 0) {
            setError('No valid PDF files were selected.');
            return;
        }
        
        if (pdfFiles.length < selectedFiles.length) {
            setError('Some non-PDF files were ignored.');
        } else {
            setError(null);
        }

        setFiles(pdfFiles);
        setResults([]);
        setProgressData(null);
        setCompressionLevel('medium');
    };
    
    const handleReset = () => {
        setFiles([]);
        setResults([]);
        setError(null);
        setProgressData(null);
    };

    const handleCompress = async () => {
        if (files.length === 0) return;

        setIsLoading(true);
        setError(null);
        setResults([]);
        setProgressData(null);
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        let quality: number;
        switch (compressionLevel) {
            case 'low': quality = 0.9; break;
            case 'medium': quality = 0.75; break;
            case 'high': quality = 0.5; break;
        }
        
        const newResults: Result[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
                const newPdfDoc = await PDFDocument.create();
                const numPages = pdfDoc.numPages;

                setProgressData({
                    currentFileNumber: i + 1,
                    totalFiles: files.length,
                    fileName: file.name,
                    currentPage: 0,
                    totalPages: numPages
                });

                for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                     setProgressData({
                        currentFileNumber: i + 1,
                        totalFiles: files.length,
                        fileName: file.name,
                        currentPage: pageNum,
                        totalPages: numPages
                    });

                    const page = await pdfDoc.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 1.5 });

                    const canvas = document.createElement('canvas');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    const context = canvas.getContext('2d');
                    
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
                
                const originalSize = file.size;
                let finalBlob: Blob;
                let newSize: number;
                
                // If the compressed file is larger, use the original file instead.
                if (pdfBytes.length >= originalSize) {
                    finalBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
                    newSize = originalSize;
                } else {
                    finalBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                    newSize = finalBlob.size;
                }
                
                const url = URL.createObjectURL(finalBlob);
                
                newResults.push({
                    name: file.name,
                    url,
                    originalSize: originalSize,
                    newSize: newSize,
                });
                setResults([...newResults]);

            } catch (err) {
                setError(`Failed to compress ${file.name}. It may be corrupted or protected. Skipping.`);
                console.error(err);
            }
        }

        setIsLoading(false);
        setProgressData(null);
    };
    
    const { totalOriginalSize, totalNewSize } = useMemo(() => {
        return results.reduce(
            (acc, res) => {
                acc.totalOriginalSize += res.originalSize;
                acc.totalNewSize += res.newSize;
                return acc;
            },
            { totalOriginalSize: 0, totalNewSize: 0 }
        );
    }, [results]);

    const totalReductionPercentage = totalOriginalSize > 0 ? ((totalOriginalSize - totalNewSize) / totalOriginalSize) * 100 : 0;

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 md:p-6 border-b border-surface-light flex-shrink-0">
                <h1 className="text-2xl font-bold">PDF Compressor</h1>
                <p className="text-text-secondary text-sm mt-1">Reduce the file size of multiple PDFs at once.</p>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {files.length === 0 && <FileUpload onFileUpload={handleFileChange} accept="application/pdf" title="Drop your PDFs here, or" multiple={true} />}
                    
                    {files.length > 0 && !isLoading && results.length === 0 && (
                        <div className="bg-surface p-6 rounded-lg space-y-6">
                            <div>
                                <h2 className="text-xl font-bold">Files Ready to Compress</h2>
                                <ul className="mt-2 text-sm text-text-secondary max-h-40 overflow-y-auto pr-2">
                                    {files.map(f => <li key={f.name} className="truncate">{f.name} ({formatBytes(f.size)})</li>)}
                                </ul>
                            </div>

                             <div>
                                <label className="block text-lg font-medium text-text-primary mb-2">Compression Level</label>
                                 <div className="flex space-x-2 p-1 bg-background rounded-lg">
                                    {(['low', 'medium', 'high'] as CompressionLevel[]).map((level) => (
                                        <button key={level} onClick={() => setCompressionLevel(level)} className={`flex-1 capitalize px-3 py-2 text-sm font-medium rounded-md transition-colors ${compressionLevel === level ? 'bg-primary text-white shadow' : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'}`}>
                                            {level}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-text-secondary mt-2 text-center">
                                    {compressionLevel === 'low' && 'Best quality, larger file size.'}
                                    {compressionLevel === 'medium' && 'Balanced quality and file size.'}
                                    {compressionLevel === 'high' && 'Smallest file size, good quality.'}
                                </p>
                            </div>

                             <div className="border-t border-surface-light pt-4">
                                <p className="text-xs text-yellow-400/80">
                                    <strong>Note:</strong> Compression converts text into images, making it non-selectable. This is best for documents where text selection is not a priority.
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <button onClick={handleReset} className="w-auto px-4 py-3 bg-surface-light text-white font-bold rounded-lg hover:bg-gray-600">
                                    Clear
                                </button>
                                <button onClick={handleCompress} disabled={isLoading} className="w-full px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover disabled:bg-surface-light disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {`Compress ${files.length} PDF(s)`}
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {isLoading && progressData && (
                        <div className="bg-surface p-6 rounded-lg text-center space-y-4">
                            <Spinner />
                            <div className="text-left">
                                <p className="text-lg font-medium truncate">{`Compressing: ${progressData.fileName}`}</p>
                                <p className="text-sm text-text-secondary">{`File ${progressData.currentFileNumber} of ${progressData.totalFiles}`}</p>
                            </div>
                            
                            <div className="w-full bg-surface-light rounded-full h-2.5">
                                <div 
                                    className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-linear" 
                                    style={{ width: `${(progressData.currentPage / progressData.totalPages) * 100}%` }}
                                ></div>
                            </div>

                            <div className="text-right text-sm text-text-secondary">
                                <p>{`Page ${progressData.currentPage} / ${progressData.totalPages}`}</p>
                            </div>
                            <p className="text-xs text-text-secondary pt-2">Please wait, this may take a while...</p>
                        </div>
                    )}
                    
                    {error && <p className="text-center text-red-500">{error}</p>}
                    
                    {results.length > 0 && !isLoading && (
                        <div className="bg-surface p-4 md:p-6 rounded-lg space-y-6">
                            <h2 className="text-2xl font-bold text-green-400 text-center">Compression Complete!</h2>
                            
                            <div className="bg-background/50 p-4 rounded-lg text-center">
                                <h3 className="text-lg font-semibold">Total Savings</h3>
                                <p className="text-2xl font-bold text-green-300 my-2">{totalReductionPercentage.toFixed(1)}%</p>
                                <p className="text-text-secondary">{formatBytes(totalOriginalSize)} &rarr; {formatBytes(totalNewSize)}</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-xs text-text-secondary uppercase">
                                        <tr>
                                            <th className="px-4 py-2">File Name</th>
                                            <th className="px-4 py-2">Original</th>
                                            <th className="px-4 py-2">Compressed</th>
                                            <th className="px-4 py-2">Reduction</th>
                                            <th className="px-4 py-2 text-right">Download</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-background/50 divide-y divide-surface-light">
                                        {results.map((res) => (
                                            <tr key={res.name}>
                                                <td className="px-4 py-3 font-medium truncate max-w-xs">{res.name}</td>
                                                <td className="px-4 py-3">{formatBytes(res.originalSize)}</td>
                                                <td className="px-4 py-3">{formatBytes(res.newSize)}</td>
                                                <td className="px-4 py-3 font-semibold text-green-400">{(((res.originalSize - res.newSize) / res.originalSize) * 100).toFixed(1)}%</td>
                                                <td className="px-4 py-3 text-right">
                                                    <a href={res.url} download={res.name.replace('.pdf', '_compressed.pdf')} className="font-medium text-primary hover:underline">
                                                        Save
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                             <button onClick={handleReset} className="w-full px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover">
                                Compress More PDFs
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};