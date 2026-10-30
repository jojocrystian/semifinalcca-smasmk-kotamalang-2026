import { AppState, Team } from '@/types/cca';

export const INITIAL_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: 'Tim Hua Ind',
    school: 'SMA Kolese Santo Yusup Malang',
    category: 'SMA',
    color: '#3B82F6', // Blue
    totalScore: 0,
    hasPlayed: false,
    isEliminatedFromWheel: false,
  },
  {
    id: 'team-2',
    name: 'Tim Dempo A',
    school: 'SMA Katolik Santo Albertus Malang',
    category: 'SMA',
    color: '#EF4444', // Red
    totalScore: 0,
    hasPlayed: false,
    isEliminatedFromWheel: false,
  },
  {
    id: 'team-3',
    name: 'Tim Cor Jesu',
    school: 'SMA Katolik Cor Jesu Malang',
    category: 'SMA',
    color: '#10B981', // Emerald
    totalScore: 0,
    hasPlayed: false,
    isEliminatedFromWheel: false,
  },
  {
    id: 'team-4',
    name: 'Tim Mitreka 1',
    school: 'SMAN 1 Kota Malang',
    category: 'SMA',
    color: '#F59E0B', // Amber
    totalScore: 0,
    hasPlayed: false,
    isEliminatedFromWheel: false,
  },
  {
    id: 'team-5',
    name: 'Tim Bhawikarsu',
    school: 'SMAN 3 Kota Malang',
    category: 'SMA',
    color: '#8B5CF6', // Purple
    totalScore: 0,
    hasPlayed: false,
    isEliminatedFromWheel: false,
  },
  {
    id: 'team-6',
    name: 'Tim Grafika Prima',
    school: 'SMKN 4 Kota Malang',
    category: 'SMK',
    color: '#06B6D4', // Cyan
    totalScore: 0,
    hasPlayed: false,
    isEliminatedFromWheel: false,
  },
  {
    id: 'team-7',
    name: 'Tim Petra Kasih',
    school: 'SMA Kristen Petra Malang',
    category: 'SMA',
    color: '#EC4899', // Pink
    totalScore: 0,
    hasPlayed: false,
    isEliminatedFromWheel: false,
  },
  {
    id: 'team-8',
    name: 'Tim Sanmar',
    school: 'SMA Katolik Santa Maria Malang',
    category: 'SMA',
    color: '#14B8A6', // Teal
    totalScore: 0,
    hasPlayed: false,
    isEliminatedFromWheel: false,
  },
  {
    id: 'team-9',
    name: 'Tim SMKN 1 Malang',
    school: 'SMKN 1 Kota Malang',
    category: 'SMK',
    color: '#F97316', // Orange
    totalScore: 0,
    hasPlayed: false,
    isEliminatedFromWheel: false,
  },
  {
    id: 'team-10',
    name: 'Tim SMAN 4 Malang',
    school: 'SMAN 4 Kota Malang',
    category: 'SMA',
    color: '#6366F1', // Indigo
    totalScore: 0,
    hasPlayed: false,
    isEliminatedFromWheel: false,
  },
];

export const INITIAL_APP_STATE: AppState = {
  teams: INITIAL_TEAMS,
  match: {
    sessionNumber: 1,
    sessionTitle: 'Babak Semifinal',
    teamAId: null,
    teamBId: null,
    teamAScore: 0,
    teamBScore: 0,
    activeAnsweringTeam: null,
    correctPoints: 10,
    wrongPoints: 0,
    timerSeconds: 15,
    timerTotal: 15,
    timerRunning: false,
    timerLastUpdated: Date.now(),
    screenMode: 'welcome',
    questionNumber: 1,
    spinWinnerId: null,
    isSpinning: false,
    wheelCandidateSlot: null,
    spinData: null,
    lastAction: null,
  },
  scoreLogs: [],
  settings: {
    roomCode: 'CCA-MALANG-2026',
    defaultTimerSeconds: 15,
    soundEnabled: true,
    googleSheetsWebhookUrl: '',
  },
};
