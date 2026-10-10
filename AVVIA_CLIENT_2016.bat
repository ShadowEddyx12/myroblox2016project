@echo off
title Avvio Roblox 2016 Client
echo ========================================================
echo   AVVIO CLIENT ROBLOX 2016 (Revival Server Connector)
echo ========================================================
echo.

:: Modifica con il tuo username preferito se desideri
set USERNAME=Player1
set PLACE_ID=1818

:: Inserisci qui l'indirizzo del tuo server Render o lascia localhost
set SERVER_HOST=localhost:8080

echo Connessione al server: %SERVER_HOST% con utente %USERNAME%...
echo.

if exist "RobloxPlayerBeta.exe" (
    RobloxPlayerBeta.exe --app -t 1 -j "http://%SERVER_HOST%/game/Join.ashx?placeId=%PLACE_ID%&username=%USERNAME%"
) else (
    echo [ATTENZIONE] Il file RobloxPlayerBeta.exe non si trova in questa cartella!
    echo Assicurati di copiare questo script dentro la cartella del tuo Client Roblox 2016
    echo oppure trascina qui il file RobloxPlayerBeta.exe.
    echo.
    echo Comando che verra' eseguito:
    echo RobloxPlayerBeta.exe --app -t 1 -j "http://%SERVER_HOST%/game/Join.ashx?placeId=%PLACE_ID%&username=%USERNAME%"
    pause
)
