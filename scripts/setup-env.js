#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envTemplate = `# Environment
APP_ENV=development

# Development Pusher Configuration
# Replace these with your actual Pusher credentials from https://dashboard.pusher.com/
PUSHER_APP_ID_DEV="your_dev_app_id_here"
NEXT_PUBLIC_PUSHER_KEY_DEV="your_dev_key_here"
PUSHER_SECRET_DEV="your_dev_secret_here"
NEXT_PUBLIC_PUSHER_CLUSTER_DEV="us3"

# Fallback to general keys (optional)
PUSHER_APP_ID="your_dev_app_id_here"
NEXT_PUBLIC_PUSHER_KEY="your_dev_key_here"
PUSHER_SECRET="your_dev_secret_here"
NEXT_PUBLIC_PUSHER_CLUSTER="us3"

# Database Configuration (if using database)
# DATABASE_URL="postgresql://username:password@localhost:5432/tic_tac_toe"
# PGHOST_UNPOOLED="localhost"

# Next.js Configuration
NEXTAUTH_SECRET="your_nextauth_secret_here"
NEXTAUTH_URL="http://localhost:3000"
`;

const envPath = path.join(__dirname, '..', '.env.local');

console.log('Setting up environment variables...');

if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists. Skipping creation.');
  console.log('Please make sure your Pusher credentials are set correctly in .env.local');
} else {
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env.local file with template values');
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Go to https://dashboard.pusher.com/');
  console.log('2. Create a new Channels app');
  console.log('3. Copy your App ID, Key, Secret, and Cluster');
  console.log('4. Replace the placeholder values in .env.local with your actual credentials');
  console.log('5. Restart your development server');
}

console.log('');
console.log('🔧 To get your Pusher credentials:');
console.log('1. Visit: https://dashboard.pusher.com/');
console.log('2. Create a new app or use an existing one');
console.log('3. Go to App Keys section');
console.log('4. Copy the values to your .env.local file');
console.log('');
console.log('📁 Your .env.local file is located at:', envPath); 