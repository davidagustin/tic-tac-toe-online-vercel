# �� Tic-Tac-Toe Online

A modern, real-time multiplayer Tic-Tac-Toe game built with Next.js, TypeScript, and Pusher.

![Next.js](https://img.shields.io/badge/Next.js-15.4.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC)
![Pusher](https://img.shields.io/badge/Pusher-Real--time-orange)

## ✨ Features

- **Real-time Multiplayer**: Play against other players in real-time using Pusher
- **Beautiful UI**: Modern glass-morphism design with Tailwind CSS
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Live Chat**: Chat with opponents during games and in the lobby
- **User Authentication**: Simple username/password system
- **Game Statistics**: Track wins, losses, and draws
- **Fallback Support**: API polling fallback when WebSocket connections fail
- **TypeScript**: Fully typed for better developer experience

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon DB recommended)
- Pusher account for real-time features

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/davidagustin/tic-tac-toe-online-vercel.git
   cd tic-tac-toe-online-vercel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@host:port/database"
   
   # Pusher Configuration
   PUSHER_APP_ID="your_app_id"
   PUSHER_KEY="your_key"
   PUSHER_SECRET="your_secret"
   PUSHER_CLUSTER="your_cluster"
   
   # Next.js
   NEXTAUTH_SECRET="your-secret-key"
   ```

4. **Initialize the database**
   ```bash
   node scripts/init-db.js
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Visit `http://localhost:3000` to start playing!

## 🏗️ Tech Stack

- **Frontend**: Next.js 15.4.2, React 19, TypeScript
- **Styling**: Tailwind CSS with custom glass-morphism components
- **Real-time**: Pusher (WebSockets) with API polling fallback
- **Database**: PostgreSQL with connection pooling
- **Authentication**: Custom username/password system
- **Deployment**: Vercel
- **Testing**: Playwright for E2E testing

## 🎯 Game Features

### 🎮 Gameplay
- Classic 3x3 Tic-Tac-Toe rules
- Real-time moves with instant synchronization
- Turn-based gameplay with visual indicators
- Win/draw detection with animations

### 💬 Chat System
- Lobby chat for all users
- Private game chat between opponents
- Real-time message delivery
- Message validation and security

### 📊 Statistics
- Track wins, losses, and draws
- User profiles with game history
- Leaderboard functionality

## 🛠️ Development

### Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Testing
npm run test:e2e        # Run E2E tests
npm run test:e2e:ui     # Run tests with UI

# Database
node scripts/init-db.js      # Initialize database
node scripts/clear-games.js  # Clear game data
```

### Project Structure

```
tic-tac-toe-online-vercel/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   └── page.tsx        # Home page
├── components/         # React components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── scripts/            # Database and setup scripts
├── tests/              # E2E tests
└── types/              # TypeScript type definitions
```

## 🔧 Configuration

### Pusher Setup
1. Create a Pusher account at [pusher.com](https://pusher.com)
2. Create a new app
3. Add your credentials to `.env.local`

### Database Setup
1. Create a PostgreSQL database (Neon DB recommended)
2. Add your database URL to `.env.local`
3. Run the initialization script

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🐛 Issues & Support

If you encounter any issues or have questions:
1. Check existing [Issues](https://github.com/davidagustin/tic-tac-toe-online-vercel/issues)
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## 🎉 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- Real-time features powered by [Pusher](https://pusher.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Deployed on [Vercel](https://vercel.com/)

---

**Enjoy playing Tic-Tac-Toe Online! 🎮**
