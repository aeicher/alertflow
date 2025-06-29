#!/bin/bash

# AlertFlow Deployment Script
# This script automates the deployment process for AlertFlow

set -e

echo "🚀 Starting AlertFlow deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "prisma/schema.prisma" ]; then
    print_error "This doesn't appear to be the AlertFlow project directory. Please run this script from the project root."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js version: $(node --version)"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Please create it with your environment variables."
    print_status "Required environment variables:"
    echo "  - POSTGRES_URL"
    echo "  - SLACK_BOT_TOKEN"
    echo "  - SLACK_SIGNING_SECRET"
    echo "  - SLACK_CLIENT_ID"
    echo "  - SLACK_CLIENT_SECRET"
    echo "  - OPENAI_API_KEY"
    echo "  - NEXT_PUBLIC_BASE_URL"
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Run database migrations
print_status "Running database migrations..."
if [ -f ".env.local" ]; then
    npx prisma migrate deploy
else
    print_warning "Skipping database migration (no .env.local found)"
fi

# Build the application
print_status "Building the application..."
npm run build

# Run linting
print_status "Running linting..."
npm run lint

# Health check (if environment is configured)
if [ -f ".env.local" ]; then
    print_status "Starting health check..."
    npm run start &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Check health endpoint
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        print_status "Health check passed!"
    else
        print_warning "Health check failed (server might still be starting)"
    fi
    
    # Stop the server
    kill $SERVER_PID 2>/dev/null || true
fi

print_status "✅ Deployment preparation completed!"

echo ""
echo "📋 Next steps:"
echo "1. Push your code to GitHub"
echo "2. Deploy to Vercel:"
echo "   - Connect your GitHub repository"
echo "   - Set build command: npm run build"
echo "   - Set output directory: .next"
echo "   - Configure environment variables"
echo "3. Set up your Slack app with the production URLs"
echo "4. Configure your database and run migrations"
echo ""
echo "🔗 Useful URLs after deployment:"
echo "  - Dashboard: https://your-domain.com"
echo "  - Health Check: https://your-domain.com/api/health"
echo "  - Slack Events: https://your-domain.com/api/slack/events"
echo "  - Slack Commands: https://your-domain.com/api/slack/commands"
echo "  - Slack OAuth: https://your-domain.com/api/slack/oauth"
echo "  - Webhook: https://your-domain.com/api/webhook"
echo ""
print_status "🎉 AlertFlow is ready for deployment!" 