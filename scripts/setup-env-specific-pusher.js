#!/usr/bin/env node

/**
 * Setup Environment-Specific Pusher Configuration
 * 
 * This script helps you set up different Pusher keys for development, staging, and production environments.
 * Run this script to configure your environment variables.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupEnvironmentSpecificPusher() {
  console.log('🚀 Environment-Specific Pusher Setup\n');
  console.log('This script will help you configure Pusher keys for different environments.\n');

  // Get current environment variables
  const envPath = path.join(__dirname, '..', '.env.local');
  let currentEnvContent = '';
  
  if (fs.existsSync(envPath)) {
    currentEnvContent = fs.readFileSync(envPath, 'utf8');
    console.log('📝 Current .env.local found. Backing up existing configuration...\n');
  }

  console.log('Please provide your Pusher credentials for each environment:\n');

  // Development Environment
  console.log('🔧 DEVELOPMENT ENVIRONMENT');
  console.log('Create a Pusher app for development at: https://dashboard.pusher.com/\n');
  
  const devAppId = await question('Development App ID: ');
  const devKey = await question('Development Key: ');
  const devSecret = await question('Development Secret: ');
  const devCluster = await question('Development Cluster (e.g., us3): ') || 'us3';

  console.log('\n📋 STAGING ENVIRONMENT');
  console.log('Create a Pusher app for staging at: https://dashboard.pusher.com/\n');
  
  const stagingAppId = await question('Staging App ID: ');
  const stagingKey = await question('Staging Key: ');
  const stagingSecret = await question('Staging Secret: ');
  const stagingCluster = await question('Staging Cluster (e.g., us3): ') || 'us3';

  console.log('\n🚀 PRODUCTION ENVIRONMENT');
  console.log('Create a Pusher app for production at: https://dashboard.pusher.com/\n');
  
  const prodAppId = await question('Production App ID: ');
  const prodKey = await question('Production Key: ');
  const prodSecret = await question('Production Secret: ');
  const prodCluster = await question('Production Cluster (e.g., us3): ') || 'us3';

  // Generate new .env.local content
  const newEnvContent = `# Environment-Specific Pusher Configuration
# Generated on ${new Date().toISOString()}

# Environment Detection
APP_ENV=development

# Development Environment
PUSHER_APP_ID_DEV="${devAppId}"
NEXT_PUBLIC_PUSHER_KEY_DEV="${devKey}"
PUSHER_SECRET_DEV="${devSecret}"
NEXT_PUBLIC_PUSHER_CLUSTER_DEV="${devCluster}"

# Staging Environment
PUSHER_APP_ID_STAGING="${stagingAppId}"
NEXT_PUBLIC_PUSHER_KEY_STAGING="${stagingKey}"
PUSHER_SECRET_STAGING="${stagingSecret}"
NEXT_PUBLIC_PUSHER_CLUSTER_STAGING="${stagingCluster}"

# Production Environment
PUSHER_APP_ID_PROD="${prodAppId}"
NEXT_PUBLIC_PUSHER_KEY_PROD="${prodKey}"
PUSHER_SECRET_PROD="${prodSecret}"
NEXT_PUBLIC_PUSHER_CLUSTER_PROD="${prodCluster}"

# Fallback Configuration (for backward compatibility)
PUSHER_APP_ID="${devAppId}"
NEXT_PUBLIC_PUSHER_KEY="${devKey}"
PUSHER_SECRET="${devSecret}"
NEXT_PUBLIC_PUSHER_CLUSTER="${devCluster}"

# Database Configuration
DATABASE_URL="postgresql://neondb_owner:npg_VRHpdC9L6ihX@ep-cold-leaf-adp98vo6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
PGHOST_UNPOOLED="localhost"

# Next.js Configuration
NEXTAUTH_SECRET="dhqiasTf2JAaLfeKd1pElwnDnAmoTvxd16mG/KNtbwc="
NEXTAUTH_URL="http://localhost:3001"
`;

  // Write the new configuration
  fs.writeFileSync(envPath, newEnvContent);

  console.log('\n✅ Environment-specific Pusher configuration created!\n');
  console.log('📁 File: .env.local');
  console.log('🔧 Environment: Development (default)');
  console.log('📋 Staging: Set APP_ENV=staging');
  console.log('🚀 Production: Set APP_ENV=production\n');

  console.log('📋 Next Steps:');
  console.log('1. Test the configuration: npm run dev');
  console.log('2. Check environment detection: curl http://localhost:3001/api/pusher-config');
  console.log('3. Set up Vercel environment variables for staging and production');
  console.log('4. Deploy to different environments with appropriate APP_ENV values\n');

  console.log('🔧 Vercel Commands:');
  console.log('# For staging deployment:');
  console.log('APP_ENV=staging vercel --prod');
  console.log('');
  console.log('# For production deployment:');
  console.log('APP_ENV=production vercel --prod\n');

  console.log('📚 For more information, see: ENVIRONMENT_SETUP.md');

  rl.close();
}

// Handle script execution
if (require.main === module) {
  setupEnvironmentSpecificPusher().catch((error) => {
    console.error('❌ Error setting up environment-specific Pusher:', error);
    process.exit(1);
  });
}

module.exports = { setupEnvironmentSpecificPusher }; 