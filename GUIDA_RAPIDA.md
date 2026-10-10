# 🎮 Guida Rapida - Server Roblox 2016 su Render

Tutti i file del server si trovano già pronti nella cartella `server/`.

## 📦 File inclusi:
1. `server.js` - Server principale Express (gestione API, asset, login e script Join.ashx).
2. `db.js` - Database SQLite automatico (utenti, password, mappe).
3. `package.json` - Dipendenze e script di avvio.
4. `render.yaml` - File di configurazione automatica per il deploy su Render.
5. `public/index.html` - Dashboard web retro dove visualizzare le partite e fare il login.
6. `AVVIA_CLIENT_2016.bat` - File per connettere il client Roblox 2016 con un click.

---

## 🚀 Istruzioni per Render (Cloud Gratuito)
1. Crea un repository su GitHub e carica il contenuto della cartella `server/`.
2. Vai su [Render.com](https://render.com) ed effettua l'accesso con GitHub.
3. Clicca su **New +** -> **Web Service**.
4. Seleziona il tuo repository GitHub.
5. Imposta:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Clicca su **Deploy Web Service**.
7. Una volta terminato, Render ti fornirà un link pubblico (es. `https://roblox-2016-server.onrender.com`).
