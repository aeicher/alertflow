import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../src/app/components/Dashboard';

// Mock the fetch function to return dummy data
beforeAll(() => {
  global.fetch = jest.fn((url) => {
    if (typeof url === 'string' && url.includes('/api/incidents/query')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ incidents: [] }),
      }) as any;
    }
    if (typeof url === 'string' && url.includes('/api/alerts')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alerts: [] }),
      }) as any;
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }) as any;
  });
});

afterAll(() => {
  jest.resetAllMocks();
});

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with title', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('AlertFlow Dashboard')).toBeInTheDocument();
    });
  });

  it('renders incident cards section', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Recent Incidents')).toBeInTheDocument();
    });
  });

  it('renders alerts section', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    });
  });
}); 