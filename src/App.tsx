import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { PrompterView } from './components/PrompterView';
import { LandingPage } from './components/LandingPage';
import { LegalPage } from './components/LegalPage';
import { DinoToothGame } from './components/DinoToothGame';

type Mode = 'landing' | 'editor' | 'prompter' | 'about' | 'privacy' | 'dino-game';

function getInitialMode(): Mode {
  if (typeof window !== 'undefined' && window.location.hash === '#dino-game') {
    return 'dino-game';
  }
  return 'landing';
}

export default function App() {
  const [mode, setMode] = useState<Mode>(getInitialMode);
  const [script, setScript] = useState('');

  return (
    <>
      {mode === 'dino-game' && <DinoToothGame />}
      {mode === 'landing' && (
        <LandingPage 
          onStart={() => setMode('editor')} 
          onNavigate={(page) => setMode(page)} 
        />
      )}
      {(mode === 'about' || mode === 'privacy') && (
        <LegalPage page={mode} onBack={() => setMode('landing')} />
      )}
      {mode === 'editor' && (
        <Dashboard
          script={script}
          setScript={setScript}
          onStart={() => setMode('prompter')}
          onHome={() => setMode('landing')}
        />
      )}
      {mode === 'prompter' && (
         <PrompterView
           script={script}
           onClose={() => setMode('editor')}
         />
      )}
    </>
  );
}
