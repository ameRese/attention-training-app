import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GameSettings, DIFFICULTY_CONFIG, saveScore, getDailyHighScore, Difficulty } from '@/lib/game-utils';
import { Volume2, VolumeX, ArrowLeft, Play, RotateCcw, Settings, Info } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';

interface Target {
  id: number;
  x: number;
  y: number;
  createdAt: number;
  isDistractor: boolean;
}

export default function Game() {
  const [location, setLocation] = useLocation();
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('game-settings');
    return saved ? JSON.parse(saved) : { duration: 60, difficulty: 'normal', volume: 0.5, distractorEnabled: true };
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

  // Load high score when entering menu or changing settings
  useEffect(() => {
    if (gameState === 'menu') {
      setHighScore(getDailyHighScore(settings.difficulty, settings.distractorEnabled));
    }
  }, [gameState, settings.difficulty, settings.distractorEnabled]);

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
    saveScore(score, settings.difficulty, settings.distractorEnabled);
    setHighScore(getDailyHighScore(settings.difficulty, settings.distractorEnabled));
  }, [score, settings.difficulty, settings.distractorEnabled]);

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

    // Spawner Logic
    const spawnLogic = () => {
      if (!gameAreaRef.current) return;
      const { clientWidth, clientHeight } = gameAreaRef.current;
      const size = config.targetSize;
      const padding = 20;
      const hudHeight = 120; // Avoid top area where score/time is displayed

      setTargets(currentTargets => {
        const newTargetsToAdd: Target[] = [];
        const spawnCount = config.simultaneousSpawns;

        for (let i = 0; i < spawnCount; i++) {
          let x = 0;
          let y = 0;
          let attempts = 0;
          let validPosition = false;
          
          // Decide type first
          const isDistractor = settings.distractorEnabled && Math.random() < config.distractorChance;

          while (attempts < 15 && !validPosition) {
            x = Math.random() * (clientWidth - size - padding * 2) + padding;
            // Ensure y starts below HUD
            y = Math.random() * (clientHeight - size - padding * 2 - hudHeight) + padding + hudHeight;

            let hasOverlap = false;
            // Check against currently active targets
            const allTargets = [...currentTargets, ...newTargetsToAdd];
            
            for (const t of allTargets) {
              // Check overlap only if types are different
              if (t.isDistractor !== isDistractor) {
                const dx = t.x - x;
                const dy = t.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < size * 1.2) { // 1.2x size buffer for safety
                  hasOverlap = true;
                  break;
                }
              }
            }

            if (!hasOverlap) {
              validPosition = true;
              const newTarget: Target = {
                id: nextIdRef.current++,
                x,
                y,
                createdAt: Date.now(),
                isDistractor,
              };
              newTargetsToAdd.push(newTarget);
              
              // Schedule removal
              setTimeout(() => {
                setTargets(prev => prev.filter(t => t.id !== newTarget.id));
              }, config.decayTime);
            }
            attempts++;
          }
        }
        return [...currentTargets, ...newTargetsToAdd];
      });
    };

    spawnerRef.current = setInterval(spawnLogic, config.spawnInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnerRef.current) clearInterval(spawnerRef.current);
    };
  }, [gameState, settings.difficulty, settings.distractorEnabled, stopGame]);


  const handleTargetClick = (e: React.PointerEvent, id: number, isDistractor: boolean) => {
    e.stopPropagation();
    e.preventDefault(); 
    
    if (isDistractor) {
      playMiss(settings.volume);
      setScore((prev) => Math.max(0, prev - 50)); 
    } else {
      playSuccess(settings.volume);
      setScore((prev) => prev + 100);
    }
    
    // Immediate removal to prevent ghost colors
    setTargets((prev) => prev.filter((t) => t.id !== id));
  };

  const handleBackgroundClick = (e: React.PointerEvent) => {
    if (gameState === 'playing') {
      // Optional background click logic
    }
  };

  const getDifficultyLabel = (d: Difficulty) => {
    switch(d) {
      case 'easy': return 'かんたん';
      case 'normal': return 'ふつう';
      case 'hard': return 'むずかしい';
      case 'expert': return 'さいきょう';
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
          <p className="text-muted-foreground text-center mb-8">臨床リハビリテーションツール</p>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">難易度</label>
              <div className="grid grid-cols-4 gap-2">
                {(['easy', 'normal', 'hard', 'expert'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSettings({ ...settings, difficulty: d })}
                    className={cn(
                      "px-2 py-2 rounded-lg text-xs font-medium transition-all",
                      settings.difficulty === d
                        ? "bg-primary text-primary-foreground neu-pressed"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {getDifficultyLabel(d)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1 h-8">
                {settings.difficulty === 'easy' && 'ターゲットがゆっくり出現します。'}
                {settings.difficulty === 'normal' && '標準的な速度でターゲットが出現します。'}
                {settings.difficulty === 'hard' && 'ターゲットが素早く出現します。'}
                {settings.difficulty === 'expert' && 'ターゲットが同時に2つ出現します。両手での操作を推奨します。'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="distractor-mode" className="text-sm font-medium">お邪魔ターゲット</Label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSettings({ ...settings, distractorEnabled: !settings.distractorEnabled })}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all border",
                      settings.distractorEnabled
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-input hover:bg-accent"
                    )}
                  >
                    {settings.distractorEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">歯車型のターゲットが出現します</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">制限時間: {settings.duration}秒</label>
              <input
                type="range"
                min="30"
                max="300"
                step="30"
                value={settings.duration}
                onChange={(e) => setSettings({ ...settings, duration: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                {settings.volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
                音量: {Math.round(settings.volume * 100)}%
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
              <p className="text-sm text-muted-foreground mb-2">本日の最高スコア ({getDifficultyLabel(settings.difficulty)} / {settings.distractorEnabled ? 'お邪魔あり' : 'お邪魔なし'})</p>
              <p className="text-2xl font-bold text-primary">{highScore}</p>
            </div>

            <Button 
              onClick={startGame} 
              className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl"
            >
              スタート
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
        className="fixed inset-0 bg-background cursor-crosshair overflow-hidden select-none touch-none"
        onPointerDown={handleBackgroundClick}
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
            <p className="text-sm text-muted-foreground uppercase tracking-wider">スコア</p>
            <p className="text-3xl font-bold text-primary tabular-nums">{score}</p>
          </div>
          
          <div className="bg-card/80 backdrop-blur px-6 py-3 rounded-2xl neu-flat">
            <p className="text-sm text-muted-foreground uppercase tracking-wider">残り時間</p>
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
            onPointerDown={(e) => handleTargetClick(e, target.id, target.isDistractor)}
            className={cn(
              "absolute shadow-lg active:scale-95 transition-transform animate-in zoom-in duration-300 cursor-pointer z-10 flex items-center justify-center touch-none",
              target.isDistractor ? "rounded-md" : "rounded-full"
            )}
            style={{
              left: target.x,
              top: target.y,
              width: DIFFICULTY_CONFIG[settings.difficulty].targetSize,
              height: DIFFICULTY_CONFIG[settings.difficulty].targetSize,
              backgroundColor: 'var(--target)',
              boxShadow: '0 0 20px var(--target), inset 0 0 20px rgba(255,255,255,0.5)',
              // Gear shape for distractor using clip-path
              clipPath: target.isDistractor 
                ? 'polygon(50% 0%, 55% 10%, 65% 5%, 68% 15%, 78% 12%, 79% 23%, 88% 22%, 87% 33%, 95% 35%, 92% 45%, 98% 50%, 92% 55%, 95% 65%, 87% 67%, 88% 78%, 79% 77%, 78% 88%, 68% 85%, 65% 95%, 55% 90%, 50% 100%, 45% 90%, 35% 95%, 32% 85%, 22% 88%, 21% 77%, 12% 78%, 13% 67%, 5% 65%, 8% 55%, 2% 50%, 8% 45%, 5% 35%, 13% 33%, 12% 22%, 21% 23%, 22% 12%, 32% 15%, 35% 5%, 45% 10%)' // Jagged circle / Gear shape
                : undefined
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
        <h2 className="text-2xl font-bold text-primary mb-6">セッション終了</h2>
        
        <div className="mb-8 space-y-2">
          <p className="text-muted-foreground">最終スコア</p>
          <p className="text-5xl font-bold text-primary">{score}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-secondary/50 p-4 rounded-xl">
            <p className="text-xs text-muted-foreground uppercase">設定</p>
            <p className="font-semibold capitalize">
              {getDifficultyLabel(settings.difficulty)}
              <span className="block text-xs font-normal text-muted-foreground mt-1">
                {settings.distractorEnabled ? 'お邪魔あり' : 'お邪魔なし'}
              </span>
            </p>
          </div>
          <div className="bg-secondary/50 p-4 rounded-xl">
            <p className="text-xs text-muted-foreground uppercase">本日のベスト</p>
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
            メニュー
          </Button>
          <Button 
            className="flex-1 h-12 shadow-lg"
            onClick={startGame}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            もう一度
          </Button>
        </div>
      </Card>
    </div>
  );
}
