import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  const db = getDb();
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run(id, name.trim());

  return NextResponse.json({ id, name: name.trim() });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(user);
}
