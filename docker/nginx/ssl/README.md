# SSL Certificates — v0.3.2

## Local Development (Self-Signed)

```bash
# Generate self-signed cert (1 year validity)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/CN=localhost"

# Place in this directory
mv key.pem cert.pem docker/nginx/ssl/
```

## Production (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot

# Get certificate (standalone mode)
sudo certbot certonly --standalone -d yourdomain.com

# Copy to nginx ssl dir
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   docker/nginx/ssl/key.pem

# Auto-renewal cron
echo "0 3 * * * certbot renew --quiet && docker-compose restart nginx" | sudo crontab -
```

## Kubernetes (cert-manager)

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: partygame-tls
spec:
  secretName: partygame-tls
  dnsNames: [partygame.example.com]
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
```
