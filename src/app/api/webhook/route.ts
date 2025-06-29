import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { openai } from '../../lib/openai';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contentType = request.headers.get('content-type') || '';
    
    let alertData: any = body;
    let source = 'unknown';

    // Determine the source based on headers or payload structure
    if (contentType.includes('application/vnd.pagerduty+json')) {
      source = 'pagerduty';
      alertData = parsePagerDutyWebhook(body);
    } else if (body.datadog) {
      source = 'datadog';
      alertData = parseDataDogWebhook(body);
    } else if (body.alertmanager) {
      source = 'prometheus';
      alertData = parsePrometheusWebhook(body);
    } else {
      // Generic webhook format
      alertData = {
        title: body.title || body.name || 'Alert from webhook',
        description: body.description || body.message || body.summary || '',
        severity: body.severity || body.priority || 'medium',
        raw_data: body,
      };
    }

    // Create alert in database
    const alert = await prisma.alert.create({
      data: {
        title: alertData.title,
        description: alertData.description,
        severity: alertData.severity,
        source: source,
        raw_data: alertData.raw_data || body,
      },
    });

    // Generate AI analysis of the alert
    const analysis = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert SRE analyzing alerts. Provide:
1. A concise summary of the alert
2. Severity assessment (low, medium, high, critical)
3. Potential root causes
4. Immediate actions to take
5. Whether this should create an incident

Format your response as JSON with these fields:
{
  "summary": "Brief alert summary",
  "severity": "low|medium|high|critical",
  "root_causes": ["cause1", "cause2"],
  "immediate_actions": ["action1", "action2"],
  "create_incident": true|false,
  "reasoning": "Why this should/shouldn't create an incident"
}`
        },
        {
          role: 'user',
          content: `Alert: ${alertData.title}
Description: ${alertData.description}
Source: ${source}
Raw Data: ${JSON.stringify(alertData.raw_data || body, null, 2)}`
        }
      ],
      temperature: 0.3,
    });

    const analysisContent = analysis.choices[0]?.message?.content || '';
    let analysisResult: any = null;

    try {
      analysisResult = JSON.parse(analysisContent);
    } catch {
      analysisResult = { summary: analysisContent };
    }

    // Update alert with analysis
    await prisma.alert.update({
      where: { id: alert.id },
      data: {
        severity: analysisResult.severity || alertData.severity,
      },
    });

    // If AI suggests creating an incident, do so
    if (analysisResult.create_incident) {
      const incident = await prisma.incidents.create({
        data: {
          slack_channel_id: 'webhook',
          slack_message_ts: new Date().toISOString(),
          title: alertData.title,
          severity: analysisResult.severity || alertData.severity,
          raw_logs: JSON.stringify(alertData.raw_data || body, null, 2),
          ai_summary: analysisContent,
          suggested_actions: analysisResult,
        },
      });

      // Link alert to incident
      await prisma.alert.update({
        where: { id: alert.id },
        data: { incident_id: incident.id },
      });
    }

    return NextResponse.json({
      success: true,
      alert_id: alert.id,
      analysis: analysisResult,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

function parsePagerDutyWebhook(body: any) {
  const incident = body.messages?.[0]?.event?.data;
  return {
    title: incident?.incident?.title || 'PagerDuty Alert',
    description: incident?.incident?.description || '',
    severity: incident?.incident?.urgency || 'medium',
    raw_data: body,
  };
}

function parseDataDogWebhook(body: any) {
  const alert = body.alert;
  return {
    title: alert?.title || 'DataDog Alert',
    description: alert?.message || '',
    severity: alert?.priority || 'medium',
    raw_data: body,
  };
}

function parsePrometheusWebhook(body: any) {
  const alerts = body.alerts || [];
  const alert = alerts[0]; // Take the first alert
  return {
    title: alert?.labels?.alertname || 'Prometheus Alert',
    description: alert?.annotations?.description || alert?.annotations?.summary || '',
    severity: alert?.labels?.severity || 'medium',
    raw_data: body,
  };
} 