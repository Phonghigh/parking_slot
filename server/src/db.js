import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'parking.db');

export const db = new DatabaseSync(DB_PATH);

// Bật foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Khởi tạo schema (idempotent)
export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('commuter','owner')),
      wallet_balance INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address TEXT NOT NULL,
      image_url TEXT,
      pricing_type TEXT NOT NULL CHECK (pricing_type IN ('hourly','flat')),
      price_per_hour INTEGER NOT NULL DEFAULT 0,
      flat_price INTEGER NOT NULL DEFAULT 0,
      total_spots INTEGER NOT NULL DEFAULT 0,
      available_spots INTEGER NOT NULL DEFAULT 0,
      covered INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      amenities TEXT NOT NULL DEFAULT '',
      open_hours TEXT NOT NULL DEFAULT '24/7',
      is_open INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      FOREIGN KEY (lot_id) REFERENCES lots(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      plate TEXT NOT NULL,
      slot_label TEXT,
      checkin_at INTEGER NOT NULL,
      checkout_at INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
      checkout_token TEXT NOT NULL,
      short_code TEXT,
      fee INTEGER,
      payment_method TEXT CHECK (payment_method IN ('momo','wallet','cash')),
      FOREIGN KEY (lot_id) REFERENCES lots(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Migration an toàn cho DB cũ (thêm cột nếu thiếu)
  addColumnIfMissing('sessions', 'short_code', 'TEXT');
  addColumnIfMissing('reviews', 'user_id', 'INTEGER');
  addColumnIfMissing('reviews', 'updated_at', 'INTEGER');
}

function addColumnIfMissing(table, col, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find((c) => c.name === col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  }
}
