# Deploying to your VPS — soccerbeast.duckdns.org

## Before you start — what this actually deploys

**There is no backend yet.** Everything built so far is the frontend
component library from `README.md` / `API_CONTRACT.md` — it runs entirely
against mock data (`src/mock/*.js`) because `USE_MOCK` is on whenever
`VITE_API_BASE_URL` isn't set (see `src/api/mockMode.js`). Deploying today
gets you a **live, clickable demo** with fake data — real sign-in, real
predictions, and real admin actions won't persist anywhere. That's still
useful (share it, click through every page, sanity-check the design on a
real domain/device) — just don't point people at it expecting it to save
their picks yet.

Once a real backend exists (built against `API_CONTRACT.md`), come back to
step 6 — that's the only step that changes.

---

## 1. Point the domain at your VPS

DuckDNS domains track whatever IP you last told them, via a token — they
don't auto-detect your server. On the VPS:

```bash
# Get this token from https://www.duckdns.org (sign in, it's on the page)
DUCKDNS_TOKEN="paste-your-token-here"
curl "https://www.duckdns.org/update?domains=soccerbeast&token=${DUCKDNS_TOKEN}&ip="
```

The trailing `ip=` (empty) tells DuckDNS to use whatever IP the request came
from — i.e. your VPS's public IP. You should get back `OK`.

Because most VPS providers give you a **static** IP, you technically only
need to run that once. But if your provider ever changes it, the domain goes
stale silently, so set up a cron job to be safe:

```bash
crontab -e
```
Add:
```
*/15 * * * * curl -s "https://www.duckdns.org/update?domains=soccerbeast&token=YOUR_TOKEN&ip=" >/dev/null 2>&1
```

Verify it resolves before moving on:
```bash
dig +short soccerbeast.duckdns.org
# should print your VPS's public IP
```

## 2. Install Docker on the VPS

(Skip if already installed — check with `docker --version`.)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker   # or log out/in
```

## 3. Get the project onto the VPS

From your own machine (wherever you unzipped `soccer-beast-components.zip`):

```bash
scp -r soccer-beast-components/ your-user@your-vps-ip:~/soccerbeast
```

Or, better, put it in a git repo and `git clone` it on the VPS instead — makes
future deploys a `git pull` + rebuild instead of a re-upload.

## 4. Build and run the container

```bash
ssh your-user@your-vps-ip
cd ~/soccerbeast
docker compose up -d --build
```

This builds the production bundle and serves it via nginx **inside** the
container, listening only on `127.0.0.1:8080` (see `docker-compose.yml`) —
not directly exposed to the internet yet. Confirm it's up:

```bash
curl -I http://127.0.0.1:8080
# expect: HTTP/1.1 200 OK
```

## 5. Put a real nginx + TLS in front of it

The container's nginx serves the app; a second nginx **on the host** handles
the public-facing domain and HTTPS certificate, then reverse-proxies to the
container. This is the standard pattern and keeps certificate renewal simple.

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/soccerbeast`:

```nginx
server {
    listen 80;
    server_name soccerbeast.duckdns.org;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it and reload:

```bash
sudo ln -s /etc/nginx/sites-available/soccerbeast /etc/nginx/sites-enabled/
sudo nginx -t   # should say "syntax is ok" / "test is successful"
sudo systemctl reload nginx
```

At this point `http://soccerbeast.duckdns.org` should load the site (no
HTTPS yet). Now get the certificate — certbot edits the same nginx config
in place to add the `listen 443 ssl` block and redirect http → https:

```bash
sudo certbot --nginx -d soccerbeast.duckdns.org
```

Answer its prompts (email address, agree to terms; say yes to redirecting
HTTP to HTTPS when asked). Certbot also installs a systemd timer that
auto-renews the cert before it expires — nothing further to do.

Verify:
```bash
curl -I https://soccerbeast.duckdns.org
# expect: HTTP/2 200
```

## 6. Once a real backend exists

Update `docker-compose.yml`'s `VITE_API_BASE_URL` build arg to the backend's
address (e.g. `https://soccerbeast.duckdns.org/api` if it's proxied under the
same domain, or a separate host), then:

```bash
docker compose up -d --build
```

That's it — `src/api/mockMode.js` picks up the change at build time and every
container in `src/containers/` starts hitting the real endpoints in
`API_CONTRACT.md` instead of mock data. Nothing else needs to change.

## Redeploying after changes

```bash
cd ~/soccerbeast
git pull            # or re-upload via scp
docker compose up -d --build
```

nginx and the TLS cert on the host are untouched by this — only the app
container rebuilds.

## Troubleshooting

- **Domain doesn't resolve** → re-run the DuckDNS curl command from step 1,
  then `dig +short soccerbeast.duckdns.org` again.
- **Site loads over HTTP but not HTTPS** → `sudo certbot certificates` to
  check the cert exists; `sudo nginx -t` to check the host config is valid.
- **502 Bad Gateway** → the container isn't running or isn't listening on
  8080. Check `docker compose ps` and `docker compose logs web`.
- **Old version still showing after redeploy** → hard-refresh (the container
  rebuild changes the JS bundle's filename hash, so this is usually a stale
  service worker or CDN cache elsewhere, not nginx — `nginx.conf` already
  sets `index.html` itself to not be cached).
