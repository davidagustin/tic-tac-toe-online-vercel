# Deployment Guide

This guide explains how to deploy the Tic-Tac-Toe game application.

## Architecture

The application consists of two parts:
1. **Next.js Frontend** - Deployed on Vercel
2. **Socket.IO Server** - Deployed separately (Railway, Render, or similar)

## Step 1: Deploy Socket.IO Server

### Option A: Deploy on Railway

1. Create a new project on [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Create a new service and select "Deploy from GitHub repo"
4. Set the following environment variables:
   ```
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```
5. Set the root directory to `/` (or wherever you place the socket-server.js file)
6. Deploy the service

### Option B: Deploy on Render

1. Create a new Web Service on [Render](https://render.com/)
2. Connect your GitHub repository
3. Set the build command: `npm install`
4. Set the start command: `node socket-server.js`
5. Set environment variables:
   ```
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

### Option C: Deploy on Heroku

1. Create a new app on [Heroku](https://heroku.com/)
2. Connect your GitHub repository
3. Set environment variables in the Heroku dashboard
4. Deploy the app

## Step 2: Deploy Next.js App on Vercel

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com/)
3. Set the following environment variables in Vercel:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-socket-server-url.com
   ```
4. Deploy the app

## Environment Variables

### For Socket.IO Server
- `NODE_ENV`: Set to `production`
- `FRONTEND_URL`: The URL of your deployed Next.js app
- `PORT`: The port to run the server on (usually set by the hosting platform)

### For Next.js App
- `NEXT_PUBLIC_SOCKET_URL`: The URL of your deployed Socket.IO server

## Local Development

1. Start the Socket.IO server:
   ```bash
   node socket-server.js
   ```

2. Start the Next.js development server:
   ```bash
   npm run dev
   ```

3. Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   ```

## Testing the Deployment

1. Open your deployed Next.js app
2. Create a game
3. Open the app in another browser/incognito window
4. Join the game
5. Verify that real-time communication works

## Troubleshooting

### Socket.IO Connection Issues
- Check that the `NEXT_PUBLIC_SOCKET_URL` environment variable is set correctly
- Verify that the Socket.IO server is running and accessible
- Check CORS settings on the Socket.IO server

### Game Not Working
- Check browser console for errors
- Verify that both servers are running
- Check that the Socket.IO server URL is correct

## Security Notes

- The Socket.IO server includes rate limiting and input validation
- All user inputs are sanitized
- Security events are logged
- CORS is configured for production

## Performance

- The Socket.IO server uses in-memory storage for games
- Games are automatically cleaned up when players leave
- Rate limiting prevents abuse
- Connection pooling is used for database connections (when configured) 