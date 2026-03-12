#!/bin/sh
set -e

# Generate rclone config from template
envsubst < /config/rclone.conf.template > /config/rclone/rclone.conf

# Create mount point
mkdir -p /data

# Mount Google Drive
exec rclone mount gdrive: /data \
  --config /config/rclone/rclone.conf \
  --vfs-cache-mode full \
  --vfs-cache-max-age 1h \
  --vfs-read-chunk-size 8M \
  --allow-other \
  --dir-cache-time 5m \
  --poll-interval 30s \
  --log-level INFO
