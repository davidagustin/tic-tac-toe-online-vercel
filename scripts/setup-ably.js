const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Ably configuration...');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (envExists) {
    console.log('📁 Found existing .env.local file');

    // Read current content
    const currentContent = fs.readFileSync(envPath, 'utf8');

    // Check if ABLY_API_KEY is already set
    if (currentContent.includes('ABLY_API_KEY=')) {
        console.log('⚠️  ABLY_API_KEY is already configured in .env.local');
        console.log('   Please update it with your complete Ably API key');
    } else {
        console.log('➕ Adding ABLY_API_KEY to .env.local...');

        // Add Ably configuration
        const ablyConfig = '\n# Ably Configuration\nABLY_API_KEY=your_ably_api_key_here\n';
        fs.appendFileSync(envPath, ablyConfig);
        console.log('✅ Added ABLY_API_KEY to .env.local');
    }
} else {
    console.log('📁 Creating new .env.local file...');

    // Create new .env.local with Ably configuration
    const envContent = `# Environment Variables
# Database
POSTGRES_URL=your_postgres_url_here
POSTGRES_HOST=your_postgres_host_here
POSTGRES_DATABASE=your_postgres_database_here
POSTGRES_USERNAME=your_postgres_username_here
POSTGRES_PASSWORD=your_postgres_password_here

# Ably Configuration
ABLY_API_KEY=your_ably_api_key_here
`;

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env.local with Ably configuration');
}

console.log('\n📋 Next steps:');
console.log('1. Get your Ably API key from https://ably.com/accounts/any/apps/any/keys');
console.log('2. Replace "your_ably_api_key_here" in .env.local with your actual API key');
console.log('3. The API key should look like: "VR3MuQ.KvwwJA:your_secret_here"');
console.log('4. Restart your development server after updating the environment variables');
console.log('\n🔗 Ably Documentation: https://ably.com/docs/getting-started/tutorial'); 