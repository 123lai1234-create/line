# Keepalive sidecar: hits the web service healthz endpoint every N minutes so
# Render free tier does not spin it down. Uses minimal alpine + curl.
FROM alpine:3.20

RUN apk add --no-cache curl bash

# Render cron jobs run the entrypoint as a one-shot script. Sleep until the
# scheduled interval then curl the target. We let the cron schedule itself
# drive the cadence, so this just exits quickly.
CMD ["sh", "-c", "curl -fsS -m 5 -o /dev/null \"${TARGET_URL}/api/healthz\" || true; exit 0"]
