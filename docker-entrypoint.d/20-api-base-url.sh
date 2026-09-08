#!/bin/sh
# Writes the API URL the browser should call into env.js, before nginx starts.
#
# The bundle is built once and configured here, so the same image serves any environment. The URL
# is resolved by the browser, not by this container, so it must be an address the user's machine
# can reach -- the backend's published port, not the compose service name.
set -eu

API_BASE_URL="${API_BASE_URL:-http://localhost:8080/api}"

cat > /usr/share/nginx/html/env.js <<JS
window.__env = { apiBaseUrl: '${API_BASE_URL}' };
JS

echo "env.js: apiBaseUrl=${API_BASE_URL}"
