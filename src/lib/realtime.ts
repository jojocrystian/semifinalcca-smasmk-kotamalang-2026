import { AppState, SyncAction, ScoreLogItem } from '@/types/cca';
import { INITIAL_APP_STATE } from './initialData';

const STORAGE_KEY = 'cca_semifinal_state_v2';
const BROADCAST_CHANNEL_NAME = 'cca_realtime_channel';

type StateListener = (state: AppState) => void;
type ConnectionListener = (status: {
  isPeerConnected: boolean;
  activeClientsCount: number;
  lastSyncSource: string;
}) => void;

class RealtimeManager {
  private state: AppState = INITIAL_APP_STATE;
  private stateListeners: Set<StateListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private peer: unknown = null;
  private peerConnections: Map<string, unknown> = new Map();
  private isHost: boolean = false;
  private isPeerConnected: boolean = false;
  private lastSyncSource: string = 'Local';
  private pollingInterval: NodeJS.Timeout | null = null;
  private role: 'admin' | 'juri' | 'lcd' | 'viewer' = 'viewer';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initLocalStorage();
      this.initBroadcastChannel();
      this.initStorageListener();
    }
  }

  private initLocalStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = {
          ...INITIAL_APP_STATE,
          ...parsed,
          match: {
            ...INITIAL_APP_STATE.match,
            ...(parsed.match || {}),
            // Ensure timer isn't stuck running across page loads
            timerRunning: false,
          },
        };
      }
    } catch (e) {
      console.warn('Failed to load CCA state from localStorage:', e);
    }
  }

  private initBroadcastChannel() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'BROADCAST_ACTION') {
          this.handleIncomingAction(event.data.action, 'Local BroadcastChannel');
        } else if (event.data?.type === 'BROADCAST_FULL_STATE') {
          this.updateLocalState(event.data.state, 'Local BroadcastChannel');
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }
  }

  private initStorageListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          this.updateLocalState(parsed, 'LocalStorage Sync');
        } catch {
          // ignore parsing error
        }
      }
    });
  }

  public getState(): AppState {
    return this.state;
  }

  public subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeConnection(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener({
      isPeerConnected: this.isPeerConnected,
      activeClientsCount: this.peerConnections.size,
      lastSyncSource: this.lastSyncSource,
    });
    return () => this.connectionListeners.delete(listener);
  }

  private notifyState() {
    this.stateListeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('State listener error:', err);
      }
    });
  }

  private notifyConnection() {
    this.connectionListeners.forEach((listener) => {
      try {
        listener({
          isPeerConnected: this.isPeerConnected,
          activeClientsCount: this.peerConnections.size,
          lastSyncSource: this.lastSyncSource,
        });
      } catch (err) {
        console.error('Connection listener error:', err);
      }
    });
  }

  private saveToLocalStorage(state: AppState) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  // Initialize WebRTC Peer connection
  public async initPeer(role: 'admin' | 'juri' | 'lcd' | 'viewer', customRoomCode?: string) {
    this.role = role;
    if (typeof window === 'undefined') return;

    const room = (customRoomCode || this.state.settings.roomCode || 'CCA-MALANG-2026')
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');

    try {
      const { default: Peer } = await import('peerjs');
      const hostPeerId = `cca-host-${room}`;
      const myPeerId =
        role === 'admin'
          ? hostPeerId
          : `cca-${role}-${room}-${Math.random().toString(36).substring(2, 7)}`;

      if (this.peer) {
        (this.peer as { destroy: () => void }).destroy();
      }

      const peerInstance = new Peer(myPeerId, {
        debug: 1,
      });

      this.peer = peerInstance;

      peerInstance.on('open', (id: string) => {
        this.isPeerConnected = true;
        this.lastSyncSource = `Peer Online (${id})`;
        this.notifyConnection();

        if (role === 'admin') {
          this.isHost = true;
        } else {
          // Connect to admin host
          this.connectToHost(peerInstance, hostPeerId);
        }
      });

      peerInstance.on('connection', (conn: unknown) => {
        const c = conn as {
          peer: string;
          on: (event: string, fn: (data?: unknown) => void) => void;
          send: (data: unknown) => void;
        };

        c.on('open', () => {
          this.peerConnections.set(c.peer, c);
          this.notifyConnection();
          // If we are admin host, send current state to the newcomer
          if (role === 'admin') {
            c.send({
              type: 'FULL_STATE_SYNC',
              payload: this.state,
            });
          }
        });

        c.on('data', (data: unknown) => {
          this.handleIncomingPeerData(data);
        });

        c.on('close', () => {
          this.peerConnections.delete(c.peer);
          this.notifyConnection();
        });
      });

      peerInstance.on('error', (err: { type?: string }) => {
        // If host ID is already taken and we're admin, might be a reloaded tab
        if (err.type === 'unavailable-id' && role === 'admin') {
          console.warn('Host ID in use, attempting secondary connection...');
        }
        this.startServerlessPollingFallback();
      });
    } catch (e) {
      console.warn('WebRTC peerjs init failed, falling back to local & polling sync:', e);
      this.startServerlessPollingFallback();
    }
  }

  private connectToHost(peerInstance: unknown, hostPeerId: string) {
    try {
      const p = peerInstance as {
        connect: (id: string, opts: { reliable: boolean }) => unknown;
      };
      const conn = p.connect(hostPeerId, { reliable: true }) as {
        peer: string;
        on: (event: string, fn: (data?: unknown) => void) => void;
        send: (data: unknown) => void;
      };

      conn.on('open', () => {
        this.peerConnections.set(hostPeerId, conn);
        this.isPeerConnected = true;
        this.notifyConnection();
      });

      conn.on('data', (data: unknown) => {
        this.handleIncomingPeerData(data);
      });

      conn.on('close', () => {
        this.peerConnections.delete(hostPeerId);
        this.notifyConnection();
        // Retry connect after a few seconds
        setTimeout(() => this.connectToHost(peerInstance, hostPeerId), 3000);
      });
    } catch {
      this.startServerlessPollingFallback();
    }
  }

  private handleIncomingPeerData(data: unknown) {
    if (!data || typeof data !== 'object') return;
    const action = data as SyncAction;
    this.handleIncomingAction(action, 'WebRTC Peer');
  }

  // Fallback serverless sync via API route /api/sync
  private startServerlessPollingFallback() {
    if (this.pollingInterval) return;
    this.pollingInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync?room=' + this.state.settings.roomCode);
        if (res.ok) {
          const json = await res.json();
          if (json?.state && json.timestamp > (this.state.match.lastAction?.timestamp || 0)) {
            this.updateLocalState(json.state, 'Vercel API Polling');
          }
        }
      } catch {
        // quiet ignore
      }
    }, 1200);
  }

  public dispatch(action: SyncAction) {
    // 1. Apply to local state immediately (zero lag UI!)
    this.applyActionToState(action);
    this.saveToLocalStorage(this.state);
    this.notifyState();

    // 2. Broadcast via BroadcastChannel (local tabs/windows: Admin <-> LCD <-> Juri)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'BROADCAST_ACTION',
          action,
        });
      } catch {
        // ignore
      }
    }

    // 3. Broadcast to all WebRTC peer connections
    this.peerConnections.forEach((conn) => {
      try {
        (conn as { send: (data: unknown) => void }).send(action);
      } catch (err) {
        console.warn('Failed sending to peer:', err);
      }
    });

    // 4. Async sync to serverless fallback API (fire and forget)
    this.syncToServerlessAPI(action);

    // 5. If it's a score or match finish, trigger Google Sheets webhook if configured
    if (
      (action.type === 'RECORD_SCORE' || action.type === 'FINISH_MATCH_SESSION') &&
      this.state.settings.googleSheetsWebhookUrl
    ) {
      this.pushToGoogleSheetsWebhook();
    }
  }

  private handleIncomingAction(action: SyncAction, source: string) {
    this.lastSyncSource = source;
    this.applyActionToState(action);
    this.saveToLocalStorage(this.state);
    this.notifyState();
    this.notifyConnection();
  }

  private updateLocalState(newState: AppState, source: string) {
    this.lastSyncSource = source;
    this.state = newState;
    this.notifyState();
    this.notifyConnection();
  }

  private async syncToServerlessAPI(action: SyncAction) {
    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: this.state.settings.roomCode,
          action,
          state: this.state,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {
      // quiet
    }
  }

  private async pushToGoogleSheetsWebhook() {
    const url = this.state.settings.googleSheetsWebhookUrl;
    if (!url) return;
    try {
      const match = this.state.match;
      const teamA = this.state.teams.find((t) => t.id === match.teamAId);
      const teamB = this.state.teams.find((t) => t.id === match.teamBId);

      const payload = {
        timestamp: new Date().toISOString(),
        session: match.sessionNumber,
        teamAName: teamA?.name || '-',
        teamASchool: teamA?.school || '-',
        teamAScore: match.teamAScore,
        teamBName: teamB?.name || '-',
        teamBSchool: teamB?.school || '-',
        teamBScore: match.teamBScore,
        allTeams: this.state.teams.map((t) => ({
          name: t.name,
          school: t.school,
          totalScore: t.totalScore,
        })),
      };

      fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (e) {
      console.warn('Google Sheets webhook error:', e);
    }
  }

  private applyActionToState(action: SyncAction) {
    const now = Date.now();
    switch (action.type) {
      case 'FULL_STATE_SYNC':
        this.state = action.payload;
        break;

      case 'UPDATE_MATCH':
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            ...action.payload,
          },
        };
        break;

      case 'SET_SCREEN_MODE':
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            screenMode: action.payload,
          },
        };
        break;

      case 'SET_SESSION': {
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            sessionNumber: Math.max(1, action.payload.sessionNumber),
            sessionTitle: action.payload.sessionTitle?.trim() || this.state.match.sessionTitle || 'Babak Semifinal',
          },
        };
        break;
      }

      case 'SET_POINT_RULES': {
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            correctPoints: action.payload.correctPoints,
            wrongPoints: action.payload.wrongPoints,
          },
        };
        break;
      }

      case 'SET_EXACT_SCORE': {
        const { team, score } = action.payload;
        const targetTeamId = team === 'A' ? this.state.match.teamAId : this.state.match.teamBId;
        const targetTeam = this.state.teams.find((t) => t.id === targetTeamId);
        const newScore = Math.max(0, score);

        const updatedTeams = this.state.teams.map((t) => {
          if (t.id === targetTeamId) {
            return {
              ...t,
              totalScore: newScore,
            };
          }
          return t;
        });

        const newLog: ScoreLogItem = {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          sessionNumber: this.state.match.sessionNumber,
          sessionTitle: this.state.match.sessionTitle,
          teamId: targetTeamId || '',
          teamName: targetTeam?.name || `Tim ${team}`,
          school: targetTeam?.school || '',
          action: `SET SKOR: ${newScore}`,
          pointsDelta: 0,
          scoreAfter: newScore,
        };

        this.state = {
          ...this.state,
          teams: updatedTeams,
          match: {
            ...this.state.match,
            teamAScore: team === 'A' ? newScore : this.state.match.teamAScore,
            teamBScore: team === 'B' ? newScore : this.state.match.teamBScore,
            lastAction: {
              type: 'RESET',
              team,
              points: newScore,
              timestamp: now,
            },
          },
          scoreLogs: [newLog, ...this.state.scoreLogs].slice(0, 50),
        };
        break;
      }

      case 'SET_CUSTOM_TIMER': {
        const sec = Math.max(1, action.payload.seconds);
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            timerSeconds: sec,
            timerTotal: sec,
            timerRunning: false,
          },
          settings: action.payload.setAsDefault
            ? { ...this.state.settings, defaultTimerSeconds: sec }
            : this.state.settings,
        };
        break;
      }

      case 'ADJUST_TIMER_REMAINING': {
        const newSec = Math.max(0, this.state.match.timerSeconds + action.payload.deltaSeconds);
        const newTotal = Math.max(this.state.match.timerTotal, newSec);
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            timerSeconds: newSec,
            timerTotal: newTotal,
          },
        };
        break;
      }

      case 'SELECT_TEAMS_FOR_MATCH': {
        const { teamAId, teamBId } = action.payload;
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            teamAId,
            teamBId,
            teamAScore: 0,
            teamBScore: 0,
            activeAnsweringTeam: null,
            timerSeconds: this.state.settings.defaultTimerSeconds,
            timerTotal: this.state.settings.defaultTimerSeconds,
            timerRunning: false,
            screenMode: 'match',
            lastAction: {
              type: 'RESET',
              team: null,
              points: 0,
              timestamp: now,
            },
          },
        };
        break;
      }

      case 'RECORD_SCORE': {
        const { team, isCorrect, pointsDelta: explicitDelta } = action.payload;
        const targetTeamId =
          team === 'A' ? this.state.match.teamAId : this.state.match.teamBId;
        const targetTeam = this.state.teams.find((t) => t.id === targetTeamId);
        
        // Calculate points based on custom rule or explicit delta
        const ruleDelta = isCorrect
          ? (this.state.match.correctPoints ?? 10)
          : (this.state.match.wrongPoints ?? 0);
        const pointsDelta = explicitDelta !== undefined ? explicitDelta : ruleDelta;

        const newTeamAScore = Math.max(
          0,
          team === 'A' ? this.state.match.teamAScore + pointsDelta : this.state.match.teamAScore
        );
        const newTeamBScore = Math.max(
          0,
          team === 'B' ? this.state.match.teamBScore + pointsDelta : this.state.match.teamBScore
        );

        // Update team's cumulative score
        const updatedTeams = this.state.teams.map((t) => {
          if (t.id === targetTeamId) {
            return {
              ...t,
              totalScore: Math.max(0, t.totalScore + pointsDelta),
              hasPlayed: true,
            };
          }
          return t;
        });

        const sign = pointsDelta > 0 ? `+${pointsDelta}` : `${pointsDelta}`;
        const newLog: ScoreLogItem = {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          sessionNumber: this.state.match.sessionNumber,
          sessionTitle: this.state.match.sessionTitle,
          teamId: targetTeamId || '',
          teamName: targetTeam?.name || `Tim ${team}`,
          school: targetTeam?.school || '',
          action: isCorrect ? `BENAR (${sign})` : `SALAH (${sign})`,
          pointsDelta,
          scoreAfter: team === 'A' ? newTeamAScore : newTeamBScore,
        };

        this.state = {
          ...this.state,
          teams: updatedTeams,
          match: {
            ...this.state.match,
            teamAScore: newTeamAScore,
            teamBScore: newTeamBScore,
            timerRunning: false, // Stop timer once judged
            lastAction: {
              type: isCorrect ? 'BENAR' : 'SALAH',
              team,
              points: pointsDelta,
              timestamp: now,
            },
          },
          scoreLogs: [newLog, ...this.state.scoreLogs].slice(0, 50),
        };
        break;
      }

      case 'ADJUST_SCORE': {
        const { team, delta } = action.payload;
        const targetTeamId =
          team === 'A' ? this.state.match.teamAId : this.state.match.teamBId;
        const targetTeam = this.state.teams.find((t) => t.id === targetTeamId);

        const newTeamAScore = Math.max(
          0,
          team === 'A' ? this.state.match.teamAScore + delta : this.state.match.teamAScore
        );
        const newTeamBScore = Math.max(
          0,
          team === 'B' ? this.state.match.teamBScore + delta : this.state.match.teamBScore
        );

        const updatedTeams = this.state.teams.map((t) => {
          if (t.id === targetTeamId) {
            return {
              ...t,
              totalScore: Math.max(0, t.totalScore + delta),
            };
          }
          return t;
        });

        this.state = {
          ...this.state,
          teams: updatedTeams,
          match: {
            ...this.state.match,
            teamAScore: newTeamAScore,
            teamBScore: newTeamBScore,
            lastAction: {
              type: 'RESET',
              team,
              points: delta,
              timestamp: now,
            },
          },
        };
        break;
      }

      case 'START_TIMER': {
        const seconds = action.payload?.seconds ?? this.state.match.timerSeconds;
        const activeTeam = action.payload?.team ?? this.state.match.activeAnsweringTeam;
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            activeAnsweringTeam: activeTeam || null,
            timerSeconds: seconds,
            timerTotal: seconds,
            timerRunning: true,
            timerLastUpdated: now,
            lastAction: {
              type: 'TIMER_START',
              team: activeTeam || null,
              points: 0,
              timestamp: now,
            },
          },
        };
        break;
      }

      case 'PAUSE_TIMER':
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            timerRunning: false,
          },
        };
        break;

      case 'RESET_TIMER': {
        const resetSec = action.payload?.seconds ?? this.state.settings.defaultTimerSeconds;
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            timerSeconds: resetSec,
            timerTotal: resetSec,
            timerRunning: false,
            activeAnsweringTeam: null,
          },
        };
        break;
      }

      case 'SPIN_START': {
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            isSpinning: true,
            wheelCandidateSlot: action.payload.slot,
            spinWinnerId: null,
            spinData: action.payload,
            screenMode: 'spin',
            lastAction: {
              type: 'SPIN_START',
              team: action.payload.slot,
              points: 0,
              timestamp: now,
            },
          },
        };
        break;
      }

      case 'RESET_SPIN_WINNER': {
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            spinWinnerId: null,
            spinData: null,
          },
        };
        break;
      }

      case 'SPIN_RESULT': {
        const { teamId, slot } = action.payload;
        // Eliminate spun team from the spinner
        const updatedTeams = this.state.teams.map((t) => {
          if (t.id === teamId) {
            return { ...t, isEliminatedFromWheel: true };
          }
          return t;
        });

        const newMatch = {
          ...this.state.match,
          isSpinning: false,
          spinWinnerId: teamId,
          teamAId: slot === 'A' ? teamId : this.state.match.teamAId,
          teamBId: slot === 'B' ? teamId : this.state.match.teamBId,
          lastAction: {
            type: 'SPIN_RESULT' as const,
            team: slot,
            points: 0,
            timestamp: now,
          },
        };

        this.state = {
          ...this.state,
          teams: updatedTeams,
          match: newMatch,
        };
        break;
      }

      case 'FINISH_MATCH_SESSION': {
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            sessionNumber: this.state.match.sessionNumber + 1,
            teamAId: null,
            teamBId: null,
            teamAScore: 0,
            teamBScore: 0,
            activeAnsweringTeam: null,
            timerRunning: false,
            screenMode: 'leaderboard',
          },
        };
        break;
      }

      case 'UPDATE_TEAMS':
        this.state = {
          ...this.state,
          teams: action.payload,
        };
        break;

      case 'UPDATE_SETTINGS':
        this.state = {
          ...this.state,
          settings: {
            ...this.state.settings,
            ...action.payload,
          },
        };
        break;

      case 'TRIGGER_SOUND':
        // Audio will be played by components listening
        break;
    }
  }
}

// Global singleton instance
export const realtime = new RealtimeManager();
