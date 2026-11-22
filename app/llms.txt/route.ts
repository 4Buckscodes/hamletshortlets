import { NextResponse } from 'next/server';
import { renderLlmMain } from '@/lib/llm-discovery';

export const revalidate = 900;

export function GET() {
  return new NextResponse(renderLlmMain(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      'X-Robots-Tag': 'all',
    },
  });
}
