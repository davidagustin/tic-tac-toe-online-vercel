#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔑 Updating Pusher Credentials');
console.log('==============================\n');

const envPath = path.join(__dirname, '..', '.env.local');

// New valid Pusher credentials
const newCredentials = {
  PUSHER_APP_ID: '2024852',
  NEXT_PUBLIC_PUSHER_KEY: '09915e27605d8b2d1cda',
  PUSHER_SECRET: 'ef9b3bdfe1431d0a6a83',
  NEXT_PUBLIC_PUSHER_CLUSTER: 'us3'
};

try {
  // Read current .env.local file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  console.log('📝 Current .env.local content:');
  console.log(envContent);
  console.log('\n🔄 Updating with new credentials...\n');
  
  // Update each Pusher credential
  Object.entries(newCredentials).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const replacement = `${key}="${value}"`;
    
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, replacement);
      console.log(`✅ Updated ${key}`);
    } else {
      console.log(`❌ Could not find ${key} in .env.local`);
    }
  });
  
  // Write updated content back to file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ Successfully updated .env.local with new Pusher credentials!');
  console.log('\n🔄 Please restart your development server:');
  console.log('npm run dev');
  console.log('\n🧪 Test the connection:');
  console.log('curl http://localhost:3001/api/test-pusher-connection');
  
} catch (error) {
  console.error('❌ Error updating .env.local:', error.message);
  console.log('\n📝 Please manually update your .env.local file with these credentials:');
  Object.entries(newCredentials).forEach(([key, value]) => {
    console.log(`${key}="${value}"`);
  });
} 