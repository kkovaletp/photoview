from flask import Flask, request, abort
from flask_httpauth import HTTPBasicAuth
import subprocess
import os
import re
import sys
import logging

app = Flask(__name__)
auth = HTTPBasicAuth()
try:
  app_port = int(os.environ['PHOTOVIEW_FFMPEG_PORT'])
except ValueError as e:
    print("Got string value for port and cannot convert it to integer.")
    raise SystemExit(e)

# Get the Gunicorn logger
gunicorn_logger = logging.getLogger('gunicorn.error')

users = {
  os.environ['PHOTOVIEW_FFMPEG_USER']: os.environ['PHOTOVIEW_FFMPEG_PASSWORD']
}


@auth.verify_password
def verify_password(username, password):
  if username in users and users.get(username) == password:
    gunicorn_logger.info("Authorized as " + username)
    return username
  else:
    gunicorn_logger.error("Unauthorized request with invalid credentials declined")


@app.route('/health', methods=['GET'])
def health():
  gunicorn_logger.debug("Got health request")
  result = subprocess.run(['ffmpeg', '-version'],
                          capture_output=True, text=True)

  if result.returncode == 0:
    gunicorn_logger.debug("Return health 200 OK")
    return result.stdout, 200
  else:
    gunicorn_logger.error(
        "Got health request, but FFmpeg tool returned error. Service UNHEALTHY 500 \n"
        + result.stderr)
    return result.stderr, 500


@app.route('/execute', methods=['POST'])
@auth.login_required
def execute():
  command = request.json['command']
  gunicorn_logger.debug("Got POST request with the command " + command)

  # Input validation
  if re.search(r'[;&|`$<>]', command):
    gunicorn_logger.error(
        "Abort execution before starting: Invalid characters in command")
    abort(400, description="Invalid characters in command")

  # Execute the command using ffmpeg
  result = subprocess.run(['/ffmpegwrapper.sh'] + command.split(),
                          capture_output=True, text=True)

  gunicorn_logger.debug("Finished media processing by the FFmpeg tool")

  # Log the result to stdout and stderr
  if not result.stdout.endswith('\n'):
    result.stdout += '\n'
  gunicorn_logger.info(result.stdout)
  gunicorn_logger.error(result.stderr)

  # Check the return code of the command
  if result.returncode != 0:
    # The command failed, send a 500 status code
    return {'stdout': result.stdout, 'stderr': result.stderr}, 500

  # Return the result
  return {'stdout': result.stdout, 'stderr': result.stderr}, 200


if __name__ == '__main__':
  app.run(host='0.0.0.0', port=app_port)
