@echo off
REM GOMAS LAB v2 - Start Script
REM Levanta la aplicación localmente

echo ===================================
echo   GOMAS LAB v2 - Local Startup
echo ===================================
echo.

REM Verificar si Node está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no está instalado
    echo Descargalo de: https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js detectado
echo.

REM Instalar dependencias si no existen
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
    echo.
)

echo ✓ Dependencias OK
echo.

REM Levantar servidor
echo Levantando GOMAS LAB v2...
echo.
echo 📌 Abre: http://localhost:3000
echo 📌 Presiona Ctrl+C para detener
echo.

call npm run dev

pause