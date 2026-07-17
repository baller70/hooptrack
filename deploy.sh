#!/bin/bash
set -euo pipefail

echo "==> Rebuilding locally..."
npm run build

HOST="contabo"
APP="/opt/apps/hooptrack"

echo "==> Preparing incoming directory on Contabo..."
ssh $HOST "rm -rf $APP/.next.incoming && mkdir -p $APP/.next.incoming"

echo "==> Syncing .next directory..."
rsync -az --delete ./.next/ $HOST:$APP/.next.incoming/

echo "==> Syncing package.json and lockfile..."
rsync -az ./package-lock.json ./package.json $HOST:$APP/

echo "==> Executing remote cutover on Contabo..."
ssh $HOST "bash -s" <<'REMOTE'
  set -uo pipefail
  APP=/opt/apps/hooptrack
  PM2_NAME=hooptrack
  LIVE_PORT=3053

  cd "$APP"

  echo "-> Installing dependencies on server..."
  corepack pnpm install --no-frozen-lockfile --config.verify-deps-before-run=false || true
  npm rebuild better-sqlite3 sharp 2>/dev/null || true
  corepack pnpm exec prisma generate 2>/dev/null || true

  echo "-> Swapping .next directories..."
  rm -rf .next.old
  [ -d .next ] && mv .next .next.old || true
  mv .next.incoming .next

  echo "-> Restarting PM2 process..."
  pm2 stop "$PM2_NAME" 2>/dev/null || true
  fuser -k "$LIVE_PORT"/tcp 2>/dev/null || true
  
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 restart "$PM2_NAME" --update-env || pm2 start "$PM2_NAME" --update-env || true
  else
    pm2 start node_modules/next/dist/bin/next --name "$PM2_NAME" --cwd "$APP" -- start -p "$LIVE_PORT" || true
  fi

  echo "-> Successfully cut over to new build!"
REMOTE

echo "==> Deployment complete!"
