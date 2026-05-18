#!/usr/bin/env bash
set -euo pipefail
URL="${1:?usage: cold-start-verify.sh <production-url>}"
TOKEN="${INVITE_TOKEN:?INVITE_TOKEN env var required}"
URL="${URL%/}"  # strip trailing slash
FAIL=0

check() {
  local label="$1" expected="$2" path="$3"
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" "$URL$path")
  if [ "$actual" = "$expected" ]; then
    echo "ok    $label  $path -> $actual"
  else
    echo "FAIL  $label  $path -> $actual (expected $expected)"
    FAIL=1
  fi
}

check "root-no-token-404"      404 "/"
check "wrong-token-404"        404 "/wrong-token"
check "right-token-200"        200 "/$TOKEN"
check "admin-login-reachable"  200 "/$TOKEN/admin/login"
check "admin-no-cookie-307"    307 "/$TOKEN/admin"
check "static-favicon-200"     200 "/favicon.ico"

BODY=$(curl -s "$URL/$TOKEN")
if echo "$BODY" | grep -q FriendSwap; then
  echo "ok    body-contains-FriendSwap"
else
  echo "FAIL  body did not contain 'FriendSwap'"
  FAIL=1
fi
if echo "$BODY" | grep -q 'Nothing here yet'; then
  echo "ok    body-contains-empty-state"
else
  echo "FAIL  body did not contain 'Nothing here yet'"
  FAIL=1
fi

if [ $FAIL -eq 0 ]; then
  echo
  echo "cold-start-verify: ALL CHECKS PASSED for $URL"
  exit 0
else
  echo
  echo "cold-start-verify: FAILURES — see above"
  exit 1
fi
