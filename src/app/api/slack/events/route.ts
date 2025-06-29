/*
 * Slack Event Handler (Edge Runtime)
 * Handles URL verification and message events in incident channels.
 */

import { verifySlackRequest, isIncidentChannel, analyzeIncidentMessage } from '../../../lib/alerts';

export const runtime = 'edge';

export async function POST(request: Request) {
  // Verify Slack signature to ensure authenticity
  const isAuthentic = await verifySlackRequest(request);
  if (!isAuthentic) {
    return new Response('Invalid signature', { status: 401 });
  }

  const body = await request.json();

  if (body.type === 'url_verification') {
    // Respond to Slack's URL verification challenge
    return new Response(body.challenge, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Process message events coming from incident channels
  if (body.event?.type === 'message' && isIncidentChannel(body.event.channel)) {
    try {
      await analyzeIncidentMessage(body.event);
    } catch (error) {
      console.error('[SlackEventHandler] Error analyzing message:', error);
    }
  }

  return new Response('OK');
} 