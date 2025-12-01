import { useCallback, useRef, useEffect } from 'react';

// Simple synthesizer for sound effects to avoid external assets dependency
// and ensure immediate playback without loading
export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on user interaction (handled by browser policy)
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    return () => document.removeEventListener('click', initAudio);
  }, []);

  const playTone = useCallback((frequency: number, type: OscillatorType, duration: number, volume: number) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  const playSuccess = useCallback((volume: number) => {
    // High pitched pleasant "ding"
    playTone(880, 'sine', 0.1, volume); // A5
    setTimeout(() => playTone(1760, 'sine', 0.3, volume * 0.8), 50); // A6
  }, [playTone]);

  const playMiss = useCallback((volume: number) => {
    // Low pitched dull "thud"
    playTone(150, 'triangle', 0.2, volume * 0.8);
  }, [playTone]);

  return { playSuccess, playMiss };
}
