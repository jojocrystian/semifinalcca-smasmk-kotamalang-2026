import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis if environment variables are provided (Vercel KV / Upstash Redis)
let redisClient: Redis | null = null;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (redisUrl && redisToken) {
  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch (err) {
    console.warn('Failed to initialize Upstash Redis / Vercel KV, falling back to memory:', err);
  }
}

// In-memory state store fallback for local development or when database is not connected yet
const roomStore: Record<
  string,
  {
    state: unknown;
    timestamp: number;
    lastAction?: unknown;
  }
> = {};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const room = (searchParams.get('room') || 'CCA-MALANG-2026').toUpperCase();

  // Try Redis if available
  if (redisClient) {
    try {
      const data = await redisClient.get<{
        state: unknown;
        timestamp: number;
        lastAction?: unknown;
      }>(`cca:room:${room}`);

      if (data) {
        return NextResponse.json({
          found: true,
          room,
          state: data.state,
          timestamp: data.timestamp,
          source: 'Vercel KV / Upstash Redis',
        });
      }
    } catch (err) {
      console.warn('Redis read failed, fallback to memory:', err);
    }
  }

  // Fallback to in-memory store
  const data = roomStore[room];
  if (!data) {
    return NextResponse.json({ found: false, message: 'Room not initialized' });
  }

  return NextResponse.json({
    found: true,
    room,
    state: data.state,
    timestamp: data.timestamp,
    source: 'Memory Fallback',
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const room = (body.room || 'CCA-MALANG-2026').toUpperCase();
    const payload = {
      state: body.state,
      timestamp: body.timestamp || Date.now(),
      lastAction: body.action,
    };

    // Save to in-memory store
    roomStore[room] = payload;

    // Save to Redis if available
    let savedToRedis = false;
    if (redisClient) {
      try {
        // Persist room state for 7 days (604800 seconds)
        await redisClient.set(`cca:room:${room}`, payload, { ex: 604800 });
        savedToRedis = true;
      } catch (err) {
        console.warn('Redis write failed, stored in memory only:', err);
      }
    }

    return NextResponse.json({
      success: true,
      room,
      timestamp: payload.timestamp,
      storage: savedToRedis ? 'Vercel KV / Upstash Redis' : 'In-Memory Store',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}
