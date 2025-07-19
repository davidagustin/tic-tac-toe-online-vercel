# Deployment Guide

This guide will help you deploy the Tic-Tac-Toe application to production.

## Architecture

The application consists of:
1. **Next.js Frontend** - Deployed on Vercel
2. **Pusher** - Real-time communication service
3. **PostgreSQL Database** - Deployed on Vercel Postgres

## Step 1: Set up Pusher

1. Go to [https://pusher.com/](https://pusher.com/)
2. Create a free account
3. Create a new Channels app
4. Get your credentials:
   - App ID
   - Key
   - Secret
   - Cluster (usually "us3")

## Step 2: Set up Vercel Postgres

1. Go to your Vercel dashboard
2. Create a new Postgres database
3. Copy the connection string

## Step 3: Deploy to Vercel

### Environment Variables

Set these environment variables in your Vercel project:

```env
# Database
DATABASE_URL="your_vercel_postgres_connection_string"
PGHOST_UNPOOLED="your_postgres_host"

# Pusher
PUSHER_APP_ID="your_pusher_app_id"
NEXT_PUBLIC_PUSHER_KEY="your_pusher_key"
PUSHER_SECRET="your_pusher_secret"
NEXT_PUBLIC_PUSHER_CLUSTER="us3"

# Next.js
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="https://your-domain.vercel.app"
```

### Deploy Steps

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add the environment variables above
4. Deploy!

## Step 4: Database Setup

1. Run the database migrations:
   ```sql
   -- This will be done automatically by Vercel Postgres
   -- The schema is in db/setup.sql
   ```

## Troubleshooting

### Connection Issues
- Verify that all environment variables are set correctly
- Check that your Pusher app is active
- Ensure your database connection string is correct

### Real-time Issues
- Check that Pusher credentials are correct
- Verify that the cluster matches your Pusher app
- Check browser console for connection errors

### Database Issues
- Verify the DATABASE_URL is correct
- Check that the database is accessible
- Ensure the schema has been applied

## Security Considerations

- All API routes include rate limiting and input validation
- Pusher provides built-in authentication and authorization
- Database connections use connection pooling
- CORS is configured for production

## Monitoring

- Vercel provides built-in analytics and monitoring
- Pusher dashboard shows connection metrics
- Database performance can be monitored in Vercel dashboard

## Scaling

- Vercel automatically scales based on traffic
- Pusher handles thousands of concurrent connections
- Database connections are pooled for efficiency 