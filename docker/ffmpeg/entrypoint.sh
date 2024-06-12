#! /bin/bash

source /opt/venv/bin/activate
gunicorn -b 0.0.0.0:"${PHOTOVIEW_FFMPEG_PORT}" \
  --timeout "${PHOTOVIEW_FFMPEG_TIMEOUT}" \
  --log-level "${PHOTOVIEW_FFMPEG_LOGLEVEL}" \
  server:app
