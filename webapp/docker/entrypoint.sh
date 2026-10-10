#!/bin/sh
node /app/server/api.mjs &
# exec so nginx becomes PID 1 and honours SIGTERM; without it the shell ignores
# the signal and every `docker stop` waits out the full 10s SIGKILL grace period.
exec nginx -g 'daemon off;'
