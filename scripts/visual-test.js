#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎨 Starting Visual Testing with Chromatic...\n');

// Check if Chromatic project token is set
const projectToken = process.env.CHROMATIC_PROJECT_TOKEN || 'YOUR_CHROMATIC_PROJECT_TOKEN';

if (projectToken === 'YOUR_CHROMATIC_PROJECT_TOKEN') {
  console.log('⚠️  Warning: CHROMATIC_PROJECT_TOKEN not set. Using placeholder token.');
  console.log('   To set up Chromatic:');
  console.log('   1. Go to https://www.chromatic.com/');
  console.log('   2. Create a new project');
  console.log('   3. Get your project token');
  console.log('   4. Set CHROMATIC_PROJECT_TOKEN environment variable\n');
}

// Build Storybook
console.log('📦 Building Storybook...');
try {
  execSync('npm run build-storybook', { stdio: 'inherit' });
  console.log('✅ Storybook built successfully\n');
} catch (error) {
  console.error('❌ Failed to build Storybook');
  process.exit(1);
}

// Run Chromatic
console.log('🚀 Running Chromatic visual tests...');
try {
  const chromaticCommand = `npx chromatic --project-token=${projectToken} --storybook-build-dir=storybook-static --exit-zero-on-changes`;
  execSync(chromaticCommand, { stdio: 'inherit' });
  console.log('✅ Chromatic tests completed successfully\n');
} catch (error) {
  console.error('❌ Chromatic tests failed');
  process.exit(1);
}

console.log('🎉 Visual testing completed!');
console.log('📊 Check your Chromatic dashboard for detailed results'); 