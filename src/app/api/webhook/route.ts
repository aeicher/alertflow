import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { anthropic } from '../../lib/anthropic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contentType = request.headers.get('content-type') || '';
    
    let alertData = parseWebhookData(body, contentType);
    const analysisResult = await analyzeAlert(alertData, body);
    await sendSlackNotification(alertData, analysisResult);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed with AI analysis',
      alert: alertData,
      ai_analysis: analysisResult,
      received_at: new Date().toISOString(),
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500, headers: corsHeaders }
    );
  }
}

function parseWebhookData(body: any, contentType: string) {
  if (contentType.includes('application/vnd.pagerduty+json')) {
    return parsePagerDutyWebhook(body);
  } 
  if (body.datadog) {
    return parseDataDogWebhook(body);
  }
  if (body.alertmanager) {
    return parsePrometheusWebhook(body);
  }
  
  return {
    title: body.title || body.name || 'Alert from webhook',
    description: body.description || body.message || body.summary || '',
    severity: body.severity || body.priority || 'medium',
    raw_data: body,
    source: body.source || 'webhook'
  };
}

async function analyzeAlert(alertData: any, rawBody: any) {
  const analysis = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: `You are an expert SRE analyzing alerts. Provide:
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
}`,
    messages: [
      {
        role: 'user',
        content: `Alert: ${alertData.title}
Description: ${alertData.description}
Source: ${alertData.source}
Raw Data: ${JSON.stringify(alertData.raw_data || rawBody, null, 2)}`
      }
    ],
    temperature: 0.3,
  });

  const analysisContent = analysis.content[0].type === 'text' ? analysis.content[0].text : '';

  try {
    const cleanContent = analysisContent.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch {
    try {
      return JSON.parse(analysisContent);
    } catch {
      return { 
        summary: analysisContent,
        severity: alertData.severity,
        create_incident: false 
      };
    }
  }
}

async function sendSlackNotification(alertData: any, analysisResult: any) {
  try {
    const { fetchSlackMessage } = await import('../../lib/alerts');
    const channelName = '#alerts';
    let slackMessage;

    if (analysisResult.create_incident && ['medium', 'high', 'critical'].includes(analysisResult.severity)) {
      slackMessage = formatHighPriorityMessage(alertData, analysisResult);
    } else {
      slackMessage = formatLowPriorityMessage(alertData, analysisResult);
    }

    await fetchSlackMessage({
      channel: channelName,
      text: slackMessage,
    });
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

function formatHighPriorityMessage(alertData: any, analysisResult: any) {
  return `🚨 High-Priority Incident Created
        
Alert: ${alertData.title}
Severity: ${analysisResult.severity?.toUpperCase()}
Summary: ${analysisResult.summary}

Immediate Actions:
${analysisResult.immediate_actions?.map((action: string) => `• ${action}`).join('\n') || 'No actions specified'}

Root Causes:
${analysisResult.root_causes?.map((cause: string) => `• ${cause}`).join('\n') || 'Analysis in progress'}

Analyzed by AlertFlow AI`;
}

function formatLowPriorityMessage(alertData: any, analysisResult: any) {
  return `${alertData.title}

Summary: ${analysisResult.summary}
Severity: ${analysisResult.severity?.toUpperCase()}

Analyzed by AlertFlow AI`;
}

function parsePagerDutyWebhook(body: any) {
  const incident = body.messages?.[0]?.event?.data;
  return {
    title: incident?.incident?.title || 'PagerDuty Alert',
    description: incident?.incident?.description || '',
    severity: incident?.incident?.urgency || 'medium',
    raw_data: body,
    source: 'pagerduty'
  };
}

function parseDataDogWebhook(body: any) {
  const alert = body.alert;
  return {
    title: alert?.title || 'DataDog Alert',
    description: alert?.message || '',
    severity: alert?.priority || 'medium',
    raw_data: body,
    source: 'datadog'
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
    source: 'prometheus'
  };
}