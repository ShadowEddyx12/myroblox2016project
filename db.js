const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'roblox2016.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Abilita foreign keys e modalità WAL per ottime prestazioni
db.pragma('journal_mode = WAL');

// Creazione Tabelle
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        robux INTEGER DEFAULT 100,
        tix INTEGER DEFAULT 500,
        membership TEXT DEFAULT 'None',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        max_players INTEGER DEFAULT 12,
        active_server_ip TEXT DEFAULT '127.0.0.1',
        active_server_port INTEGER DEFAULT 53640,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(creator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
`);

// Crea utente e gioco demo se il database è appena stato inizializzato
const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
if (userCount === 0) {
    const insertUser = db.prepare('INSERT INTO users (username, password, robux, tix, membership) VALUES (?, ?, ?, ?, ?)');
    insertUser.run('Player1', '$2b$10$EP/V.YqjLh56zX3.8Z7V1eU2Q6gX8d5vGq2sX8r8N4z9X.7l8l1Xm', 9999, 50000, 'BuildersClub'); // Pass: 123456
    
    const insertPlace = db.prepare('INSERT INTO places (id, creator_id, name, description, max_players, active_server_ip, active_server_port) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertPlace.run(1818, 1, '2016 Crossroads Classic', 'Il mitico Crossroads di Roblox del 2016!', 16, '127.0.0.1', 53640);
    console.log('Database inizializzato con Utente di test (Player1) e Place Demo (Crossroads)!');
}

module.exports = db;
