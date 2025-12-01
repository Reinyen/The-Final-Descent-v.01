import { useState } from 'react';
import IntroScreen from './IntroScreen';

/**
 * Main App Component
 *
 * Entry point for "The Final Descent" game.
 * Displays the intro screen and handles navigation after completion.
 */
export default function App() {
  const [introComplete, setIntroComplete] = useState(false);

  const handleIntroComplete = () => {
    // Fade out intro
    setIntroComplete(true);

    // Future: Navigate to first game UI
    console.log('Intro complete - ready for game UI');
  };

  return (
    <div className="w-full h-full">
      {!introComplete ? (
        <IntroScreen onBegin={handleIntroComplete} />
      ) : (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <p className="text-white font-rajdhani text-2xl">
            Game UI Coming Soon...
          </p>
        </div>
      )}
    </div>
  );
}
