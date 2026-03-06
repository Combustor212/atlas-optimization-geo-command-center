# Environment Setup Guide

## Required Environment Variables

Add these to your `.env` file:

### Database (PostgreSQL)
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/mgo_production?schema=public"
```

### JWT Authentication
```bash
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_64_byte_hex_secret_here
JWT_EXPIRES_IN=7d
```

### Existing Variables (keep these)
```bash
GOOGLE_PLACES_API_KEY=...
OPENAI_API_KEY=...
RESEND_API_KEY=...
ENCRYPTION_MASTER_KEY=...
```

## Quick Start

### 1. Install PostgreSQL
```bash
# Mac
brew install postgresql@15
brew services start postgresql@15

# Ubuntu
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database
```bash
createdb mgo_production
createuser mgo_user -P  # Will prompt for password
psql -d mgo_production -c "GRANT ALL PRIVILEGES ON DATABASE mgo_production TO mgo_user;"
```

### 3. Run Migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Seed Initial Data
```bash
npm run seed
```

### 5. Start Server
```bash
npm run dev
```



