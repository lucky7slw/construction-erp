# 🚀 Quick Start - Docker Deployment

## One-Command Setup

After installing Ubuntu and Docker on your MacBook, just run:

```bash
./setup.sh
```

That's it! The script will:
1. Ask for your domain name
2. Ask for your email
3. Do everything else automatically

## What Gets Created

- ✅ PostgreSQL database with secure password
- ✅ API backend (Node.js + Fastify)
- ✅ Web frontend (Next.js)
- ✅ Nginx reverse proxy
- ✅ SSL certificates (HTTPS)
- ✅ Auto-restart on crash
- ✅ Health monitoring

## After Setup

Your app will be running at:
- **Web**: https://app.yourdomain.com
- **API**: https://api.yourdomain.com

## Daily Commands

```bash
# View what's running
docker-compose ps

# View logs
docker-compose logs -f

# Restart everything
docker-compose restart

# Stop everything
docker-compose down

# Start everything
docker-compose up -d
```

## Update Your App

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## Need Help?

Read the full guide: `DOCKER_DEPLOYMENT.md`

---

**That's all you need to know!** Docker handles the rest. 🎉
