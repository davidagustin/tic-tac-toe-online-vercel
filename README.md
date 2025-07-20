# Tic-Tac-Toe Online - tRPC WebSocket Edition

A modern, real-time multiplayer Tic-Tac-Toe game built with Next.js, tRPC, and WebSockets. This application demonstrates a clean, type-safe approach to real-time gaming using tRPC for both HTTP and WebSocket communication.

## 🚀 Features

- **Real-time Multiplayer Gaming**: Play Tic-Tac-Toe with friends in real-time using WebSockets
- **Type-safe API**: Full end-to-end type safety with tRPC
- **Modern Authentication**: Custom authentication system with session management
- **Real-time Chat**: In-game chat functionality for players
- **Responsive Design**: Mobile-friendly UI built with Tailwind CSS
- **Game Statistics**: Track your wins, losses, and win rate
- **Clean Architecture**: Well-organized codebase with separation of concerns

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: tRPC, Node.js
- **Real-time**: WebSockets (ws)
- **Database**: PostgreSQL with Neon
- **Styling**: Tailwind CSS
- **Authentication**: Custom session-based auth
- **Deployment**: Vercel

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tic-tac-toe-online-vercel.git
   cd tic-tac-toe-online-vercel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL=your_postgresql_connection_string
   
   # Security
   PASSWORD_SALT=your_secure_salt
   
   # Server
   PORT=3000
   ```

4. **Set up the database**
   ```bash
   # Run the database setup script
   node db/setup.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Start the WebSocket server** (in a separate terminal)
   ```bash
   # The WebSocket server will be available on port 3001
   node lib/websocket-server.js
   ```

## 🏗️ Project Structure

```
tic-tac-toe-online-vercel/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── trpc/          # tRPC API handler
│   │   ├── auth/          # Authentication endpoints
│   │   ├── game/          # Game management endpoints
│   │   ├── chat/          # Chat endpoints
│   │   └── stats/         # Statistics endpoints
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── Auth.tsx           # Authentication component
│   ├── Game.tsx           # Game board component
│   ├── GameManager.tsx    # Game state management
│   ├── Lobby.tsx          # Game lobby
│   ├── ChatRoom.tsx       # Chat interface
│   └── UserProfile.tsx    # User profile and stats
├── hooks/                 # Custom React hooks
│   └── useWebSocket.ts    # WebSocket hook
├── lib/                   # Utility libraries
│   ├── trpc.ts            # tRPC configuration
│   ├── trpc-client.ts     # tRPC client setup
│   ├── websocket-server.ts # WebSocket server
│   ├── routers/           # tRPC routers
│   │   ├── auth.ts        # Authentication router
│   │   ├── game.ts        # Game router
│   │   ├── chat.ts        # Chat router
│   │   └── index.ts       # Main router
│   ├── auth.ts            # Authentication service
│   └── db.ts              # Database utilities
├── db/                    # Database files
│   └── setup.sql          # Database schema
├── public/                # Static assets
└── types/                 # TypeScript type definitions
```

## 🎮 How to Play

1. **Register/Login**: Create an account or log in with existing credentials
2. **Create or Join Game**: Create a new game or join an existing one from the lobby
3. **Play**: Take turns placing X's and O's on the 3x3 grid
4. **Chat**: Communicate with your opponent using the in-game chat
5. **Win**: Get three in a row to win the game!

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Games
- `GET /api/game/list` - List available games
- `POST /api/game/create` - Create a new game
- `POST /api/game/join` - Join an existing game
- `POST /api/game/move` - Make a move in the game
- `GET /api/game/getState` - Get current game state

### Chat
- `POST /api/chat/send` - Send a chat message
- `GET /api/chat/getMessages` - Get chat messages

### Statistics
- `GET /api/stats` - Get user statistics

## 🌐 WebSocket Events

The application uses WebSocket connections for real-time updates:

### Client to Server
- `joinGame` - Join a game room
- `leaveGame` - Leave a game room
- `gameUpdate` - Send game state updates
- `chatMessage` - Send chat messages

### Server to Client
- `gameUpdate` - Receive game state updates
- `chatMessage` - Receive chat messages
- `playerJoined` - Player joined notification
- `playerLeft` - Player left notification

## 🔒 Security Features

- **Rate Limiting**: Prevents abuse with request rate limiting
- **Input Validation**: All inputs validated with Zod schemas
- **Session Management**: Secure session-based authentication
- **CORS Protection**: Configured CORS policies
- **Security Headers**: Comprehensive security headers

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   vercel
   ```

2. **Set environment variables** in Vercel dashboard:
   - `DATABASE_URL`
   - `PASSWORD_SALT`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### WebSocket Server Deployment

For production, you'll need to deploy the WebSocket server separately. Consider using:
- Railway
- Heroku
- DigitalOcean
- AWS EC2

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PASSWORD_SALT` | Salt for password hashing | Yes |
| `PORT` | Server port (default: 3000) | No |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [tRPC](https://trpc.io/) for type-safe APIs
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vercel](https://vercel.com/) for deployment

## 📞 Support

If you have any questions or need help, please open an issue on GitHub. 