-- Google integration tables

-- Stores per-user Google OAuth tokens
CREATE TABLE IF NOT EXISTS google_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_user_id TEXT NOT NULL UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  scope TEXT,
  token_type TEXT,
  expiry_date TEXT, -- ISO datetime for access token expiry
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clerk_user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_google_accounts_user ON google_accounts(clerk_user_id);

-- Maps app habits to Google Calendar events
CREATE TABLE IF NOT EXISTS habit_google_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL,
  user_id TEXT NOT NULL, -- Clerk user id
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  event_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  UNIQUE (habit_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_hge_habit_user ON habit_google_events(habit_id, user_id);

-- Ephemeral OAuth state store to protect against CSRF
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON oauth_states(user_id);