#!/bin/sh
node /app/server/api.mjs &
nginx -g 'daemon off;'
