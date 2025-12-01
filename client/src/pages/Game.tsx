import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GameSettings, DIFFICULTY_CONFIG, saveScore, getDailyHighScore } from '@/lib/game-utils';
import { Volume2, VolumeX, ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';



interface Target {
  id: number;
  x: number;
  y: number;
  createdAt: number;
}

export default function Game() {
  const [location, setLocation] = useLocation();
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('game-settings');
    return saved ? JSON.parse(saved) : { duration: 60, difficulty: 'normal', volume: 0.5 };
  });

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'finished'>('menu');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(settings.duration);
  const [targets, setTargets] = useState<Target[]>([]);
  const [highScore, setHighScore] = useState(0);
  const { playSuccess, playMiss } = useSound();
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spawnerRef = useRef<NodeJS.Timeout | null>(null);
  const nextIdRef = useRef(0);

  // Load high score when entering menu
  useEffect(() => {
    if (gameState === 'menu') {
      setHighScore(getDailyHighScore(settings.difficulty));
    }
  }, [gameState, settings.difficulty]);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('game-settings', JSON.stringify(settings));
  }, [settings]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(settings.duration);
    setTargets([]);
    setGameState('playing');
    nextIdRef.current = 0;
  };

  const stopGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnerRef.current) clearInterval(spawnerRef.current);
    setGameState('finished');
    saveScore(score, settings.difficulty);
    setHighScore(getDailyHighScore(settings.difficulty));
  }, [score, settings.difficulty]);

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const config = DIFFICULTY_CONFIG[settings.difficulty];

    // Timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Spawner
    spawnerRef.current = setInterval(() => {
      if (!gameAreaRef.current) return;
      
      const { clientWidth, clientHeight } = gameAreaRef.current;
      const size = config.targetSize;
      const padding = 20;
      
      const x = Math.random() * (clientWidth - size - padding * 2) + padding;
      const y = Math.random() * (clientHeight - size - padding * 2) + padding;

      const newTarget: Target = {
        id: nextIdRef.current++,
        x,
        y,
        createdAt: Date.now(),
      };

      setTargets((prev) => [...prev, newTarget]);

      // Auto-remove after decay time (missed)
      setTimeout(() => {
        setTargets((prev) => prev.filter((t) => t.id !== newTarget.id));
      }, config.decayTime);

    }, config.spawnInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnerRef.current) clearInterval(spawnerRef.current);
    };
  }, [gameState, settings.difficulty, stopGame]);

  const handleTargetClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    playSuccess(settings.volume);
    setScore((prev) => prev + 100);
    setTargets((prev) => prev.filter((t) => t.id !== id));
  };

  const handleBackgroundClick = () => {
    if (gameState === 'playing') {
      playMiss(settings.volume);
      // Optional: Penalty for miss clicking?
    }
  };

  // Render Menu
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* Background Image Layer */}
        <div 
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage: 'url(/images/hero-background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        <Card className="w-full max-w-md p-8 z-10 neu-flat bg-card/90 backdrop-blur-sm border-none">
          <h1 className="text-3xl font-bold text-primary mb-2 text-center">Attention Training</h1>
          <p className="text-muted-foreground text-center mb-8">Clinical Rehabilitation Tool</p>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'normal', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSettings({ ...settings, difficulty: d })}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      settings.difficulty === d
                        ? "bg-primary text-primary-foreground neu-pressed"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Duration: {settings.duration}s</label>
              <input
                type="range"
                min="30"
                max="180"
                step="30"
                value={settings.duration}
                onChange={(e) => setSettings({ ...settings, duration: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                {settings.volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
                Volume: {Math.round(settings.volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => setSettings({ ...settings, volume: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <div className="pt-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">Today's Best ({settings.difficulty})</p>
              <p className="text-2xl font-bold text-primary">{highScore}</p>
            </div>

            <Button 
              onClick={startGame} 
              className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Start Session
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Render Game
  if (gameState === 'playing') {
    return (
      <div 
        className="fixed inset-0 bg-background cursor-crosshair overflow-hidden select-none"
        onClick={handleBackgroundClick}
        ref={gameAreaRef}
      >
        {/* Game Background */}
        <div 
          className="absolute inset-0 z-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'url(/images/game-background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* HUD */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
          <div className="bg-card/80 backdrop-blur px-6 py-3 rounded-2xl neu-flat">
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Score</p>
            <p className="text-3xl font-bold text-primary tabular-nums">{score}</p>
          </div>
          
          <div className="bg-card/80 backdrop-blur px-6 py-3 rounded-2xl neu-flat">
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Time</p>
            <p className={cn(
              "text-3xl font-bold tabular-nums",
              timeLeft <= 10 ? "text-destructive animate-pulse" : "text-primary"
            )}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </p>
          </div>
        </div>

        {/* Targets */}
        {targets.map((target) => (
          <button
            key={target.id}
            onClick={(e) => handleTargetClick(e, target.id)}
            className="absolute rounded-full shadow-lg active:scale-95 transition-transform animate-in zoom-in duration-300 cursor-pointer z-10"
            style={{
              left: target.x,
              top: target.y,
              width: DIFFICULTY_CONFIG[settings.difficulty].targetSize,
              height: DIFFICULTY_CONFIG[settings.difficulty].targetSize,
              backgroundColor: 'var(--target)',
              boxShadow: '0 0 20px var(--target), inset 0 0 20px rgba(255,255,255,0.5)',
            }}
          />
        ))}
      </div>
    );
  }

  // Render Results
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
       <div 
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage: 'url(/images/result-background.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

      <Card className="w-full max-w-md p-8 z-10 neu-flat bg-card/90 backdrop-blur-sm border-none text-center">
        <h2 className="text-2xl font-bold text-primary mb-6">Session Complete</h2>
        
        <div className="mb-8 space-y-2">
          <p className="text-muted-foreground">Final Score</p>
          <p className="text-5xl font-bold text-primary">{score}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-secondary/50 p-4 rounded-xl">
            <p className="text-xs text-muted-foreground uppercase">Difficulty</p>
            <p className="font-semibold capitalize">{settings.difficulty}</p>
          </div>
          <div className="bg-secondary/50 p-4 rounded-xl">
            <p className="text-xs text-muted-foreground uppercase">Daily Best</p>
            <p className="font-semibold">{Math.max(score, highScore)}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1 h-12"
            onClick={() => setGameState('menu')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Menu
          </Button>
          <Button 
            className="flex-1 h-12 shadow-lg"
            onClick={startGame}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </Card>
    </div>
  );
}
