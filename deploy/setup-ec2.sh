#!/usr/bin/env bash
# Instala o actualiza Medida en una EC2 con Ubuntu 24.04.
# Uso (en la EC2):
#   sudo git clone https://github.com/TU_USUARIO/medida.git /opt/medida
#   sudo bash /opt/medida/deploy/setup-ec2.sh
# Volver a ejecutarlo actualiza el código (git pull) y reinicia la app.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_USER=medida
PORT=3000

if [ "$(id -u)" -ne 0 ]; then echo "Ejecútalo con sudo."; exit 1; fi
echo "==> Proyecto en $APP_DIR"

# 1. Paquetes del sistema (solo la primera vez)
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "==> Instalando Node.js 24"
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
command -v nginx >/dev/null || { echo "==> Instalando Nginx"; apt-get update -y && apt-get install -y nginx; }

# 2. Usuario de sistema sin login para correr la app
id "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"

# 3. Código actualizado y dependencias de producción
if [ -d "$APP_DIR/.git" ]; then
  echo "==> Actualizando código"
  git config --global --add safe.directory "$APP_DIR"
  git -C "$APP_DIR" pull --ff-only
fi
cd "$APP_DIR"
npm ci --omit=dev --no-audit --no-fund

# 4. Certificado de RDS para verificar la conexión SSL
[ -f global-bundle.pem ] || curl -fsSL -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# 5. Variables de entorno
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s#^PGSSL_CA=.*#PGSSL_CA=$APP_DIR/global-bundle.pem#" .env
  chown "$APP_USER:$APP_USER" .env && chmod 600 .env
  echo
  echo "*** Falta configurar $APP_DIR/.env (DATABASE_URL y GEMINI_API_KEY)."
  echo "*** Edítalo con:  sudo nano $APP_DIR/.env"
  echo "*** y vuelve a ejecutar:  sudo bash $APP_DIR/deploy/setup-ec2.sh"
  exit 0
fi
chmod 600 .env

# 6. Servicio systemd (arranca solo y se reinicia si falla)
cat > /etc/systemd/system/medida.service <<UNIT
[Unit]
Description=Medida (Node + Express)
After=network-online.target
Wants=network-online.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
Environment=NODE_ENV=production PORT=$PORT
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT

# 7. Nginx como proxy en el puerto 80
cat > /etc/nginx/sites-available/medida <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 20k;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/medida /etc/nginx/sites-enabled/medida
rm -f /etc/nginx/sites-enabled/default
nginx -t

# 8. Migración del catálogo (idempotente) y arranque
echo "==> Migrando base de datos"
sudo -u "$APP_USER" node --env-file=.env scripts/migrate.js

systemctl daemon-reload
systemctl enable --now medida >/dev/null
systemctl restart medida
systemctl reload nginx

sleep 2
echo "==> Estado:"
curl -s "http://127.0.0.1:$PORT/api/health" || true
echo
IP=$(curl -s --max-time 2 -H "X-aws-ec2-metadata-token: $(curl -s --max-time 2 -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')" http://169.254.169.254/latest/meta-data/public-ipv4 || true)
echo "==> Listo: http://${IP:-IP-PUBLICA-DE-TU-EC2}"
echo "    Logs: sudo journalctl -u medida -f"
