FROM linuxserver/ffmpeg:latest

RUN apt-get update && apt-get install -y python3 python3-pip python3-venv curl \
  && apt-get autoremove -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY ./server.py ./entrypoint.sh /

ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv "${VIRTUAL_ENV}"
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"
RUN pip3 install flask Flask-HTTPAuth gunicorn \
  && chmod +x /entrypoint.sh

EXPOSE ${PHOTOVIEW_FFMPEG_PORT}

HEALTHCHECK --interval=60s --timeout=10s \
  CMD curl --fail http://localhost:${PHOTOVIEW_FFMPEG_PORT}/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
