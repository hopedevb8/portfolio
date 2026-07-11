# Railway Backend Deploy

This is the recommended path for direction A:

- Public portfolio on GitHub Pages
- Admin API on Railway
- SQLite stored on a Railway volume

## Railway service

1. Create a new Railway project from this GitHub repository.
2. Create a service from the repo root.
3. Set the start command to:

```bash
npm run api
```

4. In the service settings, enable Public Networking and generate a Railway domain.
5. Attach a volume to the backend service and mount it at:

```text
/data
```

## Backend variables

Set these variables on the Railway service:

```env
NODE_ENV=production
DATABASE_FILE_PATH=/data/portfolio.sqlite
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=scrypt:...
ADMIN_ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
ADMIN_ALLOWED_ORIGINS=https://your-user.github.io
ADMIN_REFRESH_COOKIE_SAME_SITE=None
ADMIN_REFRESH_COOKIE_SECURE=true
```

Optional:

```env
ADMIN_REFRESH_COOKIE_DOMAIN=your-api-domain.com
```

Notes:

- Railway injects `PORT`; the backend now reads it automatically.
- The backend now defaults to `0.0.0.0` in production, so it can bind correctly on Railway.
- The SQLite file should live on the mounted volume, not inside the ephemeral container filesystem.

## Frontend build

For the GitHub Pages build, provide:

```env
GATSBY_API_BASE_URL=https://your-api-domain.com
```

If this variable is missing at build time, `/admin` will show `API unavailable`.
