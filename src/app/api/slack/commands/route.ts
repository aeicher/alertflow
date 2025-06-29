import { NextRequest, NextResponse } from 'next/server';
import { verifySlackRequest } from '../../../lib/alerts';
import { prisma } from '../../../lib/prisma';
import { openai } from '../../../lib/openai';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Verify Slack signature
    const isAuthentic = await verifySlackRequest(request);
    if (!isAuthentic) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const formData = await request.formData();
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

    // Get recent incidents for context
    const recentIncidents = await prisma.incidents.findMany({
      where: {
        OR: [
          { slack_channel_id: channelId },
          { status: 'active' },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: {
        incident_queries: {
          take: 3,
          orderBy: { created_at: 'desc' },
        },
      },
    });

    // Generate AI response
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert SRE assistant responding to Slack commands. 
          Provide concise, actionable responses about incidents and system status.
          If asked about specific incidents, reference the provided incident data.
          Keep responses under 300 words and use bullet points when helpful.`
        },
        {
          role: 'user',
          content: `Recent incidents: ${recentIncidents.map(inc => 
            `${inc.title || 'Untitled'} (${inc.status}): ${inc.ai_summary || 'No summary'}`
          ).join('\n')}
          
          User question: ${text}`
        }
      ],
      temperature: 0.3,
    });

    const response = aiResponse.choices[0]?.message?.content || 'No response generated';

    // Store the query
    await prisma.incident_queries.create({
      data: {
        query: text,
        user_id: userId,
        response: response,
      },
    });

    // Send response to Slack
    const slackResponse = await fetch(responseUrl, {
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

    if (!slackResponse.ok) {
      console.error('Failed to send Slack response:', await slackResponse.text());
    }

    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Response sent to channel',
    });

  } catch (error) {
    console.error('Error handling Slack command:', error);
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Sorry, I encountered an error processing your request.',
    });
  }
} 