package main

import (
	"bufio"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
)

func main() {
	printBanner()

	// Check prerequisites
	if !checkDocker() {
		printError("Docker is not installed or not running")
		fmt.Println("Please install Docker Desktop and try again")
		waitForExit()
		os.Exit(1)
	}

	printSuccess("Docker is installed and running")

	// Get current directory
	workDir, err := os.Getwd()
	if err != nil {
		printError("Failed to get current directory: " + err.Error())
		waitForExit()
		os.Exit(1)
	}

	// Check if we're in the right directory
	if !fileExists(filepath.Join(workDir, "docker-compose.yml")) {
		printError("docker-compose.yml not found!")
		fmt.Println("Please run this tool from the construction-erp directory")
		waitForExit()
		os.Exit(1)
	}

	reader := bufio.NewReader(os.Stdin)

	// Collect configuration
	fmt.Println()
	printInfo("=== Configuration ===")
	fmt.Println()

	dbPassword := promptOrGenerate(reader, "Database Password (press Enter to generate)", true)
	jwtSecret := promptOrGenerate(reader, "JWT Secret (press Enter to generate)", true)
	jwtRefreshSecret := promptOrGenerate(reader, "JWT Refresh Secret (press Enter to generate)", true)
	geminiKey := promptOptional(reader, "Gemini API Key (optional, press Enter to skip)")

	domain := promptRequired(reader, "Domain name (e.g., example.com)")
	email := promptRequired(reader, "Email for SSL certificates")

	// Confirm
	fmt.Println()
	printInfo("=== Configuration Summary ===")
	fmt.Printf("Database Password: %s\n", maskString(dbPassword))
	fmt.Printf("JWT Secret: %s\n", maskString(jwtSecret))
	fmt.Printf("JWT Refresh Secret: %s\n", maskString(jwtRefreshSecret))
	if geminiKey != "" {
		fmt.Printf("Gemini API Key: %s\n", maskString(geminiKey))
	} else {
		fmt.Println("Gemini API Key: (not provided)")
	}
	fmt.Printf("Domain: %s\n", domain)
	fmt.Printf("Email: %s\n", email)
	fmt.Println()

	if !confirm(reader, "Continue with this configuration?") {
		printInfo("Setup cancelled")
		waitForExit()
		os.Exit(0)
	}

	// Create environment files
	printInfo("Creating environment files...")

	// Main .env
	mainEnv := fmt.Sprintf(`# Database Configuration
DB_PASSWORD=%s
DATABASE_URL=postgresql://erpuser:%s@postgres:5432/erp_production

# JWT Configuration
JWT_SECRET=%s
JWT_REFRESH_SECRET=%s

# SSL Configuration
DOMAIN=%s
EMAIL=%s

# Optional AI Configuration
GEMINI_API_KEY=%s
`, dbPassword, dbPassword, jwtSecret, jwtRefreshSecret, domain, email, geminiKey)

	if err := os.WriteFile(".env", []byte(mainEnv), 0600); err != nil {
		printError("Failed to create .env: " + err.Error())
		waitForExit()
		os.Exit(1)
	}

	// API .env
	apiEnv := fmt.Sprintf(`NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://erpuser:%s@postgres:5432/erp_production

# JWT Secrets
JWT_SECRET=%s
JWT_REFRESH_SECRET=%s

# Google Gemini API
GEMINI_API_KEY=%s

# Uploads
UPLOAD_DIR=/app/uploads
`, dbPassword, jwtSecret, jwtRefreshSecret, geminiKey)

	apiEnvPath := filepath.Join("apps", "api", ".env")
	os.MkdirAll(filepath.Dir(apiEnvPath), 0755)
	if err := os.WriteFile(apiEnvPath, []byte(apiEnv), 0600); err != nil {
		printError("Failed to create apps/api/.env: " + err.Error())
		waitForExit()
		os.Exit(1)
	}

	// Web .env.production
	webEnv := fmt.Sprintf(`NEXT_PUBLIC_API_URL=https://api.%s
`, domain)

	webEnvPath := filepath.Join("apps", "web", ".env.production")
	os.MkdirAll(filepath.Dir(webEnvPath), 0755)
	if err := os.WriteFile(webEnvPath, []byte(webEnv), 0600); err != nil {
		printError("Failed to create apps/web/.env.production: " + err.Error())
		waitForExit()
		os.Exit(1)
	}

	printSuccess("Environment files created")

	// Ask if user wants to start deployment
	fmt.Println()
	if confirm(reader, "Start deployment now?") {
		deploy(workDir)
	} else {
		printInfo("Setup complete! Run 'docker compose up -d' when ready to start.")
	}

	waitForExit()
}

