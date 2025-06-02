#!/bin/bash
set -euo pipefail

: "${DEB_HOST_MULTIARCH=x86_64-linux-gnu}"
: "${DEB_HOST_ARCH=amd64}"

echo Compiler: "${DEB_HOST_MULTIARCH}" Arch: "${DEB_HOST_ARCH}"

URL="https://api.github.com/repos/jellyfin/jellyfin-ffmpeg/tarball/${JELLYFIN_FFMPEG_VERSION}"
echo download jellyfin-ffmpeg from "$URL"
curl -L -o ./jellyfin-ffmpeg.deb "$URL"

mkdir -p /output/deb
cp ./jellyfin-ffmpeg.deb /output/deb/
