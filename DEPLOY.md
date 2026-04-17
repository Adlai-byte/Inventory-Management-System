# ==========================================
# DEPLOYMENT GUIDE
# ==========================================

## Quick Deploy (Recommended)

### 1. Build & Push Image
```bash
# Tag your image
docker tag inventory-management-system-app:latest yourusername/inventory-app:latest

# Push to Docker Hub
docker push yourusername/inventory-app:latest
```

### 2. On Target Server
```bash
# Pull and run
docker pull yourusername/inventory-app:latest
docker-compose up -d
```

---

## Offline Deploy (No Registry)

### 1. Export Image
```bash
docker save -o inventory-app.tar inventory-management-system-app:latest
```

### 2. Transfer to Server
- USB drive, scp, rsync, etc.
```bash
scp inventory-app.tar user@server:/opt/inventory-app/
```

### 3. On Target Server
```bash
docker load -i inventory-app.tar
docker-compose up -d
```

---

## Fresh Server Setup
```bash
# Download and run setup script
curl -O https://your-repo/raw/main/scripts/server-setup.sh
chmod +x server-setup.sh
./server-setup.sh
```

---

## Environment Configuration

Create `.env` on target server:
```env
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_DATABASE=bmm_db
MYSQL_USER=bmm_user
MYSQL_PASSWORD=your_secure_password
JWT_SECRET=your-32-char-minimum-secret-key
```

---

## Useful Commands
```bash
docker-compose logs -f    # View logs
docker-compose restart    # Restart
docker-compose down       # Stop
docker-compose pull       # Pull latest image
```

---

## Access
- URL: http://server-ip:3000
- Default: admin / admin123
