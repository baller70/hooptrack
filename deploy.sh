#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'MESSAGE'
Direct local deployment is disabled.

Use the GitHub Actions "Build & Deploy hooptrack (off-box)" workflow only after:
  1. Kevin approves the exact commit for production deployment.
  2. The protected GitHub production environment approval is granted.
  3. The workflow input confirm_release is set to RELEASE_APPROVED.

This wrapper intentionally performs no build, SSH, rsync, PM2, or production action.
MESSAGE
exit 1
