@echo off
title WIRDAK PERMANENT SERVER
cd /d D:\wirdak
echo ========================================================
echo       STARTING WIRDAK PERMANENT SERVER & TUNNEL
echo ========================================================
start "WIRDAK Server Daemon" powershell -NoExit -ExecutionPolicy Bypass -File .\run-wirdak-daemon.ps1
start "WIRDAK Cloudflare Tunnel" powershell -NoExit -ExecutionPolicy Bypass -File .\run-wirdak-tunnel.ps1
echo.
echo WIRDAK Server and Tunnel have been launched in supervisor mode!
