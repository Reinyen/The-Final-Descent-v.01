import { useEffect, useRef } from 'react';

interface IntroScreenProps {
  onBegin?: () => void;
  quality?: 'high' | 'low' | 'auto';
  debugMode?: boolean;
}

export default function IntroScreen({ onBegin }: IntroScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!containerRef.current || !buttonRef.current) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onBegin?.();
      }
    };

    const button = buttonRef.current;
    button.focus();

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onBegin]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-black text-white">
      <button
        ref={buttonRef}
        className="px-6 py-3 border border-white/60 bg-transparent tracking-[0.2em] font-semibold hover:scale-105 transition"
        onClick={() => onBegin?.()}
      >
        BEGIN THE DESCENT
      </button>
    </div>
  );
}
