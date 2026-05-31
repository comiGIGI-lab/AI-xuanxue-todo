#!/usr/bin/env bash
set -e

# Anchor all relative paths (logs/, project/frontend, skills/...) to the
# script's own directory so behavior is identical regardless of where the
# caller invoked us from.
cd "$(dirname "$0")"

mkdir -p logs

ts() { date '+%Y-%m-%d %H:%M:%S'; }
LOG=logs/frontend.log

# --- Pre-start static check: ESM import↔export linkage --------------------
# Catches relative-import problems that survive HTTP smoke tests:
# unresolved relative module paths (e.g. base-path confusion where
# `import './js/x.js'` from inside js/y.js resolves to js/js/x.js, 404 at
# runtime), missing named exports (cross-module name mis-attribution), and
# default imports against modules with no default export. `curl /` returning
# 200 cannot detect any of these — only static linkage can.
ESM_CHECKER=skills/fast-html-frontend/scripts/check-esm-imports.py
ESM_TARGET=project/frontend
if [ -f "$ESM_CHECKER" ] && [ -d "$ESM_TARGET" ]; then
  echo "[$(ts)] esm-check start" | tee -a "$LOG"
  python3 "$ESM_CHECKER" "$ESM_TARGET" 2>&1 | tee -a "$LOG"
  rc=${PIPESTATUS[0]}
  if [ "$rc" -ne 0 ]; then
    {
      echo "[$(ts)] esm-check FAILED (exit=$rc) — refusing to start live-server."
      echo "    Fix the import/export issues above. Each FAIL line names the"
      echo "    source file, line, import specifier, and failure kind"
      echo "    (unresolved_module / missing_named / missing_default)."
    } | tee -a "$LOG" >&2
    exit 2
  fi
  echo "[$(ts)] esm-check OK" | tee -a "$LOG"
fi

lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

export CHOKIDAR_USEPOLLING=true
export CHOKIDAR_INTERVAL=1000

trap 'ec=$?; echo "[$(ts)] failed (exit=$ec)"; tail -20 "$LOG" 2>/dev/null || true; exit $ec' ERR

echo "[$(ts)] start" >> "$LOG"

nohup stdbuf -oL -eL live-server --no-browser --cors project/frontend \
  --entry-file=index.html \
  --watch-use-polling \
  --watch-interval=1000 \
  --proxy=/api:http://127.0.0.1:8000/api \
  --proxy=/socket.io:http://127.0.0.1:8000/socket.io \
  --port=5173 \
  --host=0.0.0.0 </dev/null >>"$LOG" 2>&1 &
PID=$!
disown
echo "$PID" > logs/frontend.pid

trap - ERR

for i in $(seq 1 30); do
  if curl -fs -o /dev/null http://127.0.0.1:5173/; then
    echo "[$(ts)] up pid=$PID"
    exit 0
  fi
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "[$(ts)] died pid=$PID"
    tail -20 "$LOG" || true
    exit 1
  fi
  sleep 1
done

echo "[$(ts)] timeout 30s pid=$PID"
tail -20 "$LOG" || true
exit 1
