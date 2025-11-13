import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('password') || 'secret';
  
  const hash = await bcrypt.hash(password, 10);
  
  return NextResponse.json({ 
    password: password,
    hash: hash 
  });
}