@echo off
REM Build script for Windows

echo Building HHHomes ERP Setup Tool...
echo.

echo Building for Windows (amd64)...
set GOOS=windows
set GOARCH=amd64
go build -o ..\hhhomes-setup-windows.exe main.go
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Windows build complete: hhhomes-setup-windows.exe
) else (
    echo [ERROR] Windows build failed
)

echo.
echo Building for Linux (amd64)...
set GOOS=linux
set GOARCH=amd64
go build -o ..\hhhomes-setup-linux main.go
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Linux build complete: hhhomes-setup-linux
) else (
    echo [ERROR] Linux build failed
)

echo.
echo Building for macOS (amd64)...
set GOOS=darwin
set GOARCH=amd64
go build -o ..\hhhomes-setup-macos-intel main.go
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] macOS Intel build complete: hhhomes-setup-macos-intel
) else (
    echo [ERROR] macOS Intel build failed
)

echo.
echo Building for macOS (arm64)...
set GOOS=darwin
set GOARCH=arm64
go build -o ..\hhhomes-setup-macos-arm main.go
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] macOS ARM build complete: hhhomes-setup-macos-arm
) else (
    echo [ERROR] macOS ARM build failed
)

echo.
echo Build complete!
echo.
echo Executables created:
echo   - hhhomes-setup-windows.exe (Windows)
echo   - hhhomes-setup-linux (Linux)
echo   - hhhomes-setup-macos-intel (macOS Intel)
echo   - hhhomes-setup-macos-arm (macOS Apple Silicon)
echo.
pause
