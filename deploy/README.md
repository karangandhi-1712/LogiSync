# LogiSync v2.0 — AWS Production Deployment Guide

This guide provides step-by-step deployment instructions for **LogiSync v2.0** on Amazon Web Services (AWS) targeting the **ap-south-1 (Mumbai)** region.

---

## 1. Prerequisites Checklist

- [ ] AWS Account with Administrator or DevOps IAM privileges
- [ ] Google Cloud Console project with billing enabled
- [ ] Domain name (e.g. `logisync.vocport.gov.in`) pointing to your EC2 Elastic IP
- [ ] SSH Ed25519 key pair for secure instance access

---

## 2. Google Cloud Setup (Google Maps API)

1. Navigate to [Google Cloud Console](https://console.cloud.google.com).
2. Create project `logisync-vocport`.
3. Enable the following 6 APIs:
   - **Maps JavaScript API**
   - **Directions API**
   - **Places API (New)**
   - **Geocoding API**
   - **Distance Matrix API**
   - **Roads API**
4. Generate **two API Keys**:
   - **Key 1 (Frontend)**: Restrict to *Maps JavaScript API* and HTTP referrers `https://yourdomain.com/*`, `http://localhost:5173/*`.
   - **Key 2 (Backend Proxy)**: Restrict to *Directions, Geocoding, Places, Distance Matrix* and IP address of your EC2 instance.

---

## 3. AWS Resource Provisioning

### A. Amazon EC2
- **Instance Type**: `t3.large` or `c6i.large` (2 vCPU, 4–8 GB RAM recommended)
- **AMI**: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type (64-bit x86)
- **Storage**: 50 GB gp3 SSD
- **Security Group (`sg-logisync-prod`)**:
  - `443/tcp` (HTTPS): Inbound from `0.0.0.0/0`
  - `80/tcp` (HTTP for Let's Encrypt renewal): Inbound from `0.0.0.0/0`
  - `22/tcp` (SSH): Inbound **only** from your office/home IP CIDR (`x.x.x.x/32`)

### B. Amazon Cognito User Pool
1. Create User Pool named `LogiSync-Users`.
2. Configure Sign-in Experience: **Email**.
3. Password Policy: Min 12 characters, uppercase, lowercase, numbers, symbols.
4. User Attributes: Add custom attribute `custom:role` (string).
5. Create App Client:
   - Client name: `LogiSync-Web-Client`
   - Uncheck "Generate client secret" (required for browser JS SDK).
   - Auth flows: `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`.
6. Copy `User Pool ID` and `App Client ID` into `.env`.

### C. Amazon SNS Topics
1. Create Standard Topic: `logisync-alerts`.
2. Create Standard Topic: `logisync-reroute`.
3. Create Standard Topic: `logisync-congestion`.
4. Subscribe dispatchers' email and drivers' mobile numbers (SMS).

### D. Amazon S3 Buckets
1. Create Bucket: `logisync-audit-logs-<account-id>` (Enable Default Encryption SSE-S3, Block Public Access).
2. Enable Bucket Versioning for regulatory audit compliance.

---

## 4. EC2 Instance Automated Setup

1. SSH into the EC2 instance:
   ```bash
   ssh -i ~/.ssh/your-key.pem ubuntu@<EC2_ELASTIC_IP>
   ```

2. Clone repository into `/opt/logisync`:
   ```bash
   sudo git clone https://github.com/your-org/logisync.git /opt/logisync
   cd /opt/logisync
   ```

3. Run automated base setup:
   ```bash
   sudo chmod +x deploy/ec2-setup.sh
   sudo ./deploy/ec2-setup.sh
   ```

4. Configure environment variables:
   ```bash
   sudo cp .env.example /opt/logisync/.env
   sudo nano /opt/logisync/.env
   ```
   *Fill in Google Maps keys, Cognito IDs, and AWS credentials.*

---

## 5. Build and Run Applications

### Backend Virtual Environment
```bash
cd /opt/logisync/backend
python3.11 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
```

### Frontend Production Build
```bash
cd /opt/logisync/frontend
npm install --legacy-peer-deps
npm run build
```

### Enable systemd Service
```bash
sudo cp /opt/logisync/deploy/logisync.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now logisync
sudo systemctl status logisync
```

### Configure Nginx and TLS (Let's Encrypt)
```bash
sudo cp /opt/logisync/deploy/nginx.conf /etc/nginx/sites-available/logisync
sudo ln -sf /etc/nginx/sites-available/logisync /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

# Obtain SSL Certificate
sudo certbot --nginx -d yourdomain.com
sudo systemctl restart nginx
```

---

## 6. CloudWatch Logs and Alarms

1. Start CloudWatch Agent:
   ```bash
   sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
       -a fetch-config -m ec2 -s -c file:/opt/logisync/deploy/cloudwatch-agent-config.json
   ```

2. Configure CloudWatch Alarms in AWS Console:
   - **Gate Congestion Spike**: `LogiSync/PortLogistics GateCongestionScore > 85` for 2 consecutive periods → Trigger `logisync-congestion` SNS.
   - **API Error Rate**: HTTP 5xx responses `> 5%` over 5 minutes → Trigger `logisync-alerts` SNS.
   - **EC2 High Memory**: `mem_used_percent > 85%` for 10 minutes → Notify DevOps.
