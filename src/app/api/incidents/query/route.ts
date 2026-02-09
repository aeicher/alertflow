import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const channelId = searchParams.get('channelId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    const where: any = {};
    
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (channelId) where.slack_channel_id = channelId;
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { raw_logs: { contains: search, mode: 'insensitive' } },
        { ai_summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [incidents, total] = await Promise.all([
      prisma.incidents.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          incident_queries: {
            take: 5,
            orderBy: { created_at: 'desc' },
          },
        },
      }),
      prisma.incidents.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      incidents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('Error querying incidents:', error);
    return NextResponse.json(
      { error: 'Failed to query incidents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, incidentId, userId } = await request.json();

    if (!query || !userId) {
      return NextResponse.json(
        { error: 'Query and userId are required' },
        { status: 400 }
      );
    }

    const incidentQuery = await prisma.incident_queries.create({
      data: {
        query,
        user_id: userId,
        incident_id: incidentId || null,
      },
    });

    let response: string | null = null;

    if (incidentId) {
      const incident = await prisma.incidents.findUnique({
        where: { id: incidentId },
        include: {
          incident_queries: {
            orderBy: { created_at: 'desc' },
            take: 10,
          },
        },
      });

      if (incident) {
        const { anthropic } = await import('../../../lib/anthropic');
        const aiResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: 'You are an expert SRE assistant. Answer questions about incidents based on the provided data.',
          messages: [
            {
              role: 'user',
              content: `Incident: ${incident.title || 'Untitled'}
Logs: ${incident.raw_logs || 'No logs'}
AI Summary: ${incident.ai_summary || 'No summary'}
Previous Queries: ${incident.incident_queries.map(q => `${q.query}: ${q.response || 'No response'}`).join('\n')}

Question: ${query}`
            }
          ],
          temperature: 0.3,
        });

        response = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : 'No response generated';

        await prisma.incident_queries.update({
          where: { id: incidentQuery.id },
          data: { response },
        });
      }
    }

    return NextResponse.json({
      success: true,
      query: incidentQuery,
      response,
    });

  } catch (error) {
    console.error('Error creating incident query:', error);
    return NextResponse.json(
      { error: 'Failed to create incident query' },
      { status: 500 }
    );
  }
}