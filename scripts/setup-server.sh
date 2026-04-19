#!/bin/bash
# ==========================================
# BASTISTIL Inventory - Server Setup Script
# ==========================================
# This script sets up the project on a new server:
# 1. Checks Node.js and npm
# 2. Checks MySQL connectivity
# 3. Installs dependencies
# 4. Checks/creates .env.local
# 5. Builds the application
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo ""
echo "========================================"
echo "  BASTISTIL Inventory - Server Setup"
echo "========================================"
echo ""

# Check Node.js
echo "[1/5] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+ first."
    echo "Download from: https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "  Node.js: $NODE_VERSION"

# Check npm
echo "[2/5] Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not available."
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "  npm: v$NPM_VERSION"

# Check MySQL
echo "[3/5] Checking MySQL connectivity..."
if ! command -v mysql &> /dev/null; then
    echo "WARNING: MySQL client not found in PATH."
    echo "Please ensure MySQL is installed and added to PATH."
    read -p "Continue anyway? (y/n): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "  MySQL client found."
fi

# Install dependencies
echo "[4/5] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies."
    exit 1
fi
echo "  Dependencies installed successfully."

# Check .env.local
echo "[5/5] Checking environment configuration..."
if [ ! -f ".env.local" ]; then
    echo ""
    echo "Creating .env.local from .env.example..."
    cp -n .env.example .env.local 2>/dev/null || true
    if [ ! -f ".env.local" ]; then
        echo "ERROR: Failed to create .env.local"
        echo "Please manually copy .env.example to .env.local"
        exit 1
    fi
    echo ""
    echo "========================================"
    echo "  IMPORTANT: Configure .env.local"
    echo "========================================"
    echo "Please edit .env.local with your settings:"
    echo "  - MYSQL_HOST      - Database host"
    echo "  - MYSQL_USER      - Database username"
    echo "  - MYSQL_PASSWORD  - Database password"
    echo "  - MYSQL_DATABASE  - Database name"
    echo "  - JWT_SECRET      - Secret key (min 32 chars)"
    echo ""
    read -p "Have you configured .env.local? (y/n): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        echo "Please configure .env.local and run setup again."
        exit 1
    fi
else
    echo "  .env.local found."
fi

# Build the application
echo ""
echo "Building the application..."
npm run build
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Build failed. Please fix errors and try again."
    exit 1
fi
echo "  Build successful!"

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Set up your MySQL database:"
echo "       mysql -u root -p < sql/inventory_schema.sql"
echo "  2. (Optional) Seed test data:"
echo "       node scripts/seed-database.js"
echo "  3. Start the production server (accessible via LAN):"
echo "       npm run start:lan"
echo ""
echo "  IMPORTANT: If accessing via LAN without HTTPS, edit .env.local and set:"
echo "       SESSION_COOKIE_SECURE=false"
echo "    Otherwise, users will not be able to log in."
echo ""