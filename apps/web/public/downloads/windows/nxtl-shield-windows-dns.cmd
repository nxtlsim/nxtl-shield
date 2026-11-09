@echo off
setlocal
:: NXTL Shield - Windows DNS Setup Launcher with UAC Elevation
title NXTL Shield DNS Setup

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running with Administrator privileges...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0nxtl-shield-windows-dns.ps1" %*
) else (
    echo Elevating privileges to configure system DNS...
    powershell.exe -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\" %*\"' -Verb RunAs"
)

if %errorLevel% neq 0 (
    echo.
    echo Script ended with code %errorLevel%.
)
pause
