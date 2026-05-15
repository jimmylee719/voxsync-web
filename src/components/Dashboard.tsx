import React, { useEffect, useRef } from 'react';
import { Play, Crown, Mic, FolderOpen, Upload } from 'lucide-react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface Props {
  script: string;
  setScript: (s: string) => void;
  onStart: () => void;
  onHome: () => void;
}

const DEFAULT_SCRIPT = "";

export function Dashboard({ script, setScript, onStart, onHome }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (extension === 'txt') {
        const text = await file.text();
        setScript(text);
      } else if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setScript(result.value);
      } else if (extension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          text += strings.join(' ') + '\n';
        }
        setScript(text);
      } else {
        alert('不支援的檔案格式，請上傳 txt, docx 或 pdf');
      }
    } catch (err) {
      console.error(err);
      alert('檔案解析失敗，請確認檔案格式是否正確。');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 pb-20 font-sans">
      <header className="bg-[#0f0f0f] border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={onHome}>
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-[#0a0a0a] rounded-sm"></div>
            </div>
            <h1 className="font-bold text-xl tracking-tight text-white hover:text-amber-500 transition-colors">VoxSync <span className="text-xs font-normal text-gray-500 ml-2 hidden sm:inline">v1.0.4-beta</span></h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
             <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition">
               <Crown size={14} />
               <span className="hidden sm:inline">Premium</span>
             </button>
             <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs text-white">
                JS
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-6 sm:mt-12 flex flex-col md:flex-row gap-6 sm:gap-8">
         <aside className="w-full md:w-64 flex flex-col gap-4 order-2 md:order-1">
            <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">My Scripts</h2>
            <button className="flex items-center gap-3 w-full text-left p-4 rounded-xl bg-gray-900 text-white font-medium border border-gray-800 shadow-sm">
               <FolderOpen size={18} className="text-amber-500" />
               <span className="text-sm">我的演講稿</span>
            </button>
            
            <div className="h-px w-full bg-gray-800 my-2"></div>
            
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 w-full text-left p-4 rounded-xl text-gray-400 hover:bg-gray-900/50 hover:text-amber-500 font-medium transition border border-transparent hover:border-gray-800">
               <Upload size={18} className="text-gray-600" />
               <span className="text-sm">上傳講稿 (PDF/Word/txt)</span>
            </button>
            <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileUpload} 
               accept=".txt,.docx,.pdf" 
               className="hidden" 
            />
         </aside>

         <div className="flex-1 flex flex-col rounded-xl bg-[#0f0f0f] border border-gray-800 overflow-hidden shadow-2xl relative order-1 md:order-2">
            <div className="border-b border-gray-800 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#0f0f0f]">
               <input
                 type="text"
                 defaultValue="目前講稿"
                 className="font-bold text-xl sm:text-lg bg-transparent text-white border-none outline-none focus:ring-2 focus:ring-amber-500 rounded px-2 w-full flex-1"
               />
               <button onClick={onStart} className="flex items-center justify-center gap-2 bg-amber-500 text-black px-6 py-3 sm:py-2.5 rounded-lg hover:bg-amber-400 shadow-amber-500/20 shadow-lg transition font-bold text-lg sm:text-sm w-full sm:w-auto">
                  <Play fill="currentColor" size={20} className="sm:w-4 sm:h-4" />
                  Start Prompter
               </button>
            </div>
            <textarea
               className="flex-1 min-h-[50vh] sm:min-h-[60vh] w-full p-5 sm:p-8 text-lg sm:text-xl outline-none resize-none leading-relaxed text-gray-300 bg-transparent placeholder-gray-700"
               placeholder="請在此輸入您的演講稿，或是上傳檔案..."
               value={script}
               onChange={(e) => setScript(e.target.value)}
            />
            <div className="bg-gray-900 border-t border-gray-800 p-4 text-[10px] uppercase tracking-widest text-gray-500 flex justify-between">
               <span>Last auto-saved just now</span>
               <span className="font-mono">{script.length} chars</span>
            </div>
         </div>
      </main>
    </div>
  );
}
