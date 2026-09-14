#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LogiSync v2.0 — Production EC2 Instance Automated Setup Script
# Target OS: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS (ap-south-1 Mumbai)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "========================================================"
echo " Starting LogiSync v2.0 EC2 Setup & Security Hardening  "
echo "========================================================"

# 1. Update system & security packages
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y \
    curl \
    git \
    build-essential \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban \
    unattended-upgrades

# 2. Configure unattended security upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 3. Create dedicated non-root application service user
if ! id -u logisync >/dev/null 2>&1; then
    sudo useradd -r -s /bin/false -d /opt/logisync -m logisync
    echo "Created service user 'logisync'"
fi

# 4. Install Node.js 20 LTS for building frontend
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 5. Install AWS CLI v2 and CloudWatch Agent
if ! command -v aws &> /dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
fi

wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
rm -f amazon-cloudwatch-agent.deb

# 6. Configure UFW Firewall (OWASP Infrastructure Hardening)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP Certbot'
sudo ufw allow 443/tcp comment 'HTTPS'
echo "y" | sudo ufw enable

# 7. Setup directory structure
sudo mkdir -p /opt/logisync
sudo mkdir -p /var/log/logisync
sudo chown -R logisync:logisync /opt/logisync
sudo chown -R logisync:logisync /var/log/logisync

echo "========================================================"
echo " EC2 Base Setup Complete! Next steps:                   "
echo " 1. Clone repository to /opt/logisync                   "
echo " 2. Copy .env to /opt/logisync/.env                     "
echo " 3. Install backend venv and frontend build             "
echo " 4. Install systemd service and Nginx config            "
echo "========================================================"
