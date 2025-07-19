# 🎮 Tic-Tac-Toe Online - Next.js 15 + Pusher + Vercel

A modern, real-time multiplayer Tic-Tac-Toe game built with Next.js 15, Pusher for real-time communication, PostgreSQL database, and deployed on Vercel with best practices.

## ✨ Features

- **Real-time Multiplayer Gameplay** - Instant game updates using Pusher
- **Live Chat System** - In-game and lobby chat with message persistence
- **Modern UI/UX** - Beautiful, responsive design with Tailwind CSS
- **TypeScript Support** - Full type safety throughout the application
- **Database Integration** - PostgreSQL with connection pooling and optimization
- **Authentication System** - User registration and login with bcrypt
- **Game Statistics** - Track wins, losses, and player rankings
- **Health Monitoring** - Comprehensive health checks for all services
- **Security Best Practices** - CSP headers, rate limiting, input validation
- **Performance Optimized** - Bundle splitting, caching, and lazy loading

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn** package manager
- **PostgreSQL** database (Vercel Postgres recommended)
- **Pusher** account for real-time features

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tic-tac-toe-online-vercel.git
   cd tic-tac-toe-online-vercel
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/tic_tac_toe"
   
   # Pusher Configuration
   PUSHER_APP_ID="your_pusher_app_id"
   NEXT_PUBLIC_PUSHER_KEY="your_pusher_key"
   PUSHER_SECRET="your_pusher_secret"
   NEXT_PUBLIC_PUSHER_CLUSTER="us3"
   
   # Optional: Encryption for private channels
   PUSHER_ENCRYPTION_MASTER_KEY="your_encryption_key"
   
   # Next.js
   NEXTAUTH_SECRET="your_nextauth_secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Set up the database**
   
   **Option A: Vercel Postgres (Recommended)**
   - Create a Vercel Postgres database
   - Copy the connection string to your `.env.local`
   - The schema will be automatically created on first run
   
   **Option B: Local PostgreSQL**
   ```bash
   # Create database
   createdb tic_tac_toe
   
   # Run schema (optional - will be auto-created)
   psql -d tic_tac_toe -f db/setup.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, PostCSS
- **Real-time**: Pusher Channels
- **Database**: PostgreSQL with connection pooling
- **Authentication**: bcrypt for password hashing
- **Deployment**: Vercel
- **Testing**: Playwright (E2E), Vitest (Unit)
- **Storybook**: Component development and testing

### Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── game/          # Game logic endpoints
│   │   ├── health-check/  # Health monitoring
│   │   └── test-*/        # Testing endpoints
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── App.tsx           # Main app component
│   ├── Game.tsx          # Game board
│   ├── Lobby.tsx         # Game lobby
│   └── Auth.tsx          # Authentication
├── hooks/                # Custom React hooks
│   └── usePusher.ts      # Pusher integration
├── lib/                  # Utility libraries
│   ├── db.ts            # Database operations
│   ├── pusher.ts        # Pusher configuration
│   ├── auth.ts          # Authentication logic
│   └── security.ts      # Security utilities
├── scripts/              # Utility scripts
│   ├── test-db.js       # Database testing
│   └── test-game-flow.js # Game flow testing
├── tests/                # E2E tests
├── stories/              # Storybook stories
└── public/               # Static assets
```

## 🎯 Best Practices Implemented

### Performance
- **Bundle Optimization**: Webpack code splitting and tree shaking
- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Caching**: Strategic cache headers for static assets
- **Database**: Connection pooling and query optimization
- **Lazy Loading**: Component and route-based code splitting

### Security
- **Content Security Policy**: Strict CSP headers
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive data sanitization
- **Authentication**: Secure password hashing with bcrypt
- **HTTPS**: Enforced TLS in production
- **CORS**: Proper cross-origin resource sharing

### Reliability
- **Error Handling**: Comprehensive error boundaries
- **Health Checks**: Database, Pusher, and memory monitoring
- **Retry Logic**: Database connection retry with exponential backoff
- **Fallback Mechanisms**: API polling when Pusher fails
- **Graceful Degradation**: App works without real-time features

### Developer Experience
- **TypeScript**: Full type safety
- **ESLint**: Code quality enforcement
- **Prettier**: Consistent code formatting
- **Storybook**: Component development environment
- **Testing**: E2E and unit test coverage

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect to Vercel**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**
   - Go to your Vercel dashboard
   - Add all environment variables from `.env.local`
   - Redeploy if needed

### Environment Variables for Production

```env
# Database
DATABASE_URL="your_vercel_postgres_connection_string"

# Pusher
PUSHER_APP_ID="your_pusher_app_id"
NEXT_PUBLIC_PUSHER_KEY="your_pusher_key"
PUSHER_SECRET="your_pusher_secret"
NEXT_PUBLIC_PUSHER_CLUSTER="us3"

# Security
NEXTAUTH_SECRET="your_secure_random_string"
NEXTAUTH_URL="https://your-domain.vercel.app"
```

## 🧪 Testing

### Run Tests

```bash
# E2E tests with Playwright
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# Visual regression tests
npm run test:visual

# Database tests
node scripts/test-db.js

# Game flow tests
node scripts/test-game-flow.js
```

### Health Checks

```bash
# Local health check
curl http://localhost:3000/api/health-check

# Production health check
curl https://your-domain.vercel.app/api/health-check
```

## 📊 Monitoring

### Health Endpoints

- `/api/health-check` - Comprehensive system health
- `/api/test-database` - Database connectivity test
- `/api/test-pusher-connection` - Pusher connectivity test
- `/api/test-game-flow` - Full game flow test

### Performance Monitoring

- Database query performance logging
- Pusher connection status monitoring
- Memory usage tracking
- Response time monitoring

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm run test:e2e     # Run E2E tests
npm run test:visual  # Run visual tests
npm run lint         # Run ESLint

# Storybook
npm run storybook    # Start Storybook
npm run build-storybook # Build Storybook

# Database
node scripts/test-db.js        # Test database
node scripts/test-game-flow.js # Test game flow
```

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npx tsc --noEmit

# Format code
npx prettier --write .
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build process or auxiliary tool changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Pusher](https://pusher.com/) - Real-time communication
- [Vercel](https://vercel.com/) - Deployment platform
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [PostgreSQL](https://www.postgresql.org/) - Database

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/tic-tac-toe-online-vercel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/tic-tac-toe-online-vercel/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/tic-tac-toe-online-vercel/wiki)

---

**Happy Gaming! 🎮**
