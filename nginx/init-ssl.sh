#!/bin/bash
# SSL Certificate Setup with Let's Encrypt (Certbot)
# Run this ONCE on the EC2 server after pointing your domain to the server IP
#
# Prerequisites:
#   1. A domain pointing to your EC2 IP (e.g. api.counpaign.com → 16.16.255.118)
#   2. Port 80 and 443 open in EC2 security group
#
# Usage:
#   chmod +x nginx/init-ssl.sh
#   ./nginx/init-ssl.sh api.counpaign.com your@email.com

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 api.counpaign.com admin@counpaign.com"
    exit 1
fi

echo "🔐 Setting up SSL for $DOMAIN..."

# Stop nginx to free port 80
docker compose stop nginx

# Run certbot standalone to get certificate
docker run --rm \
    -v $(pwd)/nginx/ssl:/etc/letsencrypt \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --agree-tos \
    --no-eff-email \
    --email $EMAIL \
    -d $DOMAIN

# Copy certs to expected locations
if [ -d "nginx/ssl/live/$DOMAIN" ]; then
    cp nginx/ssl/live/$DOMAIN/fullchain.pem nginx/ssl/fullchain.pem
    cp nginx/ssl/live/$DOMAIN/privkey.pem nginx/ssl/privkey.pem
    echo "✅ SSL certificates installed!"
    echo ""
    echo "Next steps:"
    echo "1. Uncomment the HTTPS server block in nginx/nginx.conf"
    echo "2. Replace 'api.yourdomain.com' with '$DOMAIN'"
    echo "3. Run: docker compose up -d"
else
    echo "❌ Certificate generation failed. Check the output above."
    exit 1
fi

# Restart everything
docker compose up -d

echo ""
echo "🎉 SSL setup complete! Your API is now available at:"
echo "   https://$DOMAIN"

# Set up auto-renewal cron (every 2 months)
echo ""
echo "📅 To set up auto-renewal, add this cron job:"
echo "   crontab -e"
echo "   0 0 1 */2 * cd $(pwd) && docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt certbot/certbot renew && docker compose restart nginx"
