export interface Team {
  id: string;
  name: string;
  school: string;
  category: 'SMA' | 'SMK';
  color: string;
  totalScore: number;
  hasPlayed: boolean;
  isEliminatedFromWheel: boolean; // Once spun, removed from spinwheel
}

export type ScreenMode = 'welcome' | 'spin' | 'match' | 'leaderboard';

export interface ScoreLogItem {
  id: string;
  timestamp: string;
  sessionNumber: number;
  sessionTitle?: string;
  teamId: string;
  teamName: string;
  school: string;
  action: string;
  pointsDelta: number;
  scoreAfter: number;
}

export interface SpinData {
  targetTeamId: string;
  slot: 'A' | 'B';
  targetAngle: number;
  duration: number;
  startTime: number;
}

export interface MatchState {
  sessionNumber: number;
  sessionTitle: string;
  teamAId: string | null;
  teamBId: string | null;
  teamAScore: number;
  teamBScore: number;
  activeAnsweringTeam: 'A' | 'B' | null;

  // Custom Points Rules
  correctPoints: number; // Nilai jika benar (default: 10)
  wrongPoints: number;   // Nilai jika salah (default: 0, bisa negatif misal -5/-10)

  // Timer State
  timerSeconds: number;
  timerTotal: number;
  timerRunning: boolean;
  timerLastUpdated: number;

  // LCD & Display Mode
  screenMode: ScreenMode;
  questionNumber: number;

  // Spin Wheel State
  spinWinnerId: string | null;
  isSpinning: boolean;
  wheelCandidateSlot: 'A' | 'B' | null; // Is current spin for Team A or Team B?
  spinData: SpinData | null; // Synchronized spin physics & angle data

  // Last action for live notifications & sound trigger
  lastAction: {
    type: 'BENAR' | 'SALAH' | 'TIMER_START' | 'TIMER_TIMEOUT' | 'SPIN_START' | 'SPIN_RESULT' | 'RESET';
    team: 'A' | 'B' | null;
    points: number;
    timestamp: number;
  } | null;
}

export interface AppState {
  teams: Team[];
  match: MatchState;
  scoreLogs: ScoreLogItem[];
  settings: {
    roomCode: string;
    defaultTimerSeconds: number;
    soundEnabled: boolean;
    googleSheetsWebhookUrl: string;
  };
}

export type SyncAction =
  | { type: 'FULL_STATE_SYNC'; payload: AppState }
  | { type: 'UPDATE_MATCH'; payload: Partial<MatchState> }
  | { type: 'SET_SCREEN_MODE'; payload: ScreenMode }
  | { type: 'SET_SESSION'; payload: { sessionNumber: number; sessionTitle?: string } }
  | { type: 'SET_POINT_RULES'; payload: { correctPoints: number; wrongPoints: number } }
  | { type: 'SET_EXACT_SCORE'; payload: { team: 'A' | 'B'; score: number } }
  | { type: 'SET_CUSTOM_TIMER'; payload: { seconds: number; setAsDefault?: boolean } }
  | { type: 'ADJUST_TIMER_REMAINING'; payload: { deltaSeconds: number } }
  | { type: 'SELECT_TEAMS_FOR_MATCH'; payload: { teamAId: string; teamBId: string } }
  | { type: 'SPIN_START'; payload: SpinData }
  | { type: 'SPIN_RESULT'; payload: { teamId: string; slot: 'A' | 'B' } }
  | { type: 'RESET_SPIN_WINNER' }
  | { type: 'RECORD_SCORE'; payload: { team: 'A' | 'B'; isCorrect: boolean; pointsDelta?: number } }
  | { type: 'ADJUST_SCORE'; payload: { team: 'A' | 'B'; delta: number } }
  | { type: 'START_TIMER'; payload?: { team?: 'A' | 'B'; seconds?: number } }
  | { type: 'PAUSE_TIMER' }
  | { type: 'RESET_TIMER'; payload?: { seconds?: number } }
  | { type: 'FINISH_MATCH_SESSION' }
  | { type: 'UPDATE_TEAMS'; payload: Team[] }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> }
  | { type: 'TRIGGER_SOUND'; payload: 'benar' | 'salah' | 'tick' | 'timeout' | 'spin' | 'fanfare' };
