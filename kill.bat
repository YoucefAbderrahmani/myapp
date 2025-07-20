@echo off
echo Killing all Node.js processes...

:: For Windows 10/11
taskkill /f /im node.exe > nul 2>&1

if %errorlevel% equ 0 (
    echo Successfully killed Node.js processes
) else (
    echo No Node.js processes found or error occurred
)

timeout /t 3 /nobreak > nul