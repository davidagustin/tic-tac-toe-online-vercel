# Deployment Guide

## Current Status

✅ **Local Development**: Working with new Pusher credentials  
⚠️ **Production**: Needs environment variable update

## Required Environment Variables for Production

You need to update your Vercel environment variables with these new Pusher credentials:

```
PUSHER_APP_ID=2024852
NEXT_PUBLIC_PUSHER_KEY=09915e27605d8b2d1cda
PUSHER_SECRET=ef9b3bdfe1431d0a6a83
NEXT_PUBLIC_PUSHER_CLUSTER=us3
```

## Steps to Update Vercel Environment Variables

1. **Go to Vercel Dashboard**:
   - Visit https://vercel.com/dashboard
   - Select your `tic-tac-toe-online-vercel` project

2. **Navigate to Settings**:
   - Click on the "Settings" tab
   - Select "Environment Variables" from the left sidebar

3. **Update Each Variable**:
   - Find each Pusher variable and click "Edit"
   - Update with the new values above
   - Make sure to select "Production" environment
   - Click "Save"

4. **Redeploy**:
   - After updating all variables, go to "Deployments" tab
   - Click "Redeploy" on the latest deployment

## Verify the Update

After updating the environment variables and redeploying, test:

```bash
# Test server connection
curl https://tic-tac-toe-online-vercel.vercel.app/api/test-pusher-connection

# Test client configuration
curl https://tic-tac-toe-online-vercel.vercel.app/api/pusher-config
```

You should see the new key `09915e27605d8b2d1cda` in the response.

## Current Production Status

- ✅ Server-side Pusher connection: Working
- ⚠️ Client-side configuration: Using old credentials
- ✅ Application functionality: Working with fallback mode
- ✅ Real-time features: Will work after credential update

## Local Development

Local development is working perfectly with the new credentials:

```bash
npm run dev
```

Test local connection:
```bash
curl http://localhost:3001/api/test-pusher-connection
``` 