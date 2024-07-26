FROM linuxserver/ffmpeg:latest

COPY --chmod=500 ./Pipfile ./Pipfile.lock ./server.py ./entrypoint.sh /
ENV PIPENV_IGNORE_VIRTUALENVS=1

# See for details: https://github.com/hadolint/hadolint/wiki/DL4006
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install dependencies
RUN apt-get update && apt-get install -y python3 python3-pip pipenv curl \
  && apt-get autoremove -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  # Create Python Virtual environment with dependencies \
  && pipenv sync --python "$(which python3)"

ENV PHOTOVIEW_FFMPEG_PORT=5000
EXPOSE ${PHOTOVIEW_FFMPEG_PORT}

HEALTHCHECK --interval=60s --timeout=10s \
  CMD curl --fail http://localhost:${PHOTOVIEW_FFMPEG_PORT}/health || exit 1

LABEL org.opencontainers.image.source=https://github.com/kkovaletp/photoview/

ENTRYPOINT ["/entrypoint.sh"]
