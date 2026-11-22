# Desplegar Medida en EC2 (AWS Learner Lab)

Resultado: la app en `http://IP-PUBLICA` con Nginx → Node (servicio systemd) → RDS.

## 1. Lanzar la instancia

EC2 → **Lanzar instancia**:

| Campo | Valor |
|---|---|
| Nombre | `medida-web` |
| AMI | **Ubuntu Server 24.04 LTS** |
| Tipo | **t3.micro** |
| Par de claves | `vockey` |
| Red | VPC por defecto (la misma de RDS) · Asignar IP pública: **Habilitar** |
| Grupo de seguridad | Crear `medida-web-sg` con: **HTTP 80** desde `0.0.0.0/0` y **SSH 22** desde `0.0.0.0/0`* |
| Almacenamiento | 8–10 GB gp3 |

\* Para usar *EC2 Instance Connect* desde el navegador, el puerto 22 debe aceptar las IP de AWS. Si prefieres, déjalo en **Mi IP** y conéctate con `ssh -i labsuser.pem ubuntu@IP` (la clave se descarga en el Lab → *AWS Details*).

## 2. Permitir que la EC2 hable con RDS

EC2 → Grupos de seguridad → **medida-db-sg** → Editar reglas de entrada → **Agregar regla**:
tipo **PostgreSQL**, origen: el grupo **medida-web-sg**. Guardar.

## 3. Instalar

Conéctate (EC2 → tu instancia → **Conectar** → *EC2 Instance Connect*) y ejecuta:

```bash
sudo git clone https://github.com/TU_USUARIO/medida.git /opt/medida
sudo bash /opt/medida/deploy/setup-ec2.sh
```

Si el repo es **privado**, git te pedirá usuario y contraseña: usa tu usuario de GitHub y un *token* (GitHub → Settings → Developer settings → Fine-grained tokens, con permiso de solo lectura al repo).

La primera vez el script crea `/opt/medida/.env` y se detiene. Complétalo:

```bash
sudo nano /opt/medida/.env
```

Pega los mismos valores de tu `.env` local (`DATABASE_URL`, `GEMINI_API_KEY`). `PGSSL_CA` ya viene apuntando al certificado de RDS. Guarda (Ctrl+O, Enter, Ctrl+X) y vuelve a ejecutar:

```bash
sudo bash /opt/medida/deploy/setup-ec2.sh
```

Al final verás `{"ok":true,"db":"ok",...}` y la URL `http://IP`.

## 4. Actualizar después de un `git push`

```bash
sudo bash /opt/medida/deploy/setup-ec2.sh
```

Hace `git pull`, instala dependencias, migra y reinicia.

## Comandos útiles

```bash
sudo systemctl status medida      # estado
sudo journalctl -u medida -f      # logs en vivo (ahí sale "[gemini] fallback..." si falla)
sudo systemctl restart medida     # reiniciar
```

## Ten en cuenta (Learner Lab)

- Al terminar la sesión del Lab la instancia se detiene. Al volver, inicia la instancia: **la IP pública cambia**, revisa la nueva en la consola. La app arranca sola.
- Es HTTP, sin certificado. Para HTTPS se necesitaría un dominio (y, por ejemplo, Let's Encrypt con certbot).
- Cuando termines el curso, borra la instancia y la base de datos para no gastar el crédito del Lab.
