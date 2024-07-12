# External FFmpeg video processing worker

This is an optional service, providing the ability to host the external to Photoview worker to process 
videos, utilizing system hardware acceleration and providing a newer FFmpeg version, than installed 
inside Photoview image. As a result, with this service, you're able to process source videos faster, 
and even move this type of resourceful activity from your main Photoview host to some other more 
powerful system.

> Please note that this is an optional complex setup. To be able to configure and use it, you need to
> have appropriate technical (system administration) skills, understand what you are doing, 
> and what might be the consequences.

## Requirements

- Photoview service should be able to call the FFmpeg external worker's HTTP endpoints (and receive
response) using the configured in `.env` set of parameters
- Both Photoview and the external FFmpeg worker should access the source videos in the user's media
library as well as the media cache location with the same paths and permissions. This means that in 
the case of Docker, those volumes should be mapped to both services exactly the same; in the case of 
hosting on another system, these folders should be mapped through network on the FFmpeg worker's host 
 at the same local paths, as in Photoview
- If the FFmpeg worker is hosted on another system, it should use exactly the same set of environment
variables (`FFMPEG_*`) as on Photoview

## Typical setups

- FFmpeg worker runs as a container in the same Docker Compose setup, as Photoview. This is the easiest
setup: just uncomment the corresponding environment variables in the `.env`, set correct values for them,
uncomment the `ffmpeg` service in the compose file and configure it following the inline comments. To
be able to utilize your host's GPU hardware acceleration, make sure that you have proper GPU drivers 
installed and shared with the FFmpeg service in the correct way.
- FFmpeg worker runs as a container on the other host. In addition to the previous case, you need to 
make a copy of your `.env`, `docker-compose.yml`, and optionally `Makefile` to that host at the location,
you'd prefer to be the worker's home folder. Then you need to comment out the `ffmpeg` service in the
`docker-compose.yml` on the Photoview host and comment out all other services except of the `ffmpeg` 
service in the `docker-compose.yml` on the FFmpeg host. So, as a result, you need to have exactly the 
same `.env` files and inverted `docker-compose.yml` files on both systems. Finally, you need to share
the Photoview's storage folder (with full permissions) and the media library with your source media 
files (with read-only permissions) through network to the FFmpeg worker's host, map those network-shared
resources to corresponding empty folders on the FFmpeg host (you might want to create them inside your 
worker's home folder to keep everything in the same place), and update the corresponding paths in the 
`.env` file on the FFmpeg host.
- FFmpeg worker runs on the host directly. This is the most complex setup, but in theory it could give
you the best performance, as the FFmpeg tool runs on the host directly without intermediate
abstraction/translation Docker layer. The FFmpeg's host could be the same host, which runs Photoview
in Docker Compose, or it could be a remote host, accessible from Photoview through network.Only 
Unix/Linux/MacOS-based host is supported for this type of setup, as the path has to be the same as for 
Photoview. It might work under WSL2 on Windows, but somebody needs to test and proof this assumption. 
To make it work, you need (in addition to the mentioned in the previous setups actions) to share and 
map Media cache and Source media library folders to exactly the same paths on the FFmpeg host, as they 
mapped in Photoview (`/photos` for Source media library's root, `/home/photoview/media-cache` for Media 
cache in the case Photoview runs in a container, managed by Docker Compose). If this is the same host,
which runs Photoview in Docker Compose, you can map the mentioned folders by creating corresponding 
symlinks on the mentioned paths. Then you need to compile and install the FFmpeg tool with the support
of your GPU drivers, as the standard pre-built binary doesn't support any GPU hardware acceleration.
Also, you need to configure and run the Gunicorn web-server on your host, which will serve the `server.py`
from this repo's folder (you need to check your OS documentation for service definition; to understand
how the Gunicorn server is installed, configured, and started inside a container, you can read the
`Dockerfile` in this repo's folder). Finally, make sure that all the `FFMPEG_*` environment variables
are defined and applied to the web server on the host with exactly the same values, as set on the 
Photoview side.
