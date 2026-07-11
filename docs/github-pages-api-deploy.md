# GitHub Pages + Separate API

This project can publish the public Gatsby site to GitHub Pages, while the admin CMS talks to a separately deployed Node.js API.

## 1. Deploy the backend

Deploy the `server/` app to a Node.js host that supports HTTPS.

Required backend environment variables:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=scrypt:...
ADMIN_ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
ADMIN_ALLOWED_ORIGINS=https://your-user.github.io
ADMIN_REFRESH_COOKIE_SAME_SITE=None
ADMIN_REFRESH_COOKIE_SECURE=true
```

Optional:

```env
ADMIN_REFRESH_COOKIE_DOMAIN=api.your-domain.com
API_HOST=0.0.0.0
DATABASE_FILE_PATH=/data/portfolio.sqlite
NODE_ENV=production
```

Notes:

- `ADMIN_ALLOWED_ORIGINS` must include the exact frontend origin, not the full path.
- Cross-origin refresh cookies require HTTPS plus `SameSite=None; Secure`.

## 2. Build the frontend with the API URL

For the GitHub Pages build, set:

```env
GATSBY_API_BASE_URL=https://api.your-domain.com
```

`GATSBY_API_BASE_URL` is compiled into the static build. If it is missing, `/admin` will show `API unavailable`.

## 3. Local dev

Use local fallback:

```bash
npm run api
npm run develop
```

In local dev, the frontend automatically uses `http://localhost:3001` or `http://127.0.0.1:3001`.
