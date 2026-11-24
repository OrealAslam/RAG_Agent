// 'use client';

// import FileUpload from '../components/FileUpload';

// export default function Home() {
//   return (
//     <main className="flex min-h-screen min-w-screen flex-col">
//       <h1>RAG App</h1>
//       <div style={{ flex: 1, flexDirection: 'column', backgroundColor: '#1b1b1b', padding: '20px', borderRadius: '8px' }}>
//         <div style={{  }}>
//           <FileUpload />
//         </div>

//         <div style={{  }}>
//           <input id="queryInput" placeholder="Enter your query here" style={{ width: '100%', padding: '10px', marginTop: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
//           <button id="queryButton" style={{ marginTop: '10px', padding: '10px 20px', borderRadius: '4px', backgroundColor: '#0070f3', color: '#fff', border: 'none' }}>Submit Query</button>
//         </div>
//       </div>
//     </main>
//   );
// }






'use client';

import { useState } from 'react';
import FileUpload from '../components/FileUpload';
import Chat from '../components/Chat';

export default function Home() {
    const [docId, setDocId] = useState(null);
    const [fileName, setFileName] = useState(null);

    return (
        <main className="h-screen flex flex-col bg-gray-950 text-gray-100">
            {/* Header */}
            <header className="flex-shrink-0 border-b border-gray-800 px-6 py-4">
                <h1 className="text-lg font-semibold tracking-tight">RAG Agent</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                    Upload a document, then ask anything about it.
                </p>
            </header>

            {/* Two-column body */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] overflow-hidden">

                {/* LEFT: file upload + doc status */}
                <aside className="border-r border-gray-800 p-6 overflow-y-auto">
                    <FileUpload
                        onUploaded={(data) => {
                            setDocId(data.docId);
                            setFileName(data.fileName);
                        }}
                    />

                    {docId && (
                        <div className="mt-6 rounded-lg border border-green-800/60
                                        bg-green-900/20 p-4 text-sm">
                            <div className="flex items-center gap-2 text-green-400 font-medium">
                                <span className="w-2 h-2 rounded-full bg-green-400" />
                                Document ready
                            </div>
                            <p className="mt-2 text-gray-300 break-all">{fileName}</p>
                            <p className="mt-1 text-xs text-gray-500 font-mono break-all">
                                docId: {docId.slice(0, 8)}…
                            </p>
                        </div>
                    )}
                </aside>

                {/* RIGHT: chat (key resets history on new upload) */}
                <section className="overflow-hidden">
                    <Chat key={docId ?? 'empty'} docId={docId} />
                </section>
            </div>
        </main>
    );
}