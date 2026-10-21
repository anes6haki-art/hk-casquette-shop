@echo off
setlocal
cd /d "%~dp0.."

rem The server must already run (npm run dev or npm start) on port 3000.
rem This script only runs the checks, it never stops a process of yours.
echo [upload-test] checking the server on http://127.0.0.1:3000 ...
call node scripts/test-upload.mjs %*
set EXIT=%ERRORLEVEL%
echo [upload-test] finished with code %EXIT%
exit /b %EXIT%

