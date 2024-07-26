from flask import Flask, request
from flask_httpauth import HTTPBasicAuth
import subprocess
import os
import re
import logging
import time
from datetime import timedelta

app = Flask(__name__)
auth = HTTPBasicAuth()
gunicorn_logger = logging.getLogger('gunicorn.error')

try:
  app_port = int(os.environ['PHOTOVIEW_FFMPEG_PORT'])
except ValueError as e:
  gunicorn_logger.error(
      "Got string value for port and cannot convert it to integer.\n%s",
      "", exc_info=True)
  raise SystemExit(e)

if os.environ['PHOTOVIEW_FFMPEG_USER'] != "" and os.environ['PHOTOVIEW_FFMPEG_PASSWORD'] != "":
  users = {
    os.environ['PHOTOVIEW_FFMPEG_USER']: os.environ['PHOTOVIEW_FFMPEG_PASSWORD']
  }
else:
  gunicorn_logger.error(
      "Got empty value for at least 1 of: PHOTOVIEW_FFMPEG_USER, PHOTOVIEW_FFMPEG_PASSWORD.\n%s",
      "", exc_info=True)
  raise SystemExit()


@auth.verify_password
def verify_password(username, password):
  if username in users and users.get(username) == password:
    gunicorn_logger.info("Authorized with correct credentials")
    return username
  else:
    gunicorn_logger.error("Unauthorized request with invalid credentials declined")
    return None


@app.route('/health', methods=['GET'])
def health():
  result = subprocess.run(['/ffmpegwrapper.sh', '-version'],
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
  start_time = time.time()
  command = request.json['command'].replace('\r\n', '').replace('\n', '')
  gunicorn_logger.debug("Got POST request with the command: " + command)

  # Input validation
  if re.search(r'[;&|`$<>]', command):
    gunicorn_logger.error(
        "Abort execution before starting: Invalid characters in command")
    return {'stderr': 'Invalid characters in command. Forbidden [;&|`$<>]'}, 400

  # Execute the command using ffmpeg
  result = subprocess.run(['/ffmpegwrapper.sh'] + command.split(),
                          capture_output=True, text=True)

  spent_time_str = str(timedelta(seconds=(time.time() - start_time))).split('.')
  spent_time = spent_time_str[0] + '.' + spent_time_str[1][:3]
  gunicorn_logger.info(f"Finished media processing by the FFmpeg tool. Time spent: {spent_time}")

  # Log the result to stdout and stderr
  if result.stdout != "":
    gunicorn_logger.info(result.stdout)
  else:
    gunicorn_logger.debug("STDOUT of the command execution is empty")
  if result.stderr != "":
    if result.returncode == 0:
      gunicorn_logger.info(result.stderr)
    else:
      gunicorn_logger.error(result.stderr)
  else:
    gunicorn_logger.debug("STDERR of the command execution is empty")

  # Check the return code of the command
  if result.returncode != 0:
    # The command failed, send a 500 status code
    return {'stdout': result.stdout, 'stderr': result.stderr}, 500

  # Return the result
  return {'stdout': result.stdout, 'stderr': result.stderr}, 200


if __name__ == '__main__':
  app.run(host='0.0.0.0', port=app_port)
