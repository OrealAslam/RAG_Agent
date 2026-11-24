'use client';

import { useRef, useState } from 'react';
import api from "../api/api";

export default function FileUpload({ onUploaded }) {
    const fileInputRef = useRef(null);

    // status: 'idle' | 'uploading' | 'processing' | 'done' | 'error'
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState(0);   // 0–100 for the transfer phase
    const [error, setError] = useState(null);
    const [info, setInfo] = useState(null);        // { fileName, chunkCount }

    const fileupload = (event) => {
        const file = event.target.files[0];

        if (!file) {
            console.warn('No file selected. Please select a .pdf, .doc, or .docx file.');
            return;
        }

        console.log('Selected file:', file);
        console.log(`Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

        setStatus('uploading');
        setProgress(0);
        setError(null);
        setInfo(null);

        const formData = new FormData();
        formData.append('file', file);

        api.post('/upload', formData, {
            // 5 minute timeout — a 100MB file + processing can take that long
            timeout: 300000,

            onUploadProgress: (e) => {
                if (!e.total) return;
                const pct = Math.round((e.loaded / e.total) * 100);
                setProgress(pct);

                // Bytes are fully transferred → server is now chunking/embedding
                if (pct === 100) {
                    setStatus('processing');
                }
            },
        })
            .then((response) => {
                console.log('Upload successful:', response.data);
                setInfo({
                    fileName: response.data.fileName,
                    chunkCount: response.data.chunkCount,
                });
                setStatus('done');
                onUploaded?.(response.data);
            })
            .catch((err) => {
                console.error('Upload error:', err);
                const serverMessage =
                    err?.response?.data?.message ||
                    err?.response?.data?.error ||
                    err?.message ||
                    'Upload failed. Please try again.';
                setError(serverMessage);
                setStatus('error');
            })
            .finally(() => {
                // Allow re-selecting the same file
                if (fileInputRef.current) fileInputRef.current.value = '';
            });
    };

    const isBusy = status === 'uploading' || status === 'processing';
    const fileSizeMB = 100; // matches multer limit

    return (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px]">
            {/* Heading */}
            <h2 className="text-2xl font-bold mb-2 text-center">Upload a File</h2>
            <p className="text-sm text-gray-400 mb-8 text-center">
                Supported formats: <span className="text-gray-200 font-medium">.pdf, .doc, .docx</span>
                <span className="block mt-1 text-xs text-gray-500">Max size: {fileSizeMB} MB</span>
            </p>

            {/* Rounded, icon-based select-file button */}
            <label
                htmlFor="fileInput"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full
                           text-white text-sm font-medium cursor-pointer
                           transition-all duration-150 shadow-lg
                           focus-within:ring-2 focus-within:ring-blue-400
                           focus-within:ring-offset-2 focus-within:ring-offset-gray-950
                           ${isBusy
                               ? 'bg-gray-700 cursor-not-allowed shadow-gray-900/30'
                               : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-blue-900/30'}
                           ${status === 'error' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/30' : ''}
                           ${status === 'done' ? 'bg-green-600 hover:bg-green-500 shadow-green-900/30' : ''}`}
            >
                {/* Icon changes per state */}
                {status === 'uploading' && (
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                )}
                {status === 'processing' && (
                    <svg className="animate-pulse" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                    </svg>
                )}
                {status === 'done' && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                )}
                {(status === 'idle' || status === 'error') && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                )}

                {status === 'idle' && 'Select File'}
                {status === 'uploading' && `Uploading… ${progress}%`}
                {status === 'processing' && 'Processing…'}
                {status === 'done' && 'Upload another file'}
                {status === 'error' && 'Try again'}

                <input
                    id="fileInput"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={fileupload}
                    disabled={isBusy}
                    className="hidden"
                />
            </label>

            {/* Progress bar during upload */}
            {status === 'uploading' && (
                <div className="w-full max-w-xs mt-6">
                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-150"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 text-center">
                        {progress}% transferred
                    </p>
                </div>
            )}

            {/* Processing notice — no byte progress, but shows the app is alive */}
            {status === 'processing' && (
                <div className="w-full max-w-xs mt-6">
                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 animate-pulse w-full" />
                    </div>
                    <p className="mt-2 text-xs text-gray-400 text-center">
                        Indexing document — this can take 20–60s for large PDFs…
                    </p>
                </div>
            )}

            {/* Success state */}
            {status === 'done' && info && (
                <div className="mt-6 text-sm text-center">
                    <p className="text-green-400 font-medium">
                        ✓ {info.chunkCount} chunk(s) indexed
                    </p>
                    <p className="text-xs text-gray-500 mt-1 break-all max-w-xs">
                        {info.fileName}
                    </p>
                </div>
            )}

            {/* Error state */}
            {status === 'error' && error && (
                <div className="mt-6 w-full max-w-xs rounded-md border border-red-800
                                bg-red-900/20 p-3 text-xs text-red-300 text-center">
                    {error}
                </div>
            )}

            {/* Helper text (only when idle) */}
            {status === 'idle' && (
                <p className="mt-4 text-xs text-gray-500 text-center">
                    Only <span className="text-gray-300">.pdf, .doc, .docx</span> files are allowed
                </p>
            )}
        </div>
    );
}