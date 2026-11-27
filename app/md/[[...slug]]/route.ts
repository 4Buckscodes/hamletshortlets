import { NextResponse } from 'next/server';
import { getNegotiatedMarkdown } from '@/lib/markdown-negotiation';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug?: string[] }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const markdown = await getNegotiatedMarkdown(slug);

  if (markdown === null) {
    return new NextResponse('Not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        Vary: 'Accept',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
      Vary: 'Accept',
      'Content-Signal': 'ai-train=no, search=yes, ai-input=yes',
      'X-Robots-Tag': 'index, follow',
    },
  });
}
