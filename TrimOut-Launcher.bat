@echo off
REM TrimOut Launcher — Quick start the built app from anywhere.
REM Place this anywhere and double-click to launch.

set "TRIMOUT_EXE=D:\trimming soccer\player-clip-prep\dist\win-unpacked\TrimOut.exe"

if not exist "%TRIMOUT_EXE%" (
    echo.
    echo  [X] TrimOut.exe not found at:
    echo      %TRIMOUT_EXE%
    echo.
    echo  Run 'yarn pack-win' in the project root to build it first.
    echo.
    pause
    exit /b 1
)

REM Launch detached — close this CMD window immediately
start "" "%TRIMOUT_EXE%"
exit /b 0
