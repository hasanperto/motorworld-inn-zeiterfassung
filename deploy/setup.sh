#!/bin/bash

# MotorWorld Inn - VPS Deployment Script

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Create directories
mkdir -p /www/motorworld-api
mkdir -p /www/motorworld-app

# Copy backend files (from repo)
cp -r server/* /www/motorworld-api/

# Install backend dependencies
cd /www/motorworld-api
npm install

# Start backend with PM2
pm2 delete motorworld-api 2>/dev/null || true
pm2 start npm --name "motorworld-api" -- start
pm2 save

# Build frontend
cd /path/to/repo
npm install
npm run build

# Copy frontend to nginx directory
cp -r dist/* /www/motorworld-app/

# Configure Nginx
cp deploy/nginx.conf /etc/nginx/sites-available/motorworld
ln -sf /etc/nginx/sites-available/motorworld /etc/nginx/sites-enabled/

# Test and reload nginx
nginx -t
systemctl reload nginx

# SSL with Let's Encrypt
apt install -y certbot python3-certbot-nginx
certbot --nginx -d app.webotonom.de --noninteractive --agree-tos -m admin@webotonom.de

echo "MotorWorld Inn deployed successfully!"
