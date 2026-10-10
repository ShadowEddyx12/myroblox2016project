const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Assicura la cartella assets per contenere file rbxmx/rbxl
const assetDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetDir)) {
    fs.mkdirSync(assetDir, { recursive: true });
}

// Helper per recuperare utente tramite Cookie/Token
function getAuthUser(req) {
    const token = req.cookies['ROBLOSECURITY'] || req.headers['authorization'];
    if (!token) return null;
    const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
    if (!session) return null;
    return db.prepare('SELECT id, username, robux, tix, membership FROM users WHERE id = ?').get(session.user_id);
}

// ==========================================
// 1. API DI AUTENTICAZIONE E REGISTRAZIONE
// ==========================================

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || username.length < 3 || password.length < 4) {
        return res.status(400).json({ error: 'Username o Password troppo corti.' });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        const info = stmt.run(username, hash);
        
        const token = crypto.randomBytes(32).toString('hex');
        db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, info.lastInsertRowid);

        res.cookie('ROBLOSECURITY', token, { httpOnly: true, maxAge: 86400000 * 30 });
        return res.json({ success: true, userId: info.lastInsertRowid, username });
    } catch (err) {
        return res.status(400).json({ error: 'Nome utente già esistente.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
        return res.status(401).json({ error: 'Utente non trovato.' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(401).json({ error: 'Password errata.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);

    res.cookie('ROBLOSECURITY', token, { httpOnly: true, maxAge: 86400000 * 30 });
    return res.json({ success: true, userId: user.id, username: user.username });
});

app.get('/api/currentUser', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ loggedIn: false });
    return res.json({ loggedIn: true, user });
});

app.get('/api/places', (req, res) => {
    const places = db.prepare('SELECT * FROM places ORDER BY id DESC').all();
    res.json(places);
});

// ==========================================
// 2. ENDPOINT ROBLOX 2016 CLIENT COMPATIBILITY
// ==========================================

// Endpoint Asset Delivery: quando il client chiede modelli, mesh o texture
app.get(['/asset', '/asset/', '/Asset', '/Asset/'], (req, res) => {
    const assetId = req.query.id;
    const localAssetPath = path.join(assetDir, `${assetId}`);
    
    if (fs.existsSync(localAssetPath)) {
        return res.sendFile(localAssetPath);
    }
    
    // Se l'asset non è presente in locale, fa fallback sicuro verso i server Roblox ufficiali
    res.redirect(`https://assetdelivery.roblox.com/v1/asset?id=${assetId}`);
});

// Endpoint Caratterizzazione Personaggio (Avatar Appearance)
app.get(['/Asset/CharacterFetch.ashx', '/v1.1/avatar-fetch'], (req, res) => {
    const userId = req.query.userId || 1;
    res.setHeader('Content-Type', 'text/plain');
    // Restituisce gli URL delle parti dell'avatar Roblox standard 2016
    res.send(`http://${req.headers.host}/asset/?id=86498113;http://${req.headers.host}/asset/?id=86498144`);
});

// Endpoint Informazioni Gioco (Game Ping / Place details)
app.get('/Game/PlaceConfiguration.ashx', (req, res) => {
    res.json({
        UniverseId: 1,
        IsPlayable: true,
        ReasonProhibited: "None"
    });
});

// Endpoint Join.ashx: Questo è l'endpoint chiave che fornisce al Client Roblox 2016 lo script Lua per connettersi!
app.get(['/game/Join.ashx', '/Game/Join.ashx', '/game/join.ashx'], (req, res) => {
    const placeId = parseInt(req.query.placeId || req.query.PlaceId || '1818');
    const user = getAuthUser(req);
    const username = req.query.username || (user ? user.username : 'Guest ' + Math.floor(1000 + Math.random() * 9000));
    const userId = user ? user.id : Math.floor(1000 + Math.random() * 9000);
    
    // Trova i dettagli del server di gioco per questo place
    const place = db.prepare('SELECT * FROM places WHERE id = ?').get(placeId) || {
        active_server_ip: '127.0.0.1',
        active_server_port: 53640
    };

    const serverIp = req.query.ip || place.active_server_ip;
    const serverPort = req.query.port || place.active_server_port;

    const joinScript = {
        ClientPort: 0,
        MachineAddress: serverIp,
        ServerPort: parseInt(serverPort),
        PingUrl: "",
        PingInterval: 120,
        UserName: username,
        SeleniumTestMode: false,
        UserId: userId,
        SuperSafeChat: false,
        CharacterAppearance: `http://${req.headers.host}/Asset/CharacterFetch.ashx?userId=${userId}`,
        ClientTicket: "",
        GameId: "00000000-0000-0000-0000-000000000000",
        PlaceId: placeId,
        MeasurementUrl: "",
        WaitingForCharacterGuid: "00000000-0000-0000-0000-000000000000",
        BaseUrl: `http://${req.headers.host}/`,
        ChatStyle: "ClassicAndBubble",
        VendorId: 0,
        ScreenShotInfo: "",
        VideoInfo: "",
        CreatorId: 1,
        CreatorTypeEnum: "User",
        MembershipType: "BuildersClub",
        AccountAge: 365,
        CookieUrl: "",
        CookieValue: "",
        GenerateTeleportJoin: false,
        IsRobloxPlace: true,
        GenerateAuthTicket: false
    };

    res.setHeader('Content-Type', 'text/plain');
    // Roblox 2016 accetta la configurazione serializzata JSON
    res.send(JSON.stringify(joinScript, null, 2));
});

// Endpoint Generatore Protocollo URI per aprire il gioco con 1 click
app.get('/launch/:placeId', (req, res) => {
    const placeId = req.params.placeId;
    const user = getAuthUser(req);
    const username = user ? user.username : 'Player_' + Math.floor(1000 + Math.random() * 9000);
    const host = req.headers.host;
    
    // Script o URI protocol: roblox-player:1+launchmode:play+gameinfo:<ticket>+launchtime:...
    const joinUrl = `http://${host}/game/Join.ashx?placeId=${placeId}&username=${encodeURIComponent(username)}`;
    const launcherProtocol = `roblox-player:1+launchmode:play+gameinfo:join+appargs:-app+-t+1+-j+${joinUrl}`;
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Avvio Roblox 2016</title>
            <meta charset="utf-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background: #001220; color: white; }
                .box { max-width: 600px; margin: 0 auto; background: #052642; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
                .btn { display: inline-block; background: #02b757; color: white; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 18px; margin-top: 20px; }
                .btn:hover { background: #029446; }
                .cmd { background: #000; padding: 10px; border-radius: 5px; font-family: monospace; word-break: break-all; margin-top: 15px; }
            </style>
        </head>
        <body>
            <div class="box">
                <h2>🚀 Avvio Client Roblox 2016</h2>
                <p>Tentativo di connessione alla mappa <b>#${placeId}</b> con utente <b>${username}</b>...</p>
                <a class="btn" href="${launcherProtocol}">Avvia Roblox 2016</a>
                <hr style="border-color: #1a446c; margin: 25px 0;">
                <p style="font-size: 14px; color: #a0c0e0;">Se il gioco non si apre automaticamente, avvia il client 2016 dal terminale o crea un file <code>.bat</code> con:</p>
                <div class="cmd">RobloxPlayerBeta.exe --app -t 1 -j "${joinUrl}"</div>
            </div>
            <script>
                setTimeout(() => {
                    window.location.href = "${launcherProtocol}";
                }, 1000);
            </script>
        </body>
        </html>
    `);
});

// Avvio Server
app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`⭐ SERVER ROBLOX 2016 ATTIVO SULLA PORTA ${PORT} ⭐`);
    console.log(`Dashboard Web: http://localhost:${PORT}`);
    console.log(`Join Script:   http://localhost:${PORT}/game/Join.ashx?placeId=1818`);
    console.log(`===============================================`);
});
