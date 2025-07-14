import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { openai } from '../../../lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { logs, channelId, messageTs, title, severity } = await request.json();

    if (!logs) {
      return NextResponse.json(
        { error: 'Logs are required' },
        { status: 400 }
      );
    }

    const timestamp = messageTs || new Date().toISOString();
    let incident = await prisma.incidents.findFirst({
      where: { slack_message_ts: timestamp },
    });

    const incidentData = {
      raw_logs: logs,
      title: title || undefined,
      severity: severity || undefined,
    };

    if (incident) {
      incident = await prisma.incidents.update({
        where: { id: incident.id },
        data: incidentData,
      });
    } else {
      incident = await prisma.incidents.create({
        data: {
          ...incidentData,
          slack_channel_id: channelId || 'unknown',
          slack_message_ts: timestamp,
        },
      });
    }

    const analysis = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert SRE analyzing incident logs. Provide:
1. A concise summary of the incident
2. Severity assessment (low, medium, high, critical)
3. Root cause analysis
4. Immediate actions to take
5. Long-term recommendations

Format your response as JSON with these fields:
{
  "summary": "Brief incident summary",
  "severity": "low|medium|high|critical",
  "root_cause": "Analysis of root cause",
  "immediate_actions": ["action1", "action2"],
  "recommendations": ["rec1", "rec2"]
}`
        },
        {
          role: 'user',
          content: `Analyze these incident logs: ${logs}`
        }
      ],
      temperature: 0.3,
    });

    const analysisContent = analysis.choices[0]?.message?.content || '';
    let suggestedActions;

    try {
      suggestedActions = JSON.parse(analysisContent);
    } catch {
      suggestedActions = { summary: analysisContent };
    }

    const updatedIncident = await prisma.incidents.update({
      where: { id: incident.id },
      data: {
        ai_summary: analysisContent,
        suggested_actions: suggestedActions,
        severity: suggestedActions?.severity || severity,
      },
    });

    return NextResponse.json({
      success: true,
      incident: updatedIncident,
      analysis: suggestedActions,
    });

  } catch (error) {
    console.error('Error analyzing incident:', error);
    return NextResponse.json(
      { error: 'Failed to analyze incident' },
      { status: 500 }
    );
  }
}