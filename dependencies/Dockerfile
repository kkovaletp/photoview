FROM --platform=${BUILDPLATFORM:-linux/amd64} debian:bookworm-slim AS version-detector
ARG TARGETPLATFORM
# See for details: https://github.com/hadolint/hadolint/wiki/DL4006
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]
COPY detect-versions.sh /tmp/
RUN chmod +x /tmp/detect-versions.sh \
    && /tmp/detect-versions.sh > /versions.env

FROM --platform=${BUILDPLATFORM:-linux/amd64} debian:bookworm-slim AS base-prep
ARG TARGETPLATFORM
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]
COPY --from=version-detector /versions.env /versions.env
COPY prepare.sh /tmp/
RUN chmod +x /tmp/prepare.sh && /tmp/prepare.sh \
    && mkdir -p /output/bin /output/lib /output/include /output/pkgconfig /output/etc /output/deb

FROM base-prep AS build-libraw
ARG LIBRAW_VERSION
WORKDIR /tmp/build-libraw
COPY build_libraw.sh .
RUN chmod +x ./build_libraw.sh \
    && export $(cat /env) && export $(cat /versions.env) && ./build_libraw.sh

FROM base-prep AS build-libheif
ARG LIBHEIF_VERSION
WORKDIR /tmp/build-libheif
COPY build_libheif.sh .
RUN chmod +x ./build_libheif.sh \
    && export $(cat /env) && export $(cat /versions.env) && ./build_libheif.sh

FROM base-prep AS build-imagemagick
ARG IMAGEMAGICK_VERSION
WORKDIR /tmp/build-imagemagick
COPY build_imagemagick.sh .
RUN chmod +x ./build_imagemagick.sh \
    && export $(cat /env) && export $(cat /versions.env) && ./build_imagemagick.sh

FROM base-prep AS download-jellyfin-ffmpeg
ARG JELLYFIN_FFMPEG_VERSION
WORKDIR /tmp/build-jellyfin
COPY download_jellyfin-ffmpeg.sh .
RUN chmod +x ./download_jellyfin-ffmpeg.sh \
    && export $(cat /env) && export $(cat /versions.env) && ./download_jellyfin-ffmpeg.sh

FROM base-prep AS final-assembly
COPY --from=build-libraw /output/ /output/
COPY --from=build-libheif /output/ /output/
COPY --from=build-imagemagick /output/ /output/
COPY --from=download-jellyfin-ffmpeg /output/ /output/

COPY output.sh /
RUN chmod +x /output.sh && /output.sh

FROM debian:bookworm-slim AS release
COPY --from=final-assembly /artifacts.tar.gz /
USER nobody
