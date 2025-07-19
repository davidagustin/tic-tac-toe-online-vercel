// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('Environment variables check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL length:', process.env.DATABASE_URL.length);
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 20) + '...');
} else {
  console.log('DATABASE_URL is not set!');
} 