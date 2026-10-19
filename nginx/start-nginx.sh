#!/bin/sh
set -eu

certificate=/etc/letsencrypt/live/app.otred.ru/fullchain.pem
private_key=/etc/letsencrypt/live/app.otred.ru/privkey.pem
tls_mode=${NGINX_TLS_MODE:-auto}

case "$tls_mode" in
  auto|off|required) ;;
  *)
    echo "nginx: invalid NGINX_TLS_MODE '$tls_mode' (expected auto, off or required)" >&2
    exit 1
    ;;
esac

if [ "$tls_mode" != "off" ] && [ -r "$certificate" ] && [ -r "$private_key" ]; then
  echo "nginx: TLS certificate found; enabling HTTPS"
  exec nginx -c /opt/nginx/nginx.https.conf -g "daemon off;"
fi

if [ "$tls_mode" = "required" ]; then
  echo "nginx: TLS is required, but $certificate or $private_key is unavailable" >&2
  exit 1
fi

echo "nginx: TLS certificate not found; starting HTTP-only mode" >&2
exec nginx -c /opt/nginx/nginx.http.conf -g "daemon off;"
