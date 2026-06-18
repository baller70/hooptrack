module.exports = {
  apps: [{
    name: "hooptrack",
    script: "node_modules/next/dist/bin/next",
    args: "start --port 3200",
    cwd: "/opt/apps/hooptrack",
    env: { NODE_ENV: "production", PORT: 3200 },
  }],
}
