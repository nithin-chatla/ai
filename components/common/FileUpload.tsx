import React, { useCallback } from 'react';

interface FileUploadProps {
  onFileUpload: (files: FileList) => void;
  accept: string;
  title: string;
  multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, accept, title, multiple = false }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFileUpload(event.target.files);
    }
  };
  
  const onDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        onFileUpload(event.dataTransfer.files);
    }
  }, [onFileUpload]);

  const onDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  return (
    <label 
      className="flex justify-center w-full h-32 px-4 transition bg-surface border-2 border-dashed rounded-md appearance-none cursor-pointer hover:border-primary border-gray-600 focus:outline-none"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <span className="flex items-center space-x-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="font-medium text-gray-400">
          {title}
          <span className="text-primary underline ml-1">browse</span>
        </span>
      </span>
      <input type="file" name="file_upload" className="hidden" accept={accept} onChange={handleFileChange} multiple={multiple} />
    </label>
  );
};