const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Cartella assets
const assetDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetDir)) {
    fs.mkdirSync(assetDir, { recursive: true });
}

// Helper per recuperare utente tramite Cookie/Token
function getAuthUser(req) {
    const token = req.cookies['ROBLOSECURITY'] || req.headers['authorization'];
    if (!token) return null;
    const session = db.getSession(token);
    if (!session) return null;
    return db.getUserById(session.userId);
}

// ==========================================
// 1. API DI AUTENTICAZIONE E REGISTRAZIONE
// ==========================================

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || username.length < 3 || password.length < 4) {
        return res.status(400).json({ error: 'Username o Password troppo corti.' });
    }
    const existing = db.getUserByUsername(username);
    if (existing) {
        return res.status(400).json({ error: 'Nome utente già esistente.' });
    }
    
    const user = db.createUser(username, password);
    const token = crypto.randomBytes(32).toString('hex');
    db.createSession(token, user.id);

    res.cookie('ROBLOSECURITY', token, { httpOnly: true, maxAge: 86400000 * 30 });
    return res.json({ success: true, userId: user.id, username: user.username });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.getUserByUsername(username);
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Credenziali non valide.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    db.createSession(token, user.id);

    res.cookie('ROBLOSECURITY', token, { httpOnly: true, maxAge: 86400000 * 30 });
    return res.json({ success: true, userId: user.id, username: user.username });
});

app.get('/api/currentUser', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ loggedIn: false });
    return res.json({ loggedIn: true, user });
});

app.get('/api/places', (req, res) => {
    res.json(db.getPlaces());
});

// ==========================================
// 2. ENDPOINT ROBLOX 2016 CLIENT COMPATIBILITY
// ==========================================

app.get(['/asset', '/asset/', '/Asset', '/Asset/'], (req, res) => {
    const assetId = req.query.id;
    const localAssetPath = path.join(assetDir, `${assetId}`);
    if (fs.existsSync(localAssetPath)) {
        return res.sendFile(localAssetPath);
    }
    res.redirect(`https://assetdelivery.roblox.com/v1/asset?id=${assetId}`);
});

app.get(['/Asset/CharacterFetch.ashx', '/v1.1/avatar-fetch'], (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`http://${req.headers.host}/asset/?id=86498113;http://${req.headers.host}/asset/?id=86498144`);
});

app.get('/Game/PlaceConfiguration.ashx', (req, res) => {
    res.json({ UniverseId: 1, IsPlayable: true, ReasonProhibited: "None" });
});

app.get(['/game/Join.ashx', '/Game/Join.ashx', '/game/join.ashx'], (req, res) => {
    const placeId = parseInt(req.query.placeId || req.query.PlaceId || '1818');
    const user = getAuthUser(req);
    const username = req.query.username || (user ? user.username : 'Guest ' + Math.floor(1000 + Math.random() * 9000));
    const userId = user ? user.id : Math.floor(1000 + Math.random() * 9000);
    
    const place = db.getPlaceById(placeId) || {
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
    res.send(JSON.stringify(joinScript, null, 2));
});

app.get('/launch/:placeId', (req, res) => {
    const placeId = req.params.placeId;
    const user = getAuthUser(req);
    const username = user ? user.username : 'Player_' + Math.floor(1000 + Math.random() * 9000);
    const host = req.headers.host;
    
    const joinUrl = `https://${host}/game/Join.ashx?placeId=${placeId}&username=${encodeURIComponent(username)}`;
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
                <p style="font-size: 14px; color: #a0c0e0;">Comando manuale per il client 2016:</p>
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

// Root path fallback
app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
    console.log(`Server attivo sulla porta ${PORT}`);
});
