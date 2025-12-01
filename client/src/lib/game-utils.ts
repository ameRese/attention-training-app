export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GameSettings {
  duration: number; // seconds
  difficulty: Difficulty;
  volume: number; // 0 to 1
}

export interface DifficultyConfig {
  spawnInterval: number;
  targetSize: number;
  decayTime: number;
  distractorChance: number; // 0 to 1, probability of spawning a distractor
}

export interface HighScore {
  date: string; // YYYY-MM-DD
  score: number;
  difficulty: Difficulty;
}

export const DEFAULT_SETTINGS: GameSettings = {
  duration: 60,
  difficulty: 'normal',
  volume: 0.5,
};

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { spawnInterval: 2000, targetSize: 120, decayTime: 3000, distractorChance: 0 },
  normal: { spawnInterval: 1000, targetSize: 100, decayTime: 2000, distractorChance: 0.3 },
  hard: { spawnInterval: 600, targetSize: 80, decayTime: 1200, distractorChance: 0.5 },
};

const STORAGE_KEY = 'attention-app-highscores';

export function getDailyHighScore(difficulty: Difficulty): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return 0;
    
    const scores: HighScore[] = JSON.parse(stored);
    const today = new Date().toISOString().split('T')[0];
    
    const todayScore = scores.find(
      (s) => s.date === today && s.difficulty === difficulty
    );
    
    return todayScore ? todayScore.score : 0;
  } catch (e) {
    console.error('Failed to load high scores', e);
    return 0;
  }
}

export function saveScore(score: number, difficulty: Difficulty) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let scores: HighScore[] = stored ? JSON.parse(stored) : [];
    const today = new Date().toISOString().split('T')[0];
    
    const existingIndex = scores.findIndex(
      (s) => s.date === today && s.difficulty === difficulty
    );
    
    if (existingIndex >= 0) {
      if (score > scores[existingIndex].score) {
        scores[existingIndex].score = score;
      }
    } else {
      scores.push({ date: today, score, difficulty });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch (e) {
    console.error('Failed to save high score', e);
  }
}
