-- Postgres database setup for Tic-Tac-Toe Online
-- This script creates the required tables for the chat functionality

-- Lobby chat messages table
CREATE TABLE IF NOT EXISTS lobby_chat_messages (
  id SERIAL PRIMARY KEY,
  text VARCHAR(500) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Game-specific chat messages table
CREATE TABLE IF NOT EXISTS game_chat_messages (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(100) NOT NULL,
  text VARCHAR(500) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Legacy table (keeping for backward compatibility)
CREATE TABLE IF NOT EXISTS chatRoomText (
  id SERIAL PRIMARY KEY,
  text VARCHAR(120) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lobby_chat_timestamp ON lobby_chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_game_chat_game_id ON game_chat_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_game_chat_timestamp ON game_chat_messages(timestamp DESC);

-- Game statistics table
CREATE TABLE IF NOT EXISTS game_statistics (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(100) UNIQUE NOT NULL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for game statistics
CREATE INDEX IF NOT EXISTS idx_game_stats_user_name ON game_statistics(user_name);

-- Optional: Add some sample data for lobby chat
INSERT INTO lobby_chat_messages (text, user_name) VALUES 
  ('Welcome to the Tic-Tac-Toe Game Lobby! 🎮', 'System'),
  ('Feel free to chat while waiting for games! 💬', 'System')
ON CONFLICT DO NOTHING; 