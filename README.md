# AlertFlow

Ever been on-call and wished you could just magically tell what's actually going wrong with your systems? Well, I built the next best thing. AlertFlow is an incident management platform that brings together Slack, AI-powered analysis, and a clean web dashboard to help you sleep better at night (and respond faster when you can't).

## How this helps you

**🔔 Slack integration** - Your alerts come to you where you already are, and the AI actually understands what's happening  
**🧠 AI that gets it** - GPT-4o analyzes your incidents and gives you real recommendations on what to do
**📊 Dashboard that doesn't suck** - Beautiful, responsive interface that shows you what matters without the clutter  
**🎯 Plays nice with everything** - PagerDuty, DataDog, Prometheus, custom webhooks - if it can send alerts, AlertFlow can handle them  
**⚡ Real-time everything** - Live updates, instant notifications, no refresh button mashing  
**🔍 Find anything fast** - Search through incidents like you're searching your email  
**💬 Slash commands** - `/whisperer` for when you need answers asap

## The tech behind the magic

I built this with modern tools that work well together:

- **Frontend**: Next.js 14 with React 18 and TypeScript
- **Backend**: Next.js API routes running on Edge Runtime for speed
- **Database**: PostgreSQL with Prisma
- **AI**: GPT-4o
- **Slack**: Full Web API integration with event subscriptions
- **Deployment**: Vercel

## Before you start

Please have these ready:
- Node.js 18 or newer
- Postgres DB
- Slack app (we'll walk you through this)
- OpenAI API key
- Vercel account for deployment

## Getting up and running

### Step 1: Get the code
```bash
git clone <your-repo>
cd alertflow
npm install
```

### Step 2: Set up your environment
Create a `.env.local` file with your secrets:

```env
# Your db connection
POSTGRES_URL="postgresql://user:password@host:5432/database"

# Slack app credentials (we'll get these next)
SLACK_BOT_TOKEN="xoxb-your-bot-token"
SLACK_SIGNING_SECRET="your-signing-secret"
SLACK_CLIENT_ID="your-client-id"
SLACK_CLIENT_SECRET="your-client-secret"

# OpenAI for the smart stuff
OPENAI_API_KEY="sk-your-openai-key"

# Your app's URL
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### Step 3: Set up your database
```bash
# Generate the Prisma client
npx prisma generate

# Create your database tables
npx prisma migrate dev --name init

# (Optional) Add some sample data to play with
npx prisma db seed
```

### Step 4: Create your Slack app
This is where it gets fun. Head over to https://api.slack.com/apps and create a new app.

**Give your bot some permissions:**
- `chat:write` (so it can talk)
- `channels:read` (so it can see channels)
- `channels:history` (so it can read messages)
- `users:read` (so it knows who's who)

**Set up event subscriptions:**
- Request URL: `https://your-domain.com/api/slack/events`
- Subscribe to: `message.channels`

**Add the slash command:**
- Command: `/whisperer`
- Request URL: `https://your-domain.com/api/slack/commands`
- Description: "Ask about incidents"

**Configure OAuth:**
- Redirect URL: `https://your-domain.com/api/slack/oauth`

### Step 5: Fire it up
```bash
npm run dev
```

Visit http://localhost:3000 and you should see your shiny new dashboard!

## How to use the API

### Incident analysis
When something breaks, POST to `/api/incidents/analyze` with your logs:

```json
{
  "logs": "Your error logs here...",
  "channelId": "C1234567890",
  "messageTs": "1234567890.123456",
  "title": "Database Connection Failed",
  "severity": "high"
}
```

The AI will analyze it and give you back a summary, root cause analysis, and actionable recommendations.

### Querying incidents
GET `/api/incidents/query` with filters:
- `status`: active, resolved, investigating
- `severity`: critical, high, medium, low
- `channelId`: filter by Slack channel
- `search`: search everywhere
- `limit` and `offset`: for pagination

### Handling webhooks
POST to `/api/webhook` to receive alerts from:
- PagerDuty
- DataDog
- Prometheus AlertManager
- Any system that can send JSON

The webhook handler is smart enough to figure out what kind of alert it is and process it accordingly.

## The dashboard features

### Real-time stats that matter
- How many incidents are active right now
- Alert count
- How many you've resolved today
- Average response time (so you can brag to your manager)

### Filtering that actually works
Search across everything - titles, logs, AI summaries. Filter by status and severity. Clear filters when you're done. Like having a good search engine for your incidents.

### Incident details
Click on any incident to see the full story - what happened, what the AI thinks, related queries, and the timeline. Everything you need to understand and fix the problem.

## Deploying to production

### The easy way (Vercel)
1. Push your code to GitHub
2. Import the project to Vercel
3. Add all your environment variables
4. Deploy

Vercel will automatically build and deploy your app. Set up your prod db URL and you're good to go.

### Don't forget the db
```bash
# Deploy your migrations
npx prisma migrate deploy

# Generate the client for production
npx prisma generate
```

## Development workflow

The usual:

```bash
npm run dev          # Start development with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Check your code
npm run prisma       # Direct access to Prisma CLI
```

### Project structure
```
src/
├── app/
│   ├── api/                 # All your API endpoints
│   │   ├── incidents/       # Incident management
│   │   ├── slack/          # Slack integration magic
│   │   ├── alerts/         # Alert handling
│   │   └── webhook/        # Webhook receiver
│   ├── components/         # React components
│   ├── lib/               # Utilities and clients
│   └── globals.css        # Styles
├── types/                 # TypeScript definitions
└── prisma/               # Database stuff
```

## Security

- **Slack signature verification** - Every request from Slack is verified
- **Environment variables** - All secrets are properly isolated
- **Input validation** - We check everything coming in
- **Rate limiting** - Add this for prod

## Monitoring your monitoring system

**Recommended tools:**
- Vercel Analytics for performance
- Sentry for error tracking
- Your database provider's monitoring
- Slack webhook delivery monitoring

**Health checks:**
- `GET /api/health` tells you if everything is working
- Database connectivity check
- Slack API connectivity check
- OpenAI API connectivity check

## Contributing

Found a bug? Want to add a feature? Here's how:

1. Fork the repo
2. Create a feature branch with a descriptive name
3. Make your changes (and please add tests!)
4. Submit a pull request with a clear description

## What's next?

Here's what's next on this roadmap:

- **User authentication**
- **Team collaboration**
- **Custom AI prompts**
- **More integrations**
- **Custom dashboards**
- **Incident playbooks**
- **Advanced analytics**

## Need help?

- **Issues**: Found a bug? Create an issue on GitHub
- **Questions**: Can use GitHub Discussions for general questions
- **Feature requests**: I'd love to hear your ideas

## License

MIT - Use it, modify it, share it.

---

*Built by an on-call engineer, for on-call engineers. If this helps save you from a night owl debugging session, consider giving it a star! ⭐*