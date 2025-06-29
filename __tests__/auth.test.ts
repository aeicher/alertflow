import '@testing-library/jest-dom';
import { getCurrentUser, createSession, clearSession } from '../src/app/lib/auth';

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return null when no session token exists', async () => {
      const { cookies } = require('next/headers');
      const mockCookies = {
        get: jest.fn().mockReturnValue(undefined),
      };
      cookies.mockReturnValue(mockCookies);

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it('should return null when session token is invalid', async () => {
      const { cookies } = require('next/headers');
      const mockCookies = {
        get: jest.fn().mockReturnValue({ value: 'invalid-token' }),
      };
      cookies.mockReturnValue(mockCookies);

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it('should return user when session token is valid', async () => {
      const testUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
      };
      
      const sessionData = {
        user: testUser,
        exp: Date.now() + 3600000, // 1 hour from now
      };
      
      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      
      const { cookies } = require('next/headers');
      const mockCookies = {
        get: jest.fn().mockReturnValue({ value: sessionToken }),
      };
      cookies.mockReturnValue(mockCookies);

      const user = await getCurrentUser();
      expect(user).toEqual(testUser);
    });

    it('should return null when session is expired', async () => {
      const testUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
      };
      
      const sessionData = {
        user: testUser,
        exp: Date.now() - 3600000, // 1 hour ago
      };
      
      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      
      const { cookies } = require('next/headers');
      const mockCookies = {
        get: jest.fn().mockReturnValue({ value: sessionToken }),
      };
      cookies.mockReturnValue(mockCookies);

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create a valid session token', async () => {
      const testUser = {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
      };

      const sessionToken = await createSession(testUser);
      
      expect(sessionToken).toBeDefined();
      expect(typeof sessionToken).toBe('string');
      
      // Decode and verify the token
      const decoded = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
      expect(decoded.user).toEqual(testUser);
      expect(decoded.exp).toBeGreaterThan(Date.now());
    });
  });

  describe('clearSession', () => {
    it('should clear the session cookie', async () => {
      const { cookies } = require('next/headers');
      const mockCookies = {
        delete: jest.fn(),
      };
      cookies.mockReturnValue(mockCookies);

      await clearSession();
      
      expect(mockCookies.delete).toHaveBeenCalledWith('session_token');
    });
  });
}); 