# AlertFlow

A modern incident management platform that combines Slack integration, AI-powered analysis, and a beautiful web dashboard for on-call engineers.

## 🚀 Features

- **Slack Integration**: Real-time incident monitoring and AI-powered responses
- **AI Analysis**: GPT-4o powered incident analysis and recommendations
- **Web Dashboard**: Beautiful, responsive dashboard for incident management
- **Multi-Source Alerts**: Support for PagerDuty, DataDog, Prometheus, and custom webhooks
- **Real-time Updates**: Live incident tracking and status updates
- **Advanced Filtering**: Search and filter incidents by status, severity, and more
- **Slash Commands**: `/whisperer` command for quick incident queries

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Edge Runtime)
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4o
- **Slack**: Slack Web API and Event Subscriptions
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Slack App (for integration)
- OpenAI API key
- Vercel account (for deployment)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd alertflow
npm install
```

### 2. Environment Setup

Create a `.env.local` file:

```env
# Database
POSTGRES_URL="postgresql://user:password@host:5432/database"

# Slack Configuration
SLACK_BOT_TOKEN="xoxb-your-bot-token"
SLACK_SIGNING_SECRET="your-signing-secret"
SLACK_CLIENT_ID="your-client-id"
SLACK_CLIENT_SECRET="your-client-secret"

# OpenAI
OPENAI_API_KEY="sk-your-openai-key"

# App Configuration
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed with sample data
npx prisma db seed
```

### 4. Slack App Configuration

1. **Create a Slack App** at https://api.slack.com/apps
2. **Add Bot Token Scopes**:
   - `chat:write`
   - `channels:read`
   - `channels:history`
   - `users:read`
3. **Enable Event Subscriptions**:
   - Request URL: `https://your-domain.com/api/slack/events`
   - Subscribe to: `message.channels`
4. **Add Slash Commands**:
   - Command: `/whisperer`
   - Request URL: `https://your-domain.com/api/slack/commands`
5. **Configure OAuth**:
   - Redirect URL: `https://your-domain.com/api/slack/oauth`

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see the dashboard.

## 📚 API Documentation

### Incidents

#### `POST /api/incidents/analyze`
Analyze incident logs with AI.

**Request:**
```json
{
  "logs": "Error logs content...",
  "channelId": "C1234567890",
  "messageTs": "1234567890.123456",
  "title": "Database Connection Failed",
  "severity": "high"
}
```

**Response:**
```json
{
  "success": true,
  "incident": { /* incident object */ },
  "analysis": {
    "summary": "Brief incident summary",
    "severity": "high",
    "root_cause": "Analysis of root cause",
    "immediate_actions": ["action1", "action2"],
    "recommendations": ["rec1", "rec2"]
  }
}
```

#### `GET /api/incidents/query`
Query incidents with filtering and pagination.

**Query Parameters:**
- `status`: Filter by status (active, resolved, investigating)
- `severity`: Filter by severity (critical, high, medium, low)
- `channelId`: Filter by Slack channel
- `search`: Search in title, logs, and AI summary
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

#### `POST /api/incidents/query`
Create a new incident query.

**Request:**
```json
{
  "query": "What caused the database outage?",
  "incidentId": "incident-uuid",
  "userId": "user-uuid"
}
```

### Slack Integration

#### `POST /api/slack/events`
Handle Slack events (URL verification and message events).

#### `POST /api/slack/commands`
Handle Slack slash commands (e.g., `/whisperer`).

#### `GET /api/slack/oauth`
Handle Slack OAuth flow for app installation.

### Webhooks

#### `POST /api/webhook`
Receive alerts from external systems.

**Supported Sources:**
- PagerDuty
- DataDog
- Prometheus AlertManager
- Generic webhooks

**Example PagerDuty Webhook:**
```json
{
  "messages": [{
    "event": {
      "data": {
        "incident": {
          "title": "High CPU Usage",
          "description": "CPU usage is above 90%",
          "urgency": "high"
        }
      }
    }
  }]
}
```

### Alerts

#### `GET /api/alerts`
Query alerts with filtering and pagination.

#### `POST /api/alerts`
Create a new alert.

## 🎨 Dashboard Features

### Real-time Statistics
- Active incidents count
- Active alerts count
- Resolved incidents today
- Average response time

### Advanced Filtering
- Search across incident titles, logs, and AI summaries
- Filter by status (active, resolved, investigating)
- Filter by severity (critical, high, medium, low)
- Clear filters functionality

### Incident Management
- View incident details with AI analysis
- Track incident status and resolution
- View related queries and responses
- Pagination for large datasets

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
2. **Import to Vercel**:
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set output directory: `.next`
3. **Configure Environment Variables** in Vercel dashboard
4. **Deploy**

### Environment Variables for Production

```env
# Database
POSTGRES_URL="your-production-postgres-url"

# Slack
SLACK_BOT_TOKEN="xoxb-your-bot-token"
SLACK_SIGNING_SECRET="your-signing-secret"
SLACK_CLIENT_ID="your-client-id"
SLACK_CLIENT_SECRET="your-client-secret"

# OpenAI
OPENAI_API_KEY="sk-your-openai-key"

# App
NEXT_PUBLIC_BASE_URL="https://your-domain.com"
```

### Database Migration

```bash
# Generate production migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run prisma       # Prisma CLI proxy
```

### Project Structure

```
src/
├── app/
│   ├── api/                 # API routes
│   │   ├── incidents/       # Incident endpoints
│   │   ├── slack/          # Slack integration
│   │   ├── alerts/         # Alert endpoints
│   │   └── webhook/        # Webhook receiver
│   ├── components/         # React components
│   ├── lib/               # Utilities and clients
│   └── globals.css        # Global styles
├── types/                 # TypeScript types
└── prisma/               # Database schema and migrations
```

## 🔒 Security

- **Slack Signature Verification**: All Slack requests are verified
- **Environment Variables**: Sensitive data stored in environment variables
- **Input Validation**: All API inputs are validated
- **Rate Limiting**: Consider implementing rate limiting for production

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch
```

## 📈 Monitoring

### Recommended Monitoring

- **Application Performance**: Vercel Analytics
- **Error Tracking**: Sentry or similar
- **Database Monitoring**: Your PostgreSQL provider's monitoring
- **Slack Integration**: Monitor webhook delivery and command usage

### Health Checks

- `GET /api/health` - Application health check
- Database connectivity
- Slack API connectivity
- OpenAI API connectivity

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

## 🗺 Roadmap

- [ ] User authentication and authorization
- [ ] Team collaboration features
- [ ] Advanced AI analysis with custom prompts
- [ ] Mobile app
- [ ] Integration with more alerting systems
- [ ] Custom dashboards and widgets
- [ ] Incident templates and playbooks
- [ ] Advanced reporting and analytics 