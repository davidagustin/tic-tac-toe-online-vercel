# Vercel Postgres Setup Guide

## Step 1: Create Vercel Postgres Database

1. **Go to your Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your project

2. **Navigate to Storage**
   - Click on the "Storage" tab in your project dashboard
   - Click "Create Database"

3. **Configure Database**
   - Choose "Postgres" as the database type
   - Select your preferred region
   - Click "Create"

4. **Get Connection Details**
   - Vercel will automatically add the `DATABASE_URL` environment variable
   - You can find it in the "Environment Variables" section

## Step 2: Deploy Your Application

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add Vercel Postgres support"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Vercel will automatically detect the changes
   - The database will be initialized on first request

## Step 3: Test Your Application

1. **Check the deployment**
   - Visit your Vercel deployment URL
   - The database table will be created automatically

2. **Test chat functionality**
   - Enter your name when prompted
   - Try sending messages in the lobby
   - Verify messages are stored and retrieved

## Environment Variables

Vercel automatically adds these environment variables:
```env
DATABASE_URL=postgresql://username:password@host:port/database
```

## Database Schema

The application automatically creates this table:
```sql
CREATE TABLE IF NOT EXISTS chatRoomText (
  id SERIAL PRIMARY KEY,
  text VARCHAR(120) NOT NULL
);
```

## Benefits of Vercel Postgres

- ✅ **Free Tier**: 256MB storage, 10GB bandwidth
- ✅ **Automatic Setup**: No manual database configuration
- ✅ **SSL by Default**: Secure connections
- ✅ **Connection Pooling**: Optimized for serverless
- ✅ **Auto-scaling**: Handles traffic spikes
- ✅ **Native Integration**: Works seamlessly with Vercel

## Troubleshooting

**If you get connection errors:**
1. Check that `DATABASE_URL` is set in Vercel
2. Ensure your code is deployed to Vercel
3. Check the Vercel function logs for errors

**If the table isn't created:**
1. The table is created on the first API request
2. Check the browser console for any errors
3. Verify the API routes are working

## Local Development

For local development, you can use:
- **Supabase** (free tier)
- **Neon** (free tier)
- **Local Postgres** installation

Just set the `DATABASE_URL` environment variable in your `.env.local` file. 