# Railway Backend Deploy

This is the recommended path for direction A:

- Public portfolio on GitHub Pages
- Admin API on Railway
- SQLite stored on a Railway volume

## Railway service

1. Create a new Railway project from this GitHub repository.
2. Create a service from the repo root.
3. Keep the root directory at the repository root.
4. This repo includes [nixpacks.toml](/Users/macbookcuahopdoaaaaa/Documents/GitHub/portfolio/nixpacks.toml:1), so Railway should:

- run `npm ci`
- skip the Gatsby frontend build
- start the backend with `npm run api`
- use Node `22.x` from [package.json](/Users/macbookcuahopdoaaaaa/Documents/GitHub/portfolio/package.json:1)

5. In the service settings, enable Public Networking and generate a Railway domain.
6. Attach a volume to the backend service and mount it at:

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
- The repo also includes [.dockerignore](/Users/macbookcuahopdoaaaaa/Documents/GitHub/portfolio/.dockerignore:1) to avoid shipping local `node_modules`, `public`, and Gatsby cache into build context.
- If Railway still shows Node `18.x`, set the service Node version to `22` or recreate the service after pushing the updated [package.json](/Users/macbookcuahopdoaaaaa/Documents/GitHub/portfolio/package.json:1) and [.nvmrc](/Users/macbookcuahopdoaaaaa/Documents/GitHub/portfolio/.nvmrc:1).

## Frontend build

For the GitHub Pages build, provide:

```env
GATSBY_API_BASE_URL=https://your-api-domain.com
```

If this variable is missing at build time, `/admin` will show `API unavailable`.
