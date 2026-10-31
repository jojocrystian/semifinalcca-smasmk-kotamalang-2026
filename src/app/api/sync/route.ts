import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Detect credentials from Vercel KV, Upstash Redis, or custom integrations
const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.VERCEL_KV_REST_API_URL ||
  process.env.REDIS_REST_API_URL;

const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.VERCEL_KV_REST_API_TOKEN ||
  process.env.REDIS_REST_API_TOKEN;

let redisClient: Redis | null = null;
if (redisUrl && redisToken) {
  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch (err) {
    console.warn('Failed to initialize Redis client:', err);
  }
}

// In-memory fallback
interface RoomData {
  state: unknown;
  version: number;
  timestamp: number;
  lastAction?: unknown;
}

const memoryStore: Record<string, RoomData> = {};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const room = (searchParams.get('room') || 'CCA-MALANG-2026').toUpperCase();
  const clientVersion = parseInt(searchParams.get('v') || '0', 10);

  let data: RoomData | null = null;
  let source = 'Memory';

  // 1. Try Redis first if configured
  if (redisClient) {
    try {
      const redisData = await redisClient.get<RoomData>(`cca:room:${room}`);
      if (redisData) {
        data = redisData;
        source = 'Vercel KV / Upstash Redis';
      }
    } catch (err) {
      console.warn('Redis read error:', err);
    }
  }

  // 2. Fallback to memory
  if (!data) {
    data = memoryStore[room] || null;
  }

  if (!data) {
    return NextResponse.json({ found: false, message: 'Room not initialized' });
  }

  // Check if client is already up-to-date
  const isUpToDate = clientVersion > 0 && data.version > 0 && clientVersion >= data.version;
  if (isUpToDate) {
    return NextResponse.json({
      found: true,
      updated: false,
      version: data.version,
      timestamp: data.timestamp,
    });
  }

  return NextResponse.json({
    found: true,
    updated: true,
    room,
    state: data.state,
    version: data.version,
    timestamp: data.timestamp,
    source,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const room = (body.room || 'CCA-MALANG-2026').toUpperCase();
    const now = Date.now();

    // Calculate next version
    const prevVersion = memoryStore[room]?.version || (body.state?.version ? Number(body.state.version) : 0);
    const newVersion = Math.max(prevVersion, body.version ? Number(body.version) : 0) + 1;

    const updatedState = {
      ...(body.state || {}),
      version: newVersion,
      updatedAt: now,
    };

    const payload: RoomData = {
      state: updatedState,
      version: newVersion,
      timestamp: now,
      lastAction: body.action,
    };

    // Update in-memory
    memoryStore[room] = payload;

    // Update Redis if connected
    let savedToRedis = false;
    if (redisClient) {
      try {
        await redisClient.set(`cca:room:${room}`, payload, { ex: 604800 }); // 7 days TTL
        savedToRedis = true;
      } catch (err) {
        console.warn('Redis write error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      room,
      version: newVersion,
      timestamp: now,
      storage: savedToRedis ? 'Vercel KV / Upstash Redis' : 'In-Memory Store',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}
