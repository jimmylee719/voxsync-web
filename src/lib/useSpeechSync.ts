import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export function useSpeechSync(script: string, language: string = 'zh-TW') {
  const [isListening, setIsListening] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [matchedLength, setMatchedLength] = useState(0);
  const [speechActive, setSpeechActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const activeIndexRef = useRef(0);
  const isListeningRef = useRef(false);
  const speechTimeoutRef = useRef<number | null>(null);
  const matchedLengthRef = useRef(0);

  // Split script into meaningful segments (sentences/phrases)
  const segments = useMemo(() => {
    return script
      .split(/([\n，。、！？.,?!；：;:]+)/)
      .reduce((acc: string[], curr, i, arr) => {
        if (i % 2 === 0) {
          let text = curr.trim();
          let punctuation = arr[i + 1] || '';
          if (text) acc.push(text + punctuation.trim());
        }
        return acc;
      }, [])
      .filter((s) => s.length > 0);
  }, [script]);

  useEffect(() => {
    activeIndexRef.current = activeSegmentIndex;
    matchedLengthRef.current = 0;
    setMatchedLength(0);
  }, [activeSegmentIndex]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Auto-advance if speech pauses and we are almost at the end of the line
  useEffect(() => {
    if (!speechActive && isListening) {
      const currentSegment = segments[activeSegmentIndex];
      if (currentSegment) {
        const cleanedCurrentStr = currentSegment.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
        const currentSegLen = cleanedCurrentStr.length;
        const charsLeft = currentSegLen - matchedLength;
        
        const reqLeft = cleanedCurrentStr.match(/[\u4e00-\u9fa5]/) ? 2 : 5;
        // If we stopped speaking and we are very close to the end (e.g. they dropped trailing punctuation/syllable)
        if (charsLeft > 0 && charsLeft <= reqLeft && currentSegLen >= 5) {
          if (activeSegmentIndex < segments.length - 1) {
            setActiveSegmentIndex(activeSegmentIndex + 1);
          }
        }
      }
    }
  }, [speechActive, isListening, matchedLength, activeSegmentIndex, segments]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('您當前的瀏覽器不支援語音辨識功能，請使用 Chrome、Edge 或 Safari。');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setError(null);
    };

    recognition.onresult = (event: any) => {
      setSpeechActive(true);
      if (speechTimeoutRef.current) window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = window.setTimeout(() => {
        setSpeechActive(false);
      }, 1500) as unknown as number;

      let recentText = '';
      // Keep up to 10 recent results to ensure we have enough context for long phrases
      const startIndex = Math.max(0, event.results.length - 10);
      for (let i = startIndex; i < event.results.length; ++i) {
        recentText += event.results[i][0].transcript;
      }

      const cleanText = (str: string) => str.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
      
      const cleanRecentFull = cleanText(recentText);
      // Keep the last 100 characters of speech for matching active/next segments
      const cleanRecent = cleanRecentFull.slice(-100);

      // Check to partially highlight current segment
      const currentSegment = segments[activeIndexRef.current];
      let currentSegLen = 0;
      let bestMatchEnd = matchedLengthRef.current;
      
      if (currentSegment) {
        const cleanedCurrentStr = cleanText(currentSegment);
        currentSegLen = cleanedCurrentStr.length;
        let chunkFromTranscript = cleanRecent.slice(-30);
        
        let madeProgress = true;
        let maxSkipAllowed = language.includes('zh') ? 15 : 30; // Allow larger chunks to be skipped
        
        while (madeProgress && bestMatchEnd < currentSegLen) {
            madeProgress = false;
            
            for (let skip = 0; skip <= maxSkipAllowed; skip++) {
                if (bestMatchEnd + skip >= currentSegLen) break;

                let maxTryLen = Math.min(10, currentSegLen - (bestMatchEnd + skip));
                let minReqLen = language.includes('zh') ? 1 : 2; 

                for (let len = maxTryLen; len >= minReqLen; len--) {
                     let reqLen = len;
                     // The more we skip, the stronger the match required
                     if (skip > 0) reqLen = language.includes('zh') ? 2 : 3;
                     if (skip > 5) reqLen = language.includes('zh') ? 3 : 5;
                     if (skip > 10) reqLen = language.includes('zh') ? 4 : 7;

                     if (len < reqLen) continue;

                     let target = cleanedCurrentStr.substring(bestMatchEnd + skip, bestMatchEnd + skip + len);
                     let idx = chunkFromTranscript.lastIndexOf(target);

                     // Must be recently spoken
                     if (idx !== -1 && idx >= chunkFromTranscript.length - 30) {
                          bestMatchEnd += skip + len;
                          madeProgress = true;
                          break;
                     }
                }
                if (madeProgress) break;
            }
        }
        
        if (bestMatchEnd > matchedLengthRef.current) {
          matchedLengthRef.current = bestMatchEnd;
        }
      }

      // ----- Check to move to next segments -----
      let newActiveIndex = activeIndexRef.current;
      let chunkForNext = cleanRecent.slice(-40);
      let matchFound = false;
      
      // Look ahead up to 3 segments to allow skipping text, but with strict matching
      let maxLookaround = Math.min(activeIndexRef.current + 3, segments.length - 1);
      
      for (let checkIndex = activeIndexRef.current + 1; checkIndex <= maxLookaround; checkIndex++) {
          const checkSegmentClean = cleanText(segments[checkIndex]);
          
          if (checkSegmentClean.length > 0) {
              let charsLeftInCurrent = currentSegLen - matchedLengthRef.current;
              let pctDone = currentSegLen === 0 ? 1 : matchedLengthRef.current / currentSegLen;
              
              let reqMatchLen = language.includes('zh') ? 2 : 4;
              
              if (checkIndex === activeIndexRef.current + 1) {
                  if (charsLeftInCurrent <= 4 || pctDone >= 0.85) {
                      reqMatchLen = language.includes('zh') ? 3 : 5;
                  } else if (pctDone >= 0.5) {
                      reqMatchLen = language.includes('zh') ? 6 : 9;
                  } else {
                      reqMatchLen = language.includes('zh') ? 10 : 15;
                  }
              } else {
                  // If we are skipping entire segments, require a stronger match
                  reqMatchLen = language.includes('zh') ? 8 + (checkIndex - activeIndexRef.current) * 2 : 12 + (checkIndex - activeIndexRef.current) * 3;
              }
              
              reqMatchLen = Math.min(reqMatchLen, checkSegmentClean.length);
              
              // Only allow skipping the first few characters of the upcoming segment, not 20!
              // Because if they are truly reading this segment, they will start near the beginning.
              let maxNextSkip = Math.min(8, checkSegmentClean.length - reqMatchLen);
              
              for (let skip = 0; skip <= maxNextSkip; skip++) {
                  let target = checkSegmentClean.substring(skip, skip + reqMatchLen);
                  if (target.length === 0) continue;

                  let idx = chunkForNext.lastIndexOf(target);
                  
                  if (idx !== -1 && idx >= chunkForNext.length - 30) {
                      matchFound = true;
                      newActiveIndex = checkIndex;
                      break;
                  }
              }
              if (matchFound) break;
          }
      }
      
      // Auto-advance if we perfectly finished the current segment and there is a next one
      if (!matchFound && newActiveIndex === activeIndexRef.current) {
          if (matchedLengthRef.current >= currentSegLen && currentSegLen > 0) {
              if (activeIndexRef.current < segments.length - 1) {
                  newActiveIndex = activeIndexRef.current + 1;
              }
          }
      }
      
      if (newActiveIndex > activeIndexRef.current) {
          activeIndexRef.current = newActiveIndex;
          matchedLengthRef.current = 0;
          setActiveSegmentIndex(newActiveIndex);
          setMatchedLength(0);
      } else if (bestMatchEnd > matchedLength) {
          // ensure matchedLength state is updated if we stayed on same segment
          setMatchedLength(bestMatchEnd);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') return;
      console.warn('Speech recognition error/warning', event);
      if (event.error === 'not-allowed') {
         setError('麥克風權限被拒絕，請允許麥克風存取以便自動追蹤演講。');
         setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we are supposed to be continuously listening
      if (isListeningRef.current) {
        setTimeout(() => {
          try {
            if (isListeningRef.current) recognitionRef.current?.start();
          } catch (e) {}
        }, 300);
      } else {
        setSpeechActive(false);
      }
    };

    recognitionRef.current = recognition;

    // Watchdog to ensure speech recognition stays alive if it dies silently
    const watchdog = setInterval(() => {
        if (isListeningRef.current) {
            try {
                recognitionRef.current?.start();
            } catch (e) {
                // Ignore DOMException if already started
            }
        }
    }, 3000);

    return () => {
      clearInterval(watchdog);
      recognition.stop();
      if (speechTimeoutRef.current) window.clearTimeout(speechTimeoutRef.current);
    };
  }, [language, segments]);

  const start = useCallback(() => {
    setIsListening(true);
    setError(null);
    try {
      recognitionRef.current?.start();
    } catch (e) {}
  }, []);

  const stop = useCallback(() => {
    setIsListening(false);
    setSpeechActive(false);
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setActiveSegmentIndex(0);
    setMatchedLength(0);
    matchedLengthRef.current = 0;
  }, []);

  const nextSegment = () => setActiveSegmentIndex(p => Math.min(segments.length - 1, p + 1));
  const prevSegment = () => setActiveSegmentIndex(p => Math.max(0, p - 1));

  return {
    segments,
    activeSegmentIndex,
    matchedLength, 
    isListening,
    speechActive,
    error,
    start,
    stop,
    reset,
    nextSegment,
    prevSegment,
    setActiveSegmentIndex
  };
}
