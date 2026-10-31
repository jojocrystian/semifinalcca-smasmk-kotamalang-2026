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

interface ExtendedSyncAction {
  type: string;
  payload?: unknown;
  _version?: number;
  _sourceId?: string;
}

class RealtimeManager {
  private state: AppState = INITIAL_APP_STATE;
  private stateListeners: Set<StateListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private peer: unknown = null;
  private peerConnections: Map<string, unknown> = new Map();
  private isPeerConnected: boolean = false;
  private lastSyncSource: string = 'Inisialisasi';
  private cloudSyncInterval: NodeJS.Timeout | null = null;
  private clientId: string = '';
  private role: 'admin' | 'juri' | 'lcd' | 'viewer' = 'viewer';
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.clientId = `client-${Math.random().toString(36).substring(2, 9)}`;
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
          version: parsed.version || 1,
          updatedAt: parsed.updatedAt || Date.now(),
          match: {
            ...INITIAL_APP_STATE.match,
            ...(parsed.match || {}),
            // Ensure timer isn't stuck running across cold page reloads
            timerRunning: parsed.match?.timerExpiresAt ? parsed.match.timerExpiresAt > Date.now() : false,
            timerExpiresAt: parsed.match?.timerExpiresAt || null,
            isSpinning: false,
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
        if (!event.data) return;
        if (event.data.type === 'BROADCAST_ACTION' && event.data.action) {
          if (event.data.sourceId === this.clientId) return; // Ignore own echoes
          this.handleIncomingAction(event.data.action, 'Local BroadcastChannel', event.data.version);
        } else if (event.data.type === 'BROADCAST_FULL_STATE' && event.data.state) {
          if (event.data.sourceId === this.clientId) return;
          const remoteVersion = event.data.version || event.data.state.version || 0;
          if (remoteVersion > (this.state.version || 0)) {
            this.updateLocalState(event.data.state, 'Local BroadcastChannel', remoteVersion);
          }
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
          const remoteVersion = parsed.version || 0;
          if (remoteVersion > (this.state.version || 0)) {
            this.updateLocalState(parsed, 'LocalStorage Sync', remoteVersion);
          }
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

  // Continuous Cloud Polling: Guarantees realtime cross-device synchronization anywhere
  private startCloudSyncLoop(room: string) {
    if (this.cloudSyncInterval) return;
    
    // Poll every 650ms for low-latency synchronization across networks
    this.cloudSyncInterval = setInterval(async () => {
      try {
        const v = this.state.version || 0;
        const res = await fetch(`/api/sync?room=${encodeURIComponent(room)}&v=${v}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = await res.json();
        
        if (json.found && json.updated && json.state) {
          const remoteVersion = json.version || 0;
          const localVersion = this.state.version || 0;
          if (remoteVersion > localVersion || (json.timestamp && json.timestamp > (this.state.updatedAt || 0))) {
            this.updateLocalState(json.state, json.source || 'Cloud Sync', remoteVersion);
          }
        }
      } catch {
        // Quiet catch for standard background network fluctuations
      }
    }, 650);
  }

  // Fetch initial cloud state without triggering unprompted mutations
  private async fetchInitialCloudState(room: string) {
    try {
      const res = await fetch(`/api/sync?room=${encodeURIComponent(room)}&v=0`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.found && json.state) {
          const remoteVersion = Number(json.version) || 0;
          const localVersion = Number(this.state.version) || 0;
          const remoteTime = Number(json.timestamp) || 0;
          const localTime = Number(this.state.updatedAt) || 0;

          // Only adopt remote state if it is genuinely newer than our local state
          if (remoteVersion > localVersion || (remoteVersion === localVersion && remoteTime > localTime)) {
            this.updateLocalState(json.state, 'Sinkronisasi Cloud Awal', remoteVersion);
          } else if (localVersion > remoteVersion || (localVersion === remoteVersion && localTime > remoteTime)) {
            // Local state has newer changes (e.g. played matches or customized scores) - push to update cloud
            this.syncToServerlessAPI({
              type: 'FULL_STATE_SYNC',
              payload: this.state,
            });
          }
        } else if (!json.found) {
          // Cloud has no room record yet: push current local state so cloud is initialized
          this.syncToServerlessAPI({
            type: 'FULL_STATE_SYNC',
            payload: this.state,
          });
        }
      }
    } catch (e) {
      console.warn('Initial cloud state fetch notice:', e);
    }
  }

  // Initialize Realtime engine with PeerJS + Cloud loop
  public async initPeer(role: 'admin' | 'juri' | 'lcd' | 'viewer', customRoomCode?: string) {
    this.role = role;
    if (typeof window === 'undefined') return;

    const room = (customRoomCode || this.state.settings.roomCode || 'CCA-MALANG-2026')
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');

    // 1. Immediately fetch existing room state from cloud
    await this.fetchInitialCloudState(room);

    // 2. Start continuous low-latency cloud loop
    this.startCloudSyncLoop(room);

    // 3. Setup WebRTC peer for direct low-latency P2P mesh
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
        this.lastSyncSource = `Peer P2P Aktif (${id})`;
        this.notifyConnection();

        if (role !== 'admin') {
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
          // DO NOT send unprompted full state sync that could overwrite remote screens.
          // Send version handshake instead.
          c.send({
            type: 'VERSION_HANDSHAKE',
            version: this.state.version || 1,
            state: this.state,
          });
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
        if (err.type === 'unavailable-id' && role === 'admin') {
          console.warn('Host ID in use, operating with cloud sync pipeline...');
        }
        this.lastSyncSource = 'Cloud Sync Terhubung';
        this.notifyConnection();
      });
    } catch (e) {
      console.warn('WebRTC peerjs init fallback to cloud sync:', e);
      this.lastSyncSource = 'Cloud Sync Terhubung';
      this.notifyConnection();
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
      // Background cloud sync handles all communication seamlessly
    }
  }

  private handleIncomingPeerData(data: unknown) {
    if (!data || typeof data !== 'object') return;
    const packet = data as ExtendedSyncAction & { state?: AppState; version?: number };

    if (packet.type === 'VERSION_HANDSHAKE') {
      const remoteVer = packet.version || 0;
      const localVer = this.state.version || 0;
      if (packet.state && remoteVer > localVer) {
        this.updateLocalState(packet.state, 'P2P Handshake Sync', remoteVer);
      }
      return;
    }

    const action = data as SyncAction & { _version?: number; _sourceId?: string };
    if (action._sourceId === this.clientId) return; // Ignore own echoes
    this.handleIncomingAction(action, 'WebRTC P2P', action._version);
  }

  public dispatch(action: SyncAction) {
    // 1. Advance version monotonically
    const now = Date.now();
    const nextVersion = (this.state.version || 0) + 1;
    this.state.version = nextVersion;
    this.state.updatedAt = now;

    // 2. Apply to local state immediately (zero lag UI!)
    this.applyActionToState(action);
    this.saveToLocalStorage(this.state);
    this.notifyState();

    const taggedAction = {
      ...action,
      _version: nextVersion,
      _sourceId: this.clientId,
      _timestamp: now,
    };

    // 3. Broadcast via BroadcastChannel (local tabs/windows: Admin <-> LCD <-> Juri)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'BROADCAST_ACTION',
          action: taggedAction,
          version: nextVersion,
          sourceId: this.clientId,
        });
      } catch {
        // ignore
      }
    }

    // 4. Broadcast to all WebRTC peer connections
    this.peerConnections.forEach((conn) => {
      try {
        (conn as { send: (data: unknown) => void }).send(taggedAction);
      } catch (err) {
        console.warn('Failed sending to peer:', err);
      }
    });

    // 5. Atomic push to cloud API for multi-device cross-network persistence
    this.syncToServerlessAPI(taggedAction);

    // 6. If it's a score or match finish, trigger Google Sheets webhook if configured
    if (
      (action.type === 'RECORD_SCORE' || action.type === 'FINISH_MATCH_SESSION') &&
      this.state.settings.googleSheetsWebhookUrl
    ) {
      this.pushToGoogleSheetsWebhook();
    }
  }

  private handleIncomingAction(action: SyncAction, source: string, version?: number) {
    if (version !== undefined && version <= (this.state.version || 0)) {
      // Discard out-of-order stale packet
      return;
    }

    this.lastSyncSource = source;
    if (version !== undefined) {
      this.state.version = version;
    } else {
      this.state.version = (this.state.version || 0) + 1;
    }
    this.state.updatedAt = Date.now();

    this.applyActionToState(action);
    this.saveToLocalStorage(this.state);
    this.notifyState();
    this.notifyConnection();
  }

  private updateLocalState(newState: AppState, source: string, version?: number) {
    const nextVer = version !== undefined ? version : (newState.version || (this.state.version || 0) + 1);
    if (nextVer < (this.state.version || 0)) {
      // Don't downgrade state
      return;
    }

    this.lastSyncSource = source;
    this.state = {
      ...newState,
      version: nextVer,
      updatedAt: newState.updatedAt || Date.now(),
    };
    this.saveToLocalStorage(this.state);
    this.notifyState();
    this.notifyConnection();
  }

  private async syncToServerlessAPI(action: SyncAction & { _version?: number }) {
    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: this.state.settings.roomCode,
          action,
          state: this.state,
          version: this.state.version,
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
        this.state = {
          ...action.payload,
          version: action.payload.version || (this.state.version || 0) + 1,
          updatedAt: now,
        };
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
            timerExpiresAt: null,
          },
          settings: action.payload.setAsDefault
            ? { ...this.state.settings, defaultTimerSeconds: sec }
            : this.state.settings,
        };
        break;
      }

      case 'ADJUST_TIMER_REMAINING': {
        const delta = action.payload.deltaSeconds;
        let newSec = this.state.match.timerSeconds;
        let newExpiresAt = this.state.match.timerExpiresAt;

        if (this.state.match.timerRunning && this.state.match.timerExpiresAt) {
          newExpiresAt = Math.max(now, this.state.match.timerExpiresAt + delta * 1000);
          newSec = Math.max(0, Math.ceil((newExpiresAt - now) / 1000));
        } else {
          newSec = Math.max(0, this.state.match.timerSeconds + delta);
        }

        const newTotal = Math.max(this.state.match.timerTotal, newSec);
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            timerSeconds: newSec,
            timerTotal: newTotal,
            timerExpiresAt: newExpiresAt,
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
            timerExpiresAt: null,
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
            timerExpiresAt: null,
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
        const expiresAt = now + seconds * 1000;
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            activeAnsweringTeam: activeTeam || null,
            timerSeconds: seconds,
            timerTotal: Math.max(this.state.match.timerTotal, seconds),
            timerRunning: true,
            timerExpiresAt: expiresAt,
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

      case 'PAUSE_TIMER': {
        let remaining = this.state.match.timerSeconds;
        if (this.state.match.timerExpiresAt) {
          remaining = Math.max(0, Math.ceil((this.state.match.timerExpiresAt - now) / 1000));
        }
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            timerSeconds: remaining,
            timerRunning: false,
            timerExpiresAt: null,
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

      case 'RESET_TIMER': {
        const resetSec = action.payload?.seconds ?? this.state.match.timerTotal ?? this.state.settings.defaultTimerSeconds;
        this.state = {
          ...this.state,
          match: {
            ...this.state.match,
            timerSeconds: resetSec,
            timerTotal: resetSec,
            timerRunning: false,
            timerExpiresAt: null,
            activeAnsweringTeam: null,
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
            timerExpiresAt: null,
            screenMode: 'welcome', // Set to Standby mode, operator triggers 3 Besar manually
            isSpinning: false,
            spinData: null,
            spinWinnerId: null,
            wheelCandidateSlot: null,
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
