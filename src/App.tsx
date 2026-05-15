import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { PrompterView } from './components/PrompterView';
import { LandingPage } from './components/LandingPage';
import { LegalPage } from './components/LegalPage';

export default function App() {
  const [mode, setMode] = useState<'landing' | 'editor' | 'prompter' | 'about' | 'privacy'>('landing');
  const [script, setScript] = useState('');

  return (
    <>
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
