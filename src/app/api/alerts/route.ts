import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity'); 
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (source) where.source = source;

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          incident: true,
          user: true,
        },
      }),
      prisma.alert.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      alerts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error querying alerts:', error);
    return NextResponse.json(
      { error: 'Failed to query alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, severity, source, rawData, incidentId, assignedUserId } = await request.json();

    if (!title || !severity || !source) {
      return NextResponse.json(
        { error: 'Title, severity, and source are required' },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.create({
      data: {
        title,
        description: description || null,
        severity,
        source,
        raw_data: rawData || null,
        incident_id: incidentId || null,
        assigned_user_id: assignedUserId || null,
      },
      include: {
        incident: true,
        user: true,
      },
    });

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}