import { NextResponse } from 'next/server';
import { getApprovedPublicStays, renderLlmStays } from '@/lib/llm-discovery';

export const revalidate = 900;

export async function GET() {
  const stays = await getApprovedPublicStays();
  return new NextResponse(renderLlmStays(stays), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      'X-Robots-Tag': 'all',
    },
  });
}
