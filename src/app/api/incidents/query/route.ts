import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const channelId = searchParams.get('channelId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    // Build where clause
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

    // Get incidents with pagination
    const incidents = await prisma.incidents.findMany({
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
    });

    // Get total count for pagination
    const total = await prisma.incidents.count({ where });

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
    const body = await request.json();
    const { query, incidentId, userId } = body;

    if (!query || !userId) {
      return NextResponse.json(
        { error: 'Query and userId are required' },
        { status: 400 }
      );
    }

    // Create incident query
    const incidentQuery = await prisma.incident_queries.create({
      data: {
        query,
        user_id: userId,
        incident_id: incidentId || null,
      },
    });

    // If this is a query about a specific incident, get the incident data
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
        // Generate AI response based on incident data
        const { openai } = await import('../../../lib/openai');
        const aiResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert SRE assistant. Answer questions about incidents based on the provided data.'
            },
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

        response = aiResponse.choices[0]?.message?.content || 'No response generated';

        // Update the query with the response
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