import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name: string;
  slackUserId?: string;
  teamId?: string;
  accessToken?: string;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  
  if (!sessionToken) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    
    if (decoded.exp && Date.now() > decoded.exp) {
      return null;
    }

    return decoded.user;
  } catch (error) {
    return null;
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  return user;
}

export async function createSession(user: User): Promise<string> {
  const sessionData = {
    user,
    exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
  };
  
  return Buffer.from(JSON.stringify(sessionData)).toString('base64');
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
} 