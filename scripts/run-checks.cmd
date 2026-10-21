@echo off
cd /d "%~dp0.."
echo START > "%TEMP%\checks.done"

call npx tsc --noEmit > "%TEMP%\tsc.txt" 2>&1
echo TSC_EXIT=%ERRORLEVEL% >> "%TEMP%\tsc.txt"

call npx eslint . > "%TEMP%\eslint.txt" 2>&1
echo ESLINT_EXIT=%ERRORLEVEL% >> "%TEMP%\eslint.txt"

echo CHECKS_DONE >> "%TEMP%\checks.done"

