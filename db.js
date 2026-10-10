const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'database.json');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let store = {
    users: [
        { id: 1, username: 'Player1', password: 'password123', robux: 9999, tix: 50000, membership: 'BuildersClub' }
    ],
    places: [
        { id: 1818, creator_id: 1, name: '2016 Crossroads Classic', description: 'Il mitico Crossroads di Roblox del 2016!', max_players: 16, active_server_ip: '127.0.0.1', active_server_port: 53640 }
    ],
    sessions: []
};

function load() {
    if (fs.existsSync(dbFile)) {
        try {
            store = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        } catch (e) {
            console.error('Errore caricamento database JSON, ripristino default:', e);
        }
    } else {
        save();
    }
}

function save() {
    try {
        fs.writeFileSync(dbFile, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
        console.error('Errore salvataggio database JSON:', e);
    }
}

load();

module.exports = {
    getUserByUsername: (username) => store.users.find(u => u.username.toLowerCase() === username.toLowerCase()),
    getUserById: (id) => store.users.find(u => u.id === parseInt(id)),
    createUser: (username, password) => {
        const newUser = {
            id: store.users.length + 1,
            username,
            password,
            robux: 100,
            tix: 500,
            membership: 'None'
        };
        store.users.push(newUser);
        save();
        return newUser;
    },
    createSession: (token, userId) => {
        store.sessions.push({ token, userId });
        save();
    },
    getSession: (token) => store.sessions.find(s => s.token === token),
    getPlaces: () => store.places,
    getPlaceById: (id) => store.places.find(p => p.id === parseInt(id))
};
