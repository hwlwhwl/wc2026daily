import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { ensureSchema, createUser, getUserById, getUsers } from '@/lib/daily/db';

export async function POST(req: NextRequest) {
  await ensureSchema();
  const body = await req.json();
  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }
  const id = randomUUID();
  await createUser(id, name);
  return NextResponse.json({ id, name });
}

export async function GET(req: NextRequest) {
  await ensureSchema();
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const user = await getUserById(id);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(user);
  }
  // Return all users when no id
  const users = await getUsers();
  return NextResponse.json(users);
}
