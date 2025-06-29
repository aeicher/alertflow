import './globals.css';
import React from 'react';

export const metadata = {
  title: 'AlertFlow - Incident Management Platform',
  description: 'Modern incident management platform with AI-powered analysis and Slack integration',
  keywords: 'incident management, SRE, DevOps, Slack, AI, monitoring',
  authors: [{ name: 'AlertFlow Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'AlertFlow - Incident Management Platform',
    description: 'Modern incident management platform with AI-powered analysis and Slack integration',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AlertFlow - Incident Management Platform',
    description: 'Modern incident management platform with AI-powered analysis and Slack integration',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
} 