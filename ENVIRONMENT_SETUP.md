# Environment-Specific Pusher Configuration

This guide explains how to set up different Pusher keys for development, staging, and production environments.

## Environment Detection

The application uses the following priority for environment detection:
1. `APP_ENV` environment variable (custom)
2. `NODE_ENV` environment variable (standard)

## Environment Variables Structure

### Development Environment
```env
# Development-specific Pusher keys
PUSHER_APP_ID_DEV="your_dev_app_id"
NEXT_PUBLIC_PUSHER_KEY_DEV="your_dev_key"
PUSHER_SECRET_DEV="your_dev_secret"
NEXT_PUBLIC_PUSHER_CLUSTER_DEV="us3"

# Fallback to general keys (optional)
PUSHER_APP_ID="your_dev_app_id"
NEXT_PUBLIC_PUSHER_KEY="your_dev_key"
PUSHER_SECRET="your_dev_secret"
NEXT_PUBLIC_PUSHER_CLUSTER="us3"
```

### Staging Environment
```env
# Staging-specific Pusher keys
PUSHER_APP_ID_STAGING="your_staging_app_id"
NEXT_PUBLIC_PUSHER_KEY_STAGING="your_staging_key"
PUSHER_SECRET_STAGING="your_staging_secret"
NEXT_PUBLIC_PUSHER_CLUSTER_STAGING="us3"

# Fallback to general keys (optional)
PUSHER_APP_ID="your_staging_app_id"
NEXT_PUBLIC_PUSHER_KEY="your_staging_key"
PUSHER_SECRET="your_staging_secret"
NEXT_PUBLIC_PUSHER_CLUSTER="us3"
```

### Production Environment
```env
# Production-specific Pusher keys
PUSHER_APP_ID_PROD="your_production_app_id"
NEXT_PUBLIC_PUSHER_KEY_PROD="your_production_key"
PUSHER_SECRET_PROD="your_production_secret"
NEXT_PUBLIC_PUSHER_CLUSTER_PROD="us3"

# Fallback to general keys (optional)
PUSHER_APP_ID="your_production_app_id"
NEXT_PUBLIC_PUSHER_KEY="your_production_key"
PUSHER_SECRET="your_production_secret"
NEXT_PUBLIC_PUSHER_CLUSTER="us3"
```

## Setup Instructions

### 1. Create Separate Pusher Apps

1. **Development App**
   - Go to [Pusher Dashboard](https://dashboard.pusher.com/)
   - Create a new app named "Tic-Tac-Toe Development"
   - Note down: App ID, Key, Secret, Cluster

2. **Staging App**
   - Create another app named "Tic-Tac-Toe Staging"
   - Note down: App ID, Key, Secret, Cluster

3. **Production App**
   - Create another app named "Tic-Tac-Toe Production"
   - Note down: App ID, Key, Secret, Cluster

### 2. Local Development Setup

Create `.env.local` with development keys:
```env
# Environment
APP_ENV=development

# Development Pusher Configuration
PUSHER_APP_ID_DEV="your_dev_app_id"
NEXT_PUBLIC_PUSHER_KEY_DEV="your_dev_key"
PUSHER_SECRET_DEV="your_dev_secret"
NEXT_PUBLIC_PUSHER_CLUSTER_DEV="us3"

# Database Configuration
DATABASE_URL="your_database_url"
PGHOST_UNPOOLED="localhost"

# Next.js Configuration
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3001"
```

### 3. Vercel Environment Setup

#### Development Environment (Preview Deployments)
```bash
# Add development environment variables
vercel env add PUSHER_APP_ID_DEV preview
vercel env add NEXT_PUBLIC_PUSHER_KEY_DEV preview
vercel env add PUSHER_SECRET_DEV preview
vercel env add NEXT_PUBLIC_PUSHER_CLUSTER_DEV preview
vercel env add APP_ENV preview
```

#### Staging Environment
```bash
# Add staging environment variables
vercel env add PUSHER_APP_ID_STAGING production
vercel env add NEXT_PUBLIC_PUSHER_KEY_STAGING production
vercel env add PUSHER_SECRET_STAGING production
vercel env add NEXT_PUBLIC_PUSHER_CLUSTER_STAGING production
vercel env add APP_ENV production
```

#### Production Environment
```bash
# Add production environment variables
vercel env add PUSHER_APP_ID_PROD production
vercel env add NEXT_PUBLIC_PUSHER_KEY_PROD production
vercel env add PUSHER_SECRET_PROD production
vercel env add NEXT_PUBLIC_PUSHER_CLUSTER_PROD production
vercel env add APP_ENV production
```

### 4. Environment-Specific Deployments

#### For Staging
```bash
# Deploy to staging with staging environment
APP_ENV=staging vercel --prod
```

#### For Production
```bash
# Deploy to production with production environment
APP_ENV=production vercel --prod
```

## Testing Environment Configuration

### 1. Check Current Environment
Visit `/api/pusher-config` to see which environment is active and which keys are being used.

### 2. Environment Detection Test
```bash
# Test environment detection
curl https://your-app.vercel.app/api/pusher-config
```

Expected response:
```json
{
  "environment": "production",
  "key": "your_production_key",
  "cluster": "us3",
  "timestamp": "2025-07-20T01:30:00.000Z"
}
```

## Benefits of Environment-Specific Keys

1. **Isolation**: Each environment has its own Pusher app, preventing cross-environment interference
2. **Security**: Production keys are separate from development keys
3. **Monitoring**: Each environment can be monitored independently in Pusher dashboard
4. **Testing**: Staging environment can be tested without affecting production users
5. **Debugging**: Easier to debug issues in specific environments

## Troubleshooting

### Common Issues

1. **Wrong Environment Detected**
   - Check `APP_ENV` environment variable
   - Verify `NODE_ENV` is set correctly

2. **Keys Not Loading**
   - Ensure environment-specific keys are set
   - Check fallback keys are available

3. **Pusher Connection Issues**
   - Verify keys match the Pusher app
   - Check cluster configuration
   - Ensure app is active in Pusher dashboard

### Debug Commands

```bash
# Check current environment variables
vercel env ls

# Test environment detection
node -e "console.log('NODE_ENV:', process.env.NODE_ENV); console.log('APP_ENV:', process.env.APP_ENV);"

# Verify Pusher configuration
curl https://your-app.vercel.app/api/pusher-config
```

## Migration from Single Environment

If you're migrating from a single Pusher app setup:

1. **Keep existing keys** as fallbacks
2. **Add environment-specific keys** with `_DEV`, `_STAGING`, `_PROD` suffixes
3. **Test each environment** individually
4. **Remove fallback keys** once confirmed working

## Security Best Practices

1. **Never commit environment variables** to version control
2. **Use different Pusher apps** for each environment
3. **Rotate keys regularly** for production
4. **Monitor Pusher dashboard** for unusual activity
5. **Use environment-specific domains** for each deployment 