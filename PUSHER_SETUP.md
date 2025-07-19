# Pusher Setup Guide

This application now uses Pusher for real-time communication instead of Socket.IO, which makes it compatible with Vercel deployment.

## Step 1: Create a Pusher Account

1. Go to [https://pusher.com/](https://pusher.com/)
2. Sign up for a free account
3. Create a new Channels app

## Step 2: Get Your Pusher Credentials

After creating your app, you'll get:
- App ID
- Key
- Secret
- Cluster (usually "us3" for US)

## Step 3: Configure Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/tic_tac_toe"
PGHOST_UNPOOLED="localhost"

# Pusher Configuration (Replace with your actual Pusher credentials)
PUSHER_APP_ID="your_pusher_app_id"
NEXT_PUBLIC_PUSHER_KEY="your_pusher_key"
PUSHER_SECRET="your_pusher_secret"
NEXT_PUBLIC_PUSHER_CLUSTER="us3"

# Next.js Configuration
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3001"
```

## Step 4: Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add the same environment variables in your Vercel project settings
4. Deploy!

## How It Works

- **Client-side**: Uses `pusher-js` to connect to Pusher channels
- **Server-side**: Uses `pusher` to trigger events to connected clients
- **API Routes**: Handle game logic and trigger Pusher events
- **Real-time Updates**: All game state changes are broadcast via Pusher

## Benefits of Pusher over Socket.IO

1. **Vercel Compatibility**: Works perfectly with Vercel's serverless functions
2. **Scalability**: Handles thousands of concurrent connections
3. **Reliability**: Built-in reconnection and error handling
4. **Security**: Automatic authentication and authorization
5. **Monitoring**: Built-in analytics and debugging tools

## Testing

1. Run `npm run dev` to start the development server
2. Open multiple browser tabs to test multiplayer functionality
3. Create games, join games, and make moves to test real-time updates

## Troubleshooting

- Make sure all environment variables are set correctly
- Check the browser console for connection errors
- Verify your Pusher app is active and has the correct cluster
- Ensure your Vercel environment variables match your local ones 