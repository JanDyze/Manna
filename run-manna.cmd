@echo off
rem Installs packages (first time) and starts Manna at http://localhost:5181
cd /d "%~dp0app"
if not exist node_modules call npm install
call npm run dev -- --host
pause
