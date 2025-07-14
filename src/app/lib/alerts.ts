import { openai } from './openai';
import { prisma } from './prisma';

/**
 * Verify Slack signing secret to ensure request integrity.
 */
export async function verifySlackRequest(request: Request, rawBody: string): Promise<boolean> {
  try {
    const timestamp = request.headers.get('x-slack-request-timestamp') || '';
    const signature = request.headers.get('x-slack-signature') || '';

    const signingSecret = process.env.SLACK_SIGNING_SECRET ?? '';
    if (!signingSecret) return false;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(signingSecret);
    const data = encoder.encode(`v0:${timestamp}:${rawBody}`);

    // Compute HMAC using Web Crypto API (Edge-compatible)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const computedSig = `v0=${hashHex}`;

    // Constant-time comparison
    if (computedSig.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < computedSig.length; i++) {
      diff |= computedSig.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch (err) {
    console.error('[verifySlackRequest] failed', err);
    return false;
  }
}

/**
 * Basic helper to determine if a given channel is treated as an incident channel.
 * You can extend this logic to fetch a list from DB or match naming conventions.
 */
export function isIncidentChannel(channelId: string): boolean {
  const incidentChannels = [
    'alerts',
    'incidents',
    'CINC',
  ];
  
  return incidentChannels.some(channel => 
    channelId.includes(channel) || channelId.startsWith(channel)
  );
}

/**
 * Post a message to Slack using fetch (Edge-compatible).
 */
export async function fetchSlackMessage({ channel, thread_ts, text }: { channel: string; thread_ts?: string; text: string; }) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not set');
  const body: any = { channel, text };
  if (thread_ts) body.thread_ts = thread_ts;
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
  return data;
}

/**
 * Analyze incident Slack message using GPT-4o streaming and persist results.
 */
export async function analyzeIncidentMessage(event: any) {
  const { text: logs, channel: channelId, ts: threadTs } = event;

  // Upsert incident in DB using Prisma
  let incident = await prisma.incidents.findFirst({
    where: { slack_message_ts: threadTs },
  });
  if (incident) {
    incident = await prisma.incidents.update({
      where: { id: incident.id },
      data: { raw_logs: logs },
    });
  } else {
    incident = await prisma.incidents.create({
      data: {
        slack_channel_id: channelId,
        slack_message_ts: threadTs,
        raw_logs: logs,
      },
    });
  }

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert SRE analyzing incident logs. Provide concise summaries and actionable next steps.'
      },
      {
        role: 'user',
        content: `Analyze these incident logs: ${logs}`
      }
    ],
    stream: true,
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullResponse += content;
    await fetchSlackMessage({
      channel: channelId,
      thread_ts: threadTs,
      text: fullResponse,
    });
  }

  await prisma.incidents.update({
    where: { id: incident.id },
    data: { ai_summary: fullResponse },
  });
} 