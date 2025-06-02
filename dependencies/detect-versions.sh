#!/bin/bash
set -euo pipefail

# Fetch latest version tags from GitHub releases
LIBRAW_VERSION=$(curl -s https://api.github.com/repos/LibRaw/LibRaw/releases/latest | jq -r '.tag_name')
LIBHEIF_VERSION=$(curl -s https://api.github.com/repos/strukturag/libheif/releases/latest | jq -r '.tag_name')
IMAGEMAGICK_VERSION=$(curl -s https://api.github.com/repos/ImageMagick/ImageMagick/releases/latest | jq -r '.tag_name')
JELLYFIN_FFMPEG_VERSION=$(curl -s https://api.github.com/repos/jellyfin/jellyfin-ffmpeg/releases/latest | jq -r '.tag_name')

# Output as environment variables
echo "LIBRAW_VERSION=${LIBRAW_VERSION}"
echo "LIBHEIF_VERSION=${LIBHEIF_VERSION}"
echo "IMAGEMAGICK_VERSION=${IMAGEMAGICK_VERSION}"
echo "JELLYFIN_FFMPEG_VERSION=${JELLYFIN_FFMPEG_VERSION}"

# Create a combined cache key for the workflow
COMBINED_VERSION="${LIBRAW_VERSION}-${LIBHEIF_VERSION}-${IMAGEMAGICK_VERSION}-${JELLYFIN_FFMPEG_VERSION}"
echo "COMBINED_VERSION=${COMBINED_VERSION}"
