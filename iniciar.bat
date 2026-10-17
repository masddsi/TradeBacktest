@echo off
setlocal
title TradeLog - Iniciando
cd /d "%~dp0"

echo ==================================================
echo    TradeLog - Gestao de Operacoes de Daytrade
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado no PATH.
  echo Instale em https://nodejs.org ^(versao 24 ou superior^) e tente novamente.
  echo.
  pause
  exit /b 1
)

echo [1/3] Verificando dependencias...
if not exist "node_modules" (
  echo       Instalando dependencias da raiz...
  call npm install --no-audit --no-fund || (echo [ERRO] Falha ao instalar dependencias da raiz. & pause & exit /b 1)
)
if not exist "server\node_modules" (
  echo       Instalando dependencias do servidor...
  call npm --prefix server install --no-audit --no-fund || (echo [ERRO] Falha ao instalar dependencias do servidor. & pause & exit /b 1)
)
if not exist "web\node_modules" (
  echo       Instalando dependencias do frontend...
  call npm --prefix web install --no-audit --no-fund || (echo [ERRO] Falha ao instalar dependencias do frontend. & pause & exit /b 1)
)
echo       OK.
echo.

echo [2/3] Iniciando servidores (backend + frontend) em nova janela...
start "TradeLog - Servidores" cmd /k "npm run dev"
echo.

echo [3/3] Aguardando o app ficar pronto...
set "URL=http://localhost:5173"

where curl >nul 2>nul
if errorlevel 1 goto nowcheck

set /a tries=0
:wait
set /a tries+=1
curl -s -o NUL --max-time 3 "%URL%" >nul 2>nul
if not errorlevel 1 goto ready
if %tries% GEQ 60 goto timeout
<nul set /p =.
ping -n 2 127.0.0.1 >nul
goto wait

:nowcheck
echo.
echo       curl nao encontrado; aguardando 15s antes de abrir...
ping -n 16 127.0.0.1 >nul
goto ready

:ready
echo.
echo.
echo App pronto! Abrindo o navegador em %URL% ...
start "" "%URL%"
ping -n 3 127.0.0.1 >nul
exit /b 0

:timeout
echo.
echo.
echo [AVISO] O app demorou mais que o esperado para responder.
echo         Abrindo o navegador mesmo assim...
echo         Se a pagina nao carregar, veja os erros na janela "TradeLog - Servidores".
start "" "%URL%"
echo.
pause
exit /b 0
