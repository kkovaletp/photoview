#! /bin/bash
set -e

pipenv run gunicorn \
  -b 0.0.0.0:"${PHOTOVIEW_FFMPEG_PORT}" \
  --timeout "${PHOTOVIEW_FFMPEG_TIMEOUT}" \
  --log-level "${PHOTOVIEW_FFMPEG_LOGLEVEL}" \
  --worker-class gevent \
  --workers "${PHOTOVIEW_FFMPEG_WORKERS}" \
  server:app
