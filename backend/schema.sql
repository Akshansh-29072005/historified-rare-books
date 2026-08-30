DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'user'
);

DROP TABLE IF EXISTS books;
CREATE TABLE books (
  id TEXT PRIMARY KEY,
  title TEXT,
  author TEXT,
  description TEXT,
  price INTEGER,
  cover_url TEXT,
  pdf_r2_key TEXT
);

DROP TABLE IF EXISTS purchases;
CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  book_id TEXT,
  cashfree_order_id TEXT,
  status TEXT,
  purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS reading_progress;
CREATE TABLE reading_progress (
  user_id TEXT,
  book_id TEXT,
  last_read_page INTEGER DEFAULT 1,
  bookmarks TEXT DEFAULT '[]',
  PRIMARY KEY (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_amount REAL NOT NULL,
  max_uses INTEGER DEFAULT 1,
  times_used INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
