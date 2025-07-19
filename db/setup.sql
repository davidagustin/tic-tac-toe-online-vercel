-- Postgres database setup for Tic-Tac-Toe Online
-- This script creates the required table for the chat functionality

CREATE TABLE IF NOT EXISTS chatRoomText (
  id SERIAL PRIMARY KEY,
  text VARCHAR(120) NOT NULL
);

-- Optional: Add some sample data
-- INSERT INTO chatRoomText (text) VALUES ('Welcome to Tic-Tac-Toe Online!'); 