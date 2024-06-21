FROM linuxserver/ffmpeg:latest

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"

# See for details: https://github.com/hadolint/hadolint/wiki/DL4006
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
# Install dependencies
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv curl \
  && apt-get autoremove -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  # Create Python Virtual environment
  && python3 -m venv "${VIRTUAL_ENV}" \
  && pip3 install --no-cache-dir flask Flask-HTTPAuth gunicorn gevent

COPY --chmod=500 ./server.py ./entrypoint.sh /

ENV PHOTOVIEW_FFMPEG_PORT=5000
EXPOSE ${PHOTOVIEW_FFMPEG_PORT}

HEALTHCHECK --interval=60s --timeout=10s \
  CMD curl --fail http://localhost:${PHOTOVIEW_FFMPEG_PORT}/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
