# MotorWorld Inn - VPS Deployment

## DNS Setup
Add these DNS records:
- A record: `app` → `89.144.20.74`
- A record: `api` → `89.144.20.74`

## Deployment
1. Run: `bash deploy/setup.sh`
2. Open: https://app.webotonom.de

## Backend API
- URL: https://api.webotonom.de
- Port: 3001

## Useful Commands
pm2 status motorworld-api
pm2 logs motorworld-api
pm2 restart motorworld-api
