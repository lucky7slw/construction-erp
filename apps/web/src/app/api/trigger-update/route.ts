import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = await fetch('http://localhost:5000/api/trigger-update', {
      method: 'POST',
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to connect to update server' },
      { status: 500 }
    );
  }
}
