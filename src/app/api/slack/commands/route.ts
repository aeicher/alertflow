import { NextRequest, NextResponse } from 'next/server';
import { verifySlackRequest } from '../../../lib/alerts';
import { prisma } from '../../../lib/prisma';
import { anthropic } from '../../../lib/anthropic';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    
    const isAuthentic = await verifySlackRequest(request, rawBody);
    if (!isAuthentic) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const formData = new URLSearchParams(rawBody);
    const command = formData.get('command') as string;
    const text = formData.get('text') as string;
    const userId = formData.get('user_id') as string;
    const channelId = formData.get('channel_id') as string;
    const responseUrl = formData.get('response_url') as string;

    if (command !== '/whisperer') {
      return NextResponse.json({ error: 'Unknown command' }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: 'Usage: `/whisperer <your question about incidents>`',
      });
    }

    const recentIncidents = await prisma.incidents.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      where: { status: { in: ['active', 'investigating', 'monitoring'] } },
    });

    setTimeout(async () => {
      try {
        const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: `You are an expert SRE assistant responding to Slack commands.
          Provide concise, actionable responses about incidents and system status.
          If asked about specific incidents, reference the provided incident data.
          Keep responses under 300 words and use bullet points when helpful.`,
      messages: [
        {
          role: 'user',
              content: `Recent incidents: ${recentIncidents.map((inc: any) =>
            `${inc.title || 'Untitled'} (${inc.status}): ${inc.ai_summary || 'No summary'}`
          ).join('\n')}

          User question: ${text}`
        }
      ],
      temperature: 0.3,
    });

        const response = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : 'No response generated';
        await fetch(responseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        response_type: 'in_channel',
        text: response,
        attachments: [
          {
            color: '#36a64f',
            footer: 'AlertFlow AI Assistant',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
        });
      } catch (error) {
        console.error('Error in async processing:', error);
        await fetch(responseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            response_type: 'ephemeral',
            text: 'Sorry, I encountered an error generating the response.',
          }),
        });
    }
    }, 100);

    return NextResponse.json({
      response_type: 'ephemeral',
      text: '🤖 Analyzing your request... Response coming shortly!',
    });

  } catch (error) {
    console.error('Error handling Slack command:', error);
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Sorry, I encountered an error processing your request.',
    });
  }
} 