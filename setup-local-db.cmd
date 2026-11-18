@echo off
rem Adds Manna's schema to Might's local Supabase stack (one local database for every app).
rem Might's data stays. Needs Docker Desktop running. Output also goes to setup-local-db.log
set LOG=%~dp0setup-local-db.log
cd /d "%~dp0..\MigraineTracker"
echo === %date% %time% > "%LOG%"
echo --- status >> "%LOG%"
call npx -y supabase status >> "%LOG%" 2>&1
if errorlevel 1 (
  echo --- not running, starting >> "%LOG%"
  call npx -y supabase start >> "%LOG%" 2>&1
)
echo --- migration up >> "%LOG%"
call npx -y supabase migration up >> "%LOG%" 2>&1
echo --- restart so the API serves the manna schema >> "%LOG%"
call npx -y supabase stop >> "%LOG%" 2>&1
call npx -y supabase start >> "%LOG%" 2>&1
echo --- DONE >> "%LOG%"
type "%LOG%"
pause
