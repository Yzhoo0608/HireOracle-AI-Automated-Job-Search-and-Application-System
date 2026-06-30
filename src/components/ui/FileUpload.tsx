import React, { useCallback, useState } from 'react';
import { UploadCloud, File, X } from 'lucide-react';

interface FileUploadProps {
  onUpload: (file: File) => void;
  accept?: string;
  maxSize?: number; // MB
}

export function FileUpload({ onUpload, accept = ".pdf,.docx", maxSize = 5 }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (newFile: File) => {
    if (newFile.size > maxSize * 1024 * 1024) {
      alert(`File too large. Max ${maxSize}MB.`);
      return;
    }
    setFile(newFile);
    onUpload(newFile);
  };

  return (
    <div 
      className={`relative w-full rounded-2xl border-2 border-dashed transition-all duration-300 ${
        isDragging ? 'border-primary bg-primary/5' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'
      } flex flex-col items-center justify-center p-12 text-center cursor-pointer`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        accept={accept}
        onChange={handleChange}
      />
      
      {!file ? (
        <>
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-primary">
            <UploadCloud size={32} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Upload your CV</h3>
          <p className="text-sm text-slate-400 mb-4">Drag and drop or click to browse</p>
          <div className="flex gap-2">
            <span className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 font-mono">PDF</span>
            <span className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 font-mono">DOCX</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary relative">
            <File size={32} />
            <button 
              onClick={(e) => { e.preventDefault(); setFile(null); }}
              className="absolute -top-2 -right-2 bg-slate-800 rounded-full p-1 border border-slate-700 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <p className="font-medium text-white">{file.name}</p>
          <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}
    </div>
  );
}