func deploy(workDir string) {
	printInfo("Starting deployment...")

	// Start postgres first
	printInfo("Starting database...")
	runCommand(workDir, "docker", "compose", "up", "-d", "postgres")

	printInfo("Waiting for database to be ready (15 seconds)...")
	// Simple wait - could be improved with actual health check
	for i := 15; i > 0; i-- {
		fmt.Printf("\r%d... ", i)
		exec.Command("sleep", "1").Run()
	}
	fmt.Println()

	// Run migrations
	printInfo("Running database migrations...")
	runCommand(workDir, "docker", "compose", "run", "--rm", "api", "sh", "-c",
		"cd apps/api && npx prisma migrate deploy && npx prisma generate")

	// Start all services
	printInfo("Starting all services...")
	runCommand(workDir, "docker", "compose", "up", "-d")

	printSuccess("Deployment complete!")
	fmt.Println()
	printInfo("Your application is starting up. Check status with:")
	fmt.Println("  docker compose ps")
	fmt.Println("  docker compose logs -f")
}

func printBanner() {
	fmt.Println()
	fmt.Println("╔════════════════════════════════════════╗")
	fmt.Println("║   HHHomes ERP - Setup Tool v1.0       ║")
	fmt.Println("║   Construction Management System       ║")
	fmt.Println("╚════════════════════════════════════════╝")
	fmt.Println()
}

func printInfo(msg string) {
	if runtime.GOOS == "windows" {
		fmt.Printf("[INFO] %s\n", msg)
	} else {
		fmt.Printf("%s[ℹ] %s%s\n", colorBlue, msg, colorReset)
	}
}

func printSuccess(msg string) {
	if runtime.GOOS == "windows" {
		fmt.Printf("[SUCCESS] %s\n", msg)
	} else {
		fmt.Printf("%s[✓] %s%s\n", colorGreen, msg, colorReset)
	}
}

func printError(msg string) {
	if runtime.GOOS == "windows" {
		fmt.Printf("[ERROR] %s\n", msg)
	} else {
		fmt.Printf("%s[✗] %s%s\n", colorRed, msg, colorReset)
	}
}

func printWarning(msg string) {
	if runtime.GOOS == "windows" {
		fmt.Printf("[WARNING] %s\n", msg)
	} else {
		fmt.Printf("%s[⚠] %s%s\n", colorYellow, msg, colorReset)
	}
}

func checkDocker() bool {
	cmd := exec.Command("docker", "version")
	return cmd.Run() == nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func generateSecret(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		panic(err)
	}
	// Remove problematic characters
	secret := base64.StdEncoding.EncodeToString(bytes)
	secret = strings.ReplaceAll(secret, "=", "")
	secret = strings.ReplaceAll(secret, "+", "")
	secret = strings.ReplaceAll(secret, "/", "")
	secret = strings.ReplaceAll(secret, "\n", "")
	if len(secret) > length {
		secret = secret[:length]
	}
	return secret
}

func promptRequired(reader *bufio.Reader, prompt string) string {
	for {
		fmt.Printf("%s: ", prompt)
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)
		if input != "" {
			return input
		}
		printWarning("This field is required")
	}
}

func promptOptional(reader *bufio.Reader, prompt string) string {
	fmt.Printf("%s: ", prompt)
	input, _ := reader.ReadString('\n')
	return strings.TrimSpace(input)
}

func promptOrGenerate(reader *bufio.Reader, prompt string, generate bool) string {
	fmt.Printf("%s: ", prompt)
	input, _ := reader.ReadString('\n')
	input = strings.TrimSpace(input)
	if input == "" && generate {
		generated := generateSecret(50)
		printInfo("Generated: " + maskString(generated))
		return generated
	}
	return input
}

func confirm(reader *bufio.Reader, prompt string) bool {
	fmt.Printf("%s (y/n): ", prompt)
	input, _ := reader.ReadString('\n')
	input = strings.ToLower(strings.TrimSpace(input))
	return input == "y" || input == "yes"
}

func maskString(s string) string {
	if len(s) <= 8 {
		return "****"
	}
	return s[:4] + "****" + s[len(s)-4:]
}

func runCommand(dir string, name string, args ...string) {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		printError("Command failed: " + err.Error())
	}
}

func waitForExit() {
	fmt.Println()
	fmt.Print("Press Enter to exit...")
	bufio.NewReader(os.Stdin).ReadString('\n')
}
