# Tic-Tac-Toe Online - Next.js Version

A real-time multiplayer Tic-Tac-Toe game built with Next.js, Socket.IO, and MySQL.

## Features

- Real-time multiplayer gameplay
- Live chat rooms for both lobby and game
- Modern UI with Tailwind CSS
- TypeScript support
- Socket.IO for real-time communication

## Prerequisites

- Node.js (v18 or higher)
- Database (Vercel Postgres recommended - see [Vercel Postgres Setup Guide](./VERCEL_POSTGRES_SETUP.md))
- npm or yarn

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tic-tac-toe-online-vercel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   
   **Option A: Vercel Postgres (Recommended)**
   - Follow the [Vercel Postgres Setup Guide](./VERCEL_POSTGRES_SETUP.md)
   - No local database setup required
   - Automatic environment variable configuration
   
   **Option B: Local Postgres**
   - Install Postgres locally
   - Run the setup script:
   ```bash
   psql -U your_username -d your_database -f db/setup.sql
   ```

4. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   
   **For Vercel Postgres:**
   ```env
   DATABASE_URL=your_vercel_postgres_connection_string
   ```
   
   **For Local Postgres:**
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How to Play

1. Enter your name when prompted
2. Use the navigation buttons to switch between Lobby and Game
3. In the Lobby, you can chat with other players
4. In the Game, you can play Tic-Tac-Toe with real-time updates
5. The game supports multiple players simultaneously

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── mvp/          # Chat API endpoints
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   ├── App.tsx          # Main app component
│   ├── Game.tsx         # Game board component
│   ├── GameChatRoom.tsx # In-game chat
│   └── Lobby.tsx        # Lobby component
├── hooks/               # Custom React hooks
│   └── useSocket.ts     # Socket.IO hook
├── lib/                 # Utility libraries
│   └── db.ts           # Database configuration
├── db/                  # Database files
│   └── setup.sql       # Database schema
└── server.js           # Custom server with Socket.IO
```

## Technologies Used

- **Next.js 15** - React framework
- **Socket.IO** - Real-time communication
- **PostgreSQL** - Database (via Vercel Postgres)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

## Deployment

This project can be deployed to Vercel or any other platform that supports Node.js applications with custom servers.

## License

MIT
