import { NextRequest, NextResponse } from 'next/server';
import { createSession, User } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/auth/login?error=access_denied', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url));
  }

  try {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/slack/oauth`;

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.ok) {
      console.error('Slack OAuth error:', tokenData);
      return NextResponse.redirect(new URL('/auth/login?error=token_exchange_failed', request.url));
    }

    const userResponse = await fetch(`https://slack.com/api/users.info?user=${tokenData.authed_user.id}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    if (!userData.ok) {
      console.error('Slack user info error:', userData);
      return NextResponse.redirect(new URL('/auth/login?error=user_info_failed', request.url));
    }

    const user: User = {
      id: userData.user.id,
      email: userData.user.profile?.email || '',
      name: userData.user.profile?.real_name || userData.user.name,
      slackUserId: userData.user.id,
      teamId: tokenData.team?.id,
      accessToken: tokenData.access_token,
    };

    const sessionToken = await createSession(user);

    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(new URL('/auth/login?error=server_error', request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team_id, access_token, bot_user_id } = body;

    if (!team_id || !access_token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing OAuth tokens:', error);
    return NextResponse.json({ error: 'Failed to store tokens' }, { status: 500 });
  }
}