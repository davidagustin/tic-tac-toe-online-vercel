#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the current .env.local file
const envPath = path.join(__dirname, '../.env.local');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Add or update the development environment variables
const devVars = [
  'NODE_ENV=development',
  'PUSHER_APP_ID=2024852',
  'NEXT_PUBLIC_PUSHER_KEY=09915e27605d8b2d1cda',
  'PUSHER_SECRET=ef9b3bdfe1431d0a6a83',
  'NEXT_PUBLIC_PUSHER_CLUSTER=us3'
];

// Check if these variables already exist
const existingVars = new Set();
const lines = envContent.split('\n');
const updatedLines = [];

for (const line of lines) {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const [key] = trimmedLine.split('=');
    if (key) {
      existingVars.add(key);
    }
  }
  updatedLines.push(line);
}

// Add missing variables
for (const varLine of devVars) {
  const [key] = varLine.split('=');
  if (!existingVars.has(key)) {
    updatedLines.push(varLine);
    console.log(`Added: ${key}`);
  } else {
    console.log(`Already exists: ${key}`);
  }
}

// Write back to .env.local
const updatedContent = updatedLines.join('\n');
fs.writeFileSync(envPath, updatedContent);

console.log('Environment variables set up for development!');
console.log('You can now start the development server with: npm run dev'); 