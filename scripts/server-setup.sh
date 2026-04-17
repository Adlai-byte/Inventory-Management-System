#!/bin/bash
# ==========================================
# BASTISTIL Inventory - Server Setup
# ==========================================
# Run this on a fresh server to get started

set -e

echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

echo "Creating app directory..."
mkdir -p /opt/inventory-app
cd /opt/inventory-app

echo "Pulling latest image..."
docker pull bastistil/inventory-app:latest

echo "Downloading docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-bmm_db}
      MYSQL_USER: ${MYSQL_USER:-bmm_user}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-bmm_password}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./sql/inventory_schema.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD:-rootpassword}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - bastistil-network

  app:
    image: bastistil/inventory-app:latest
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      NODE_ENV: production
      MYSQL_HOST: mysql
      MYSQL_PORT: 3306
      MYSQL_USER: ${MYSQL_USER:-bmm_user}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-bmm_password}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-bmm_db}
      JWT_SECRET: ${JWT_SECRET:-change-this-to-a-random-32-char-minimum-secret-key}
      SESSION_COOKIE_SECURE: "false"
    ports:
      - "3000:3000"
    networks:
      - bastistil-network

volumes:
  mysql_data:
    driver: local

networks:
  bastistil-network:
    driver: bridge
EOF

echo "Downloading SQL schema..."
mkdir -p sql
curl -o sql/inventory_schema.sql https://your-repo/raw/main/sql/inventory_schema.sql

echo ""
echo "Setup complete! Start with:"
echo "  cd /opt/inventory-app"
echo "  docker-compose up -d"
echo ""
echo "Access at: http://your-server-ip:3000"
echo "Default login: admin / admin123"
