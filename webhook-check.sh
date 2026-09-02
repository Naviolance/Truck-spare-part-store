#!/usr/bin/env bash
# Simulates a Notch Pay webhook hitting the local backend, so you can test
# order confirmation/failure without waiting on a real payment.
#
# Usage: ./webhook-check.sh <order-number> [payment.complete|payment.failed]

set -euo pipefail

ORDER_NUMBER="${1:?Usage: ./webhook-check.sh <order-number> [payment.complete|payment.failed]}"
EVENT_TYPE="${2:-payment.complete}"
BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"

# Pull the webhook signing secret from .env rather than hardcoding it here.
NOTCHPAY_WEBHOOK_HASH="$(grep -E '^NOTCHPAY_WEBHOOK_HASH=' .env | cut -d= -f2-)"
if [ -z "$NOTCHPAY_WEBHOOK_HASH" ]; then
  echo "NOTCHPAY_WEBHOOK_HASH not found in .env" >&2
  exit 1
fi

BODY=$(cat <<EOF
{"type":"$EVENT_TYPE","data":{"reference":"$ORDER_NUMBER","transaction":{"reference":"test_tx_$ORDER_NUMBER"}}}
EOF
)

SIGNATURE=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$NOTCHPAY_WEBHOOK_HASH" | sed 's/^.* //')

curl -i "$BACKEND_URL/payments/webhooks/notchpay" \
  -H "Content-Type: application/json" \
  -H "X-Notch-Signature: $SIGNATURE" \
  -d "$BODY"
