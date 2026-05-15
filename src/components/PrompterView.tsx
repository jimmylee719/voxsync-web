import React, { useEffect, useRef, useState } from 'react';
import { useSpeechSync } from '../lib/useSpeechSync';
import { Play, Pause, RotateCcw, X, Settings2, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  script: string;
  onClose: () => void;
}

export function PrompterView({ script, onClose }: Props) {
  const {
    segments,
    activeSegmentIndex,
    matchedLength,
    isListening,
    speechActive,
    error,
    start,
    stop,
    reset,
    setActiveSegmentIndex
  } = useSpeechSync(script);

  const [fontSize, setFontSize] = useState(64);
  const [mirrored, setMirrored] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const listRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const activeEl = segmentRefs.current[activeSegmentIndex];
    const container = listRef.current;
    if (activeEl && container) {
      // Use setTimeout to ensure DOM is fully updated
      setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        const elRect = activeEl.getBoundingClientRect();
        
        const elTopRelativeToContainer = elRect.top - containerRect.top;
        
        // Calculate progress within current segment
        const segmentText = segments[activeSegmentIndex] || '';
        let currentSegLen = segmentText.replace(/[^\p{L}\p{N}]+/gu, '').length;
        if (currentSegLen === 0) currentSegLen = 1;
        const progress = Math.min(1, Math.max(0, matchedLength / currentSegLen));
        
        // Target base position: ~25% from the top of the container
        let targetScroll = container.scrollTop + elTopRelativeToContainer - (container.clientHeight * 0.25);
        
        // Add proportional scroll if the element is tall (multiline)
        if (elRect.height > 60) { // arbitrary threshold for > 1 line
             targetScroll += progress * elRect.height * 0.7; // scroll down gradually, up to 70% of the block height
        }
        
        container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
      }, 20);
    }
  }, [activeSegmentIndex, matchedLength, segments]);

  if (segments.length === 0) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] text-gray-200 flex items-center justify-center p-8 text-center flex-col gap-4 z-50 font-sans">
         <p className="text-2xl">沒有偵測到講稿內容，請先輸入講稿。</p>
         <button onClick={onClose} className="px-6 py-3 bg-white text-black rounded-lg font-bold">返回編輯</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-gray-200 flex flex-col overflow-hidden z-50 font-sans">
      <nav className={`h-16 border-b border-gray-800 flex items-center justify-between px-4 sm:px-8 bg-[#0f0f0f] z-20 transition-opacity duration-500 ${isListening && speechActive ? 'opacity-20 hover:opacity-100' : 'opacity-100'}`}>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition" aria-label="Close">
            <X size={24} />
          </button>
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center hidden sm:flex">
            <div className="w-4 h-4 bg-[#0a0a0a] rounded-sm"></div>
          </div>
          <span className="text-xl font-bold tracking-tight text-white hidden sm:block">VoxSync</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
           {isListening && (
            <div className="hidden md:flex items-center gap-2 mr-4">
              <div className={`w-2 h-2 rounded-full ${speechActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
              <span className={`text-[10px] uppercase tracking-widest ${speechActive ? 'text-green-400' : 'text-gray-500'}`}>
                  {speechActive ? 'Voice Detected' : 'Awaiting Input'}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-1 sm:gap-2">
             <button onClick={isListening ? stop : start} className={`flex items-center gap-2 px-3 sm:px-6 py-2 rounded-lg font-bold text-sm transition ${isListening ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-black'}`}>
               {isListening ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
               <span className="hidden sm:inline">{isListening ? 'Pause Sync' : 'Start Sync'}</span>
             </button>
             <button onClick={reset} className="p-2 text-gray-400 hover:text-white transition" aria-label="Reset position">
               <RotateCcw size={20} />
             </button>
          </div>
          
           <div className="relative">
             <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded transition ${showSettings ? 'text-amber-500' : 'text-gray-400 hover:text-white'}`}>
              <Settings2 size={20} />
            </button>
            
            {showSettings && (
               <div className="absolute top-12 right-0 bg-[#0f0f0f] border border-gray-800 rounded-xl p-5 shadow-2xl z-30 flex flex-col gap-6 w-72">
                  <div>
                     <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 block flex justify-between">
                         <span>Font Size</span>
                         <span className="text-white font-mono">{fontSize}px</span>
                     </label>
                     <div className="flex items-center gap-3">
                       <button onClick={() => setFontSize(f => Math.max(32, f - 8))} className="p-3 bg-gray-900 border border-gray-800 rounded text-gray-400 hover:text-white"><ChevronDown size={20}/></button>
                       <input type="range" min="32" max="160" step="8" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="flex-1 accent-amber-500 h-2 bg-gray-800 rounded-lg appearance-none" />
                       <button onClick={() => setFontSize(f => Math.min(160, f + 8))} className="p-3 bg-gray-900 border border-gray-800 rounded text-gray-400 hover:text-white"><ChevronUp size={20}/></button>
                     </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-800 pt-4">
                     <label className="text-[10px] uppercase tracking-widest text-gray-500 select-none cursor-pointer" htmlFor="mirror-toggle">Teleprompter Mirror</label>
                     <button 
                       id="mirror-toggle"
                       onClick={() => setMirrored(!mirrored)} 
                       className={`w-10 h-5 flex items-center rounded-full px-1 transition-colors ${mirrored ? 'bg-amber-500' : 'bg-gray-800'}`}
                     >
                       <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${mirrored ? 'translate-x-5' : 'translate-x-0'}`} />
                     </button>
                  </div>
               </div>
            )}
          </div>
        </div>
      </nav>

      {error && (
         <div className="bg-red-900/30 text-red-200 px-6 py-2 border-b border-red-900/50 text-[10px] uppercase tracking-widest flex items-center justify-center font-bold">
           {error}
         </div>
      )}

      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative flex flex-col items-center justify-center px-4 sm:px-8 md:px-20">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none"></div>
          
          <div
            ref={listRef}
            className="w-full max-w-4xl h-full overflow-y-auto no-scrollbar pt-[20vh] pb-[60vh] scroll-smooth relative"
            style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
          >
              <div className="flex flex-col gap-8 py-8 items-start">
                {segments.map((segment, i) => {
                   const isActive = i === activeSegmentIndex;
                   const isPast = i < activeSegmentIndex;
                   // Different opacities based on distance from active
                   const distance = Math.abs(activeSegmentIndex - i);
                   
                   let textClass = "";
                   if (isActive) {
                     textClass = "text-white font-bold leading-relaxed";
                   } else if (isPast) {
                     textClass = "text-gray-700 font-bold leading-relaxed opacity-40";
                   } else if (distance === 1) {
                     textClass = "text-gray-500 font-bold leading-relaxed opacity-70";
                   } else if (distance === 2) {
                     textClass = "text-gray-600 font-bold leading-relaxed opacity-50";
                   } else {
                     textClass = "text-gray-700 font-bold leading-relaxed opacity-30";
                   }

                   let cleanIndex = 0;

                   return (
                     <div
                       key={i}
                       ref={el => segmentRefs.current[i] = el}
                       onClick={() => setActiveSegmentIndex(i)}
                       className={`relative transition-colors duration-500 cursor-pointer py-4 w-full`}
                       style={{ fontSize: `${fontSize}px`, wordBreak: 'break-word', lineHeight: 1.45 }}
                     >
                       {isActive && (
                         <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-8 h-[2px] bg-amber-500 hidden md:block"></div>
                       )}
                       <p className={textClass}>
                         {!isActive ? segment : (
                           Array.from(segment).map((char, charIdx) => {
                             const isClean = /[\p{L}\p{N}]/u.test(char);
                             if (isClean) {
                               cleanIndex++;
                             }
                             
                             const isMatched = isClean ? (cleanIndex <= matchedLength) : (cleanIndex <= matchedLength);
                             const isNextWord = isClean && cleanIndex > matchedLength && cleanIndex <= matchedLength + 2;
                             
                             let colorClass = "text-white opacity-90"; // unread default
                             if (isMatched) {
                               colorClass = "text-green-500 opacity-60"; // read words stay green but dim slightly
                             } else if (isNextWord) {
                               colorClass = "text-amber-400 font-bold drop-shadow-md scale-[1.05] inline-block"; // highlight the immediate next words to read
                             }
                             
                             return (
                               <span key={charIdx} className={`transition-all duration-300 ${colorClass}`}>
                                 {char}
                               </span>
                             );
                           })
                         )}
                       </p>
                       {isActive && (
                         <div className="absolute -right-12 top-1/2 -translate-y-1/2 w-8 h-[2px] bg-amber-500 hidden md:block"></div>
                       )}
                     </div>
                   );
                })}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
