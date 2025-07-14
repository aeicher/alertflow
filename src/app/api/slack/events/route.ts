/*
 * Slack Event Handler (Edge Runtime)
 * Handles URL verification and message events in incident channels.
 */

import { verifySlackRequest, isIncidentChannel, analyzeIncidentMessage } from '../../../lib/alerts';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const isAuthentic = await verifySlackRequest(request, rawBody);
  if (!isAuthentic) {
    return new Response('Invalid signature', { status: 401 });
  }

  const body = JSON.parse(rawBody);

  if (body.type === 'url_verification') {
    return new Response(body.challenge, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  if (body.event?.type === 'message' && isIncidentChannel(body.event.channel)) {
    try {
      await analyzeIncidentMessage(body.event);
    } catch (error) {
      console.error('[SlackEventHandler] Error analyzing message:', error);
    }
  }

  return new Response('OK');
}