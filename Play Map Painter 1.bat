@echo off
REM Starts a local web server rooted in THIS folder and opens the main menu
REM (menu.html — pick a nation/preset/custom entity) in your default browser.
REM Just double-click this. The menu itself launches world_map_webgl.html
REM once you hit Play.

REM %~dp0 = the folder this .bat file itself lives in. Changing directory
REM HERE (rather than embedding the path inside a nested quoted command)
REM avoids quoting problems since this folder's name contains a space.
cd /d "%~dp0"

REM Port 8123 (rather than the more obvious 8000) specifically to avoid
REM colliding with any earlier test server left running on 8000 from a
REM prior attempt, which would otherwise silently keep answering requests
REM from the WRONG folder instead of failing loudly.
start "Map Painter 1 Server" /min cmd /k "python -m http.server 8123"

REM Give the server a moment to spin up before opening the browser.
timeout /t 2 /nobreak >nul

start "" "http://localhost:8123/menu.html"
