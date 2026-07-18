# Deploying ArchSim to AWS

A simple, always-on, free-tier deployment: **one EC2 instance** running the app
(backend + nginx frontend + Caddy for HTTPS) and **one RDS PostgreSQL** database,
served at **https://arch-sim.dev**.

```
            arch-sim.dev (DNS A record)
                    │
                    ▼
        ┌───────────────────────────┐        ┌──────────────────┐
        │   EC2 t3.micro (Docker)    │        │  RDS PostgreSQL  │
        │  Caddy ─ TLS :443          │        │  db.t3.micro     │
        │    └─ frontend (nginx)     │ ─────▶ │  (free tier)     │
        │         └─ /api → backend  │  5432  │                  │
        └───────────────────────────┘        └──────────────────┘
```

Everything is one HTTPS origin (Caddy → nginx → backend), so there's no CORS,
no separate API subdomain, and no mixed-content to worry about.

---

## 0. Prerequisites
- The domain **arch-sim.dev** (you have it) and access to its DNS.
- An AWS account with free-tier available.
- An SSH key pair for EC2.

## 1. Create the database (RDS PostgreSQL — free tier)
1. RDS → **Create database** → **PostgreSQL** → Template **Free tier**.
2. DB instance: **db.t3.micro**, storage 20 GB.
3. Settings: master username `archsim`, set a strong password, initial DB name `archsim`.
4. Connectivity: same region you'll use for EC2, **Public access: No**.
5. After it's created, note the **endpoint** (e.g. `archsim.xxxx.us-east-1.rds.amazonaws.com`).
6. Its security group must allow inbound **5432** from the EC2's security group (set this in step 3).

Flyway runs the schema migrations automatically the first time the backend boots — you don't create tables by hand.

## 2. Launch the server (EC2 t3.micro — free tier)
1. EC2 → **Launch instance** → **Ubuntu 24.04**, type **t3.micro** (free tier).
2. Key pair: select/create one for SSH.
3. **Security group** inbound rules:
   - SSH `22` — your IP only
   - HTTP `80` — `0.0.0.0/0`  (Caddy needs it for the TLS challenge + redirect)
   - HTTPS `443` — `0.0.0.0/0`
4. Allocate an **Elastic IP** and associate it with the instance (so the IP is stable across restarts).

### Install Docker + add swap
SSH in (`ssh -i key.pem ubuntu@<elastic-ip>`), then:
```bash
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && newgrp docker

# 2 GB swap — important: 1 GB RAM alone will OOM during the image build
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Open the DB to the app
In the RDS security group, add inbound **PostgreSQL 5432** with source = the **EC2 instance's security group**. (Keeps the DB private; only the app can reach it.)

## 4. Point the domain at the server
At your DNS provider for **arch-sim.dev**, add records → the Elastic IP:
```
A   arch-sim.dev       <elastic-ip>
A   www.arch-sim.dev   <elastic-ip>     (optional)
```
`.dev` is HTTPS-only (HSTS preload) — that's fine, Caddy serves HTTPS.

## 5. Deploy
```bash
git clone https://github.com/sathwik7993/ArchSim.git
cd ArchSim
cp deploy/.env.example .env
nano .env      # fill in RDS endpoint/password + a real token secret
```
Generate the token secret (the prod profile refuses to start without a strong one):
```bash
openssl rand -base64 48
```
Then build & start:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
The first build takes several minutes on a t3.micro. Caddy fetches the TLS
certificate automatically once DNS has propagated and ports 80/443 are open.

## 6. Verify
```bash
docker compose -f docker-compose.prod.yml ps          # all services Up
curl -s https://arch-sim.dev/api/v1/problems | head    # served catalog (200)
docker compose -f docker-compose.prod.yml logs backend # look for Flyway + "Started"
```
Then open **https://arch-sim.dev** in a browser and register an account.

## 7. Updating later
```bash
cd ArchSim && git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Free tier & cost
- Free tier covers EC2 t3.micro (750 h/mo) + RDS db.t3.micro (750 h/mo) for 12 months.
- When your free window ends (~4.5 months from now), always-on EC2 + RDS is roughly
  **$25–30/mo**. Migration options at that point: move the DB to a free managed Postgres
  (Neon/Supabase), or move the whole box to Oracle Cloud **Always Free** (free forever).
- Nothing in the app is AWS-specific — it's just Docker + Postgres, so it runs anywhere.

## Notes
- **Redis** isn't needed — the backend doesn't use it (rate-limit + token denylist are in-memory).
  If you ever scale to more than one instance, add a shared Redis and revisit those two.
- If the build is slow/OOMs, confirm swap is on (`swapon --show`). You can also pre-build
  images in CI and pull them instead of building on the box.
