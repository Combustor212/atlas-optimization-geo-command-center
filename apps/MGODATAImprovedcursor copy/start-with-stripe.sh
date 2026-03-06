#!/bin/bash

# MGO Stripe Integration - Quick Start Script
echo "========================================"
echo "MGO Stripe Integration - Quick Start"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f "mgo-scanner-backend/.env" ]; then
  echo "⚠️  No .env file found in backend directory"
  echo "Creating .env file..."
  
  # Generate encryption key
  ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  
  cat > mgo-scanner-backend/.env << EOF
# MGO Backend Environment Variables
PORT=3000
NODE_ENV=development

# Google Places API
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Database
DATABASE_PATH=./data/mgo.db

# Stripe Encryption Key (NEVER COMMIT THIS!)
ENCRYPTION_MASTER_KEY=$ENCRYPTION_KEY

# Frontend URL
FRONTEND_URL=http://localhost:5173
EOF
  
  echo "✅ Created .env file with encryption key"
  echo "📝 Please update GOOGLE_PLACES_API_KEY and OPENAI_API_KEY in mgo-scanner-backend/.env"
  echo ""
else
  echo "✅ .env file already exists"
  
  # Check if ENCRYPTION_MASTER_KEY is set
  if ! grep -q "ENCRYPTION_MASTER_KEY" mgo-scanner-backend/.env; then
    echo "⚠️  ENCRYPTION_MASTER_KEY not found in .env"
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "ENCRYPTION_MASTER_KEY=$ENCRYPTION_KEY" >> mgo-scanner-backend/.env
    echo "✅ Added ENCRYPTION_MASTER_KEY to .env"
  else
    echo "✅ ENCRYPTION_MASTER_KEY already configured"
  fi
  echo ""
fi

# Check if node_modules exist
if [ ! -d "mgo-scanner-backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  cd mgo-scanner-backend && npm install && cd ..
  echo ""
fi

if [ ! -d "mgodataImprovedthroughcursor/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd mgodataImprovedthroughcursor && npm install && cd ..
  echo ""
fi

echo "========================================"
echo "🚀 Starting MGO with Stripe Integration"
echo "========================================"
echo ""
echo "Backend will start on: http://localhost:3000"
echo "Frontend will start on: http://localhost:5173"
echo ""
echo "Admin Panel: http://localhost:5173/betaadmin"
echo "Billing Page: http://localhost:5173/billing"
echo ""
echo "📖 See STRIPE_IMPLEMENTATION_SUMMARY.md for full setup guide"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers
trap 'kill 0' SIGINT

cd mgo-scanner-backend && npm run dev &
cd mgodataImprovedthroughcursor && npm run dev &

wait



