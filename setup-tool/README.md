# HHHomes ERP Setup Tool

A cross-platform executable setup utility for HHHomes Construction ERP.

## Features

- Interactive prompts for all configuration
- Automatic secure password generation
- Creates all required environment files
- Optional automatic deployment
- Works on Windows, Linux, and macOS

## Building the Executables

### Prerequisites

- Go 1.21 or higher installed
- Git Bash (for Windows users wanting to use build.sh)

### Build Instructions

**On Windows:**
```cmd
cd setup-tool
build.bat
```

**On Linux/macOS:**
```bash
cd setup-tool
chmod +x build.sh
./build.sh
```

This will create executables for all platforms:
- `hhhomes-setup-windows.exe` - Windows 64-bit
- `hhhomes-setup-linux` - Linux 64-bit
- `hhhomes-setup-macos-intel` - macOS Intel
- `hhhomes-setup-macos-arm` - macOS Apple Silicon

## Using the Setup Tool

1. **Copy the executable to your project directory:**
   ```bash
   cp hhhomes-setup-windows.exe /path/to/construction-erp/
   cd /path/to/construction-erp/
   ```

2. **Run the executable:**

   **Windows:**
   ```cmd
   hhhomes-setup-windows.exe
   ```

   **Linux:**
   ```bash
   chmod +x hhhomes-setup-linux
   ./hhhomes-setup-linux
   ```

   **macOS:**
   ```bash
   chmod +x hhhomes-setup-macos-intel  # or hhhomes-setup-macos-arm
   ./hhhomes-setup-macos-intel
   ```

3. **Follow the interactive prompts:**
   - Database Password (press Enter to auto-generate)
   - JWT Secret (press Enter to auto-generate)
   - JWT Refresh Secret (press Enter to auto-generate)
   - Gemini API Key (optional, press Enter to skip)
   - Domain name (e.g., example.com)
   - Email for SSL certificates

4. **Review the configuration and confirm**

5. **Choose to start deployment immediately or do it manually later**

## What the Tool Does

1. **Checks Prerequisites:**
   - Verifies Docker is installed and running
   - Confirms you're in the correct directory

2. **Generates Secure Secrets:**
   - Creates cryptographically secure passwords
   - No newlines or special characters that could break .env files

3. **Creates Environment Files:**
   - `.env` (main configuration)
   - `apps/api/.env` (API configuration)
   - `apps/web/.env.production` (Web configuration)

4. **Optional Deployment:**
   - Starts PostgreSQL
   - Waits for database readiness
   - Runs Prisma migrations
   - Starts all services

## Manual Deployment

If you choose not to deploy automatically, you can start the services manually:

```bash
# Start database
docker compose up -d postgres

# Wait 15 seconds for database to be ready
sleep 15

# Run migrations
docker compose run --rm api sh -c "cd apps/api && npx prisma migrate deploy && npx prisma generate"

# Start all services
docker compose up -d

# Check status
docker compose ps
docker compose logs -f
```

## Troubleshooting

**"Docker is not installed or not running"**
- Install Docker Desktop and ensure it's running
- On Linux, make sure Docker service is started: `sudo systemctl start docker`

**"docker-compose.yml not found"**
- Make sure you're running the executable from the construction-erp directory
- The executable must be in the same folder as docker-compose.yml

**Permission Denied (Linux/macOS)**
- Make the executable runnable: `chmod +x hhhomes-setup-linux`

**Windows Security Warning**
- Windows may show a security warning for unsigned executables
- Click "More info" → "Run anyway" if you trust the source

## Security Notes

- Generated secrets are 50 characters of cryptographically secure random data
- Environment files are created with restricted permissions (0600)
- Secrets are masked in the configuration summary
- Never commit `.env` files to version control

## License

Part of the HHHomes Construction ERP project.
