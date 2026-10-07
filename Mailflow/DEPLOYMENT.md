# MailFlow — Complete AWS Deployment Guide

This guide walks you through deploying MailFlow on AWS Free Tier from scratch.
Total time: ~60 minutes. No prior AWS knowledge needed.

---

## PART 1 — Set Up Gmail API (Google Cloud)
**Time: ~15 minutes**

### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Click "Select a project" at the top → "New Project"
3. Name it "MailFlow" → Click "Create"
4. Make sure "MailFlow" is selected as active project

### Step 2: Enable Gmail API
1. In left menu → "APIs & Services" → "Library"
2. Search "Gmail API" → Click it → Click "Enable"

### Step 3: Configure OAuth Consent Screen
1. Left menu → "APIs & Services" → "OAuth consent screen"
2. Select "External" → Click "Create"
3. Fill in:
   - App name: MailFlow
   - User support email: your email
   - Developer contact: your email
4. Click "Save and Continue" through all steps
5. On "Test users" step → Add your Gmail address (tara.techfest@gmail.com)
6. Click "Save and Continue" → "Back to Dashboard"

### Step 4: Create OAuth Credentials
1. Left menu → "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "MailFlow"
5. Under "Authorized redirect URIs" → Add:
   `http://YOUR-EC2-IP:4000/api/auth/gmail/callback`
   (You'll update this with real URL after EC2 setup)
6. Click "Create"
7. SAVE the Client ID and Client Secret — you'll need these

---

## PART 2 — Set Up AWS EC2 (Your Server)
**Time: ~20 minutes**

### Step 1: Launch EC2 Instance
1. Go to https://console.aws.amazon.com
2. Search "EC2" → Click it
3. Make sure region is "us-east-1" (top right) — free tier works in any region but pick one close to you: "ap-south-1" for India
4. Click "Launch Instance"
5. Fill in:
   - Name: mailflow-server
   - OS: Ubuntu Server 22.04 LTS (free tier eligible)
   - Instance type: t2.micro (free tier eligible)
   - Key pair: Click "Create new key pair"
     - Name: mailflow-key
     - Type: RSA
     - Format: .pem
     - Click "Create key pair" — it will download mailflow-key.pem to your computer SAVE THIS FILE
   - Network settings: Check these boxes:
     ✅ Allow SSH traffic from: Anywhere
     ✅ Allow HTTP traffic from the internet
     ✅ Allow HTTPS traffic from the internet
6. Storage: 20 GB (increase from default 8)
7. Click "Launch Instance"
8. Wait ~2 minutes for it to start

### Step 2: Open Ports for Your App
1. Go to EC2 → Instances → Click your instance
2. Scroll down → "Security" tab → Click the Security Group link
3. Click "Edit inbound rules"
4. Click "Add rule" and add:
   - Type: Custom TCP | Port: 4000 | Source: 0.0.0.0/0  (backend)
   - Type: Custom TCP | Port: 3000 | Source: 0.0.0.0/0  (frontend)
5. Click "Save rules"

### Step 3: Get Your Server's IP
1. Go to EC2 → Instances
2. Copy the "Public IPv4 address" — looks like 54.123.45.67
3. This is YOUR-EC2-IP — you'll use it everywhere below

### Step 4: Connect to Your Server
On your laptop, open Terminal (Mac/Linux) or Command Prompt (Windows):

```bash
# Move to folder where mailflow-key.pem was downloaded
cd ~/Downloads

# Fix permissions on the key file (Mac/Linux only)
chmod 400 mailflow-key.pem

# Connect to your server
ssh -i mailflow-key.pem ubuntu@YOUR-EC2-IP
```

You should see a Ubuntu welcome message. You're now inside your server.

---

## PART 3 — Install Software on Server
**Time: ~10 minutes**
Run these commands one by one in your SSH terminal:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (keeps your app running 24/7)
sudo npm install -g pm2

# Install nginx (web server to serve frontend)
sudo apt install -y nginx

# Verify installs
node --version   # should say v20.x.x
psql --version   # should say psql 14.x
```

---

## PART 4 — Set Up Database
```bash
# Switch to postgres user
sudo -u postgres psql

# Inside postgres shell, run these:
CREATE DATABASE mailflow;
CREATE USER mailflow_user WITH ENCRYPTED PASSWORD 'choose_a_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE mailflow TO mailflow_user;
\q
```

Note your database password — you'll need it in the next step.

---

## PART 5 — Deploy the App

### Step 1: Upload Code to Server
On your LOCAL laptop (new terminal window, not the SSH one):
```bash
# Go to where you have the mailflow folder
cd /path/to/mailflow

# Upload backend
scp -i ~/Downloads/mailflow-key.pem -r backend ubuntu@YOUR-EC2-IP:/home/ubuntu/mailflow-backend

# Upload frontend
scp -i ~/Downloads/mailflow-key.pem -r frontend ubuntu@YOUR-EC2-IP:/home/ubuntu/mailflow-frontend
```

### Step 2: Set Up Backend (back in SSH terminal)
```bash
cd /home/ubuntu/mailflow-backend

# Install dependencies
npm install

# Create environment file
nano .env
```

In the nano editor, paste this (fill in your values):
```
DATABASE_URL=postgresql://mailflow_user:YOUR_DB_PASSWORD@localhost:5432/mailflow
JWT_SECRET=make_up_a_long_random_string_like_this_xK9mN2pQ7rT4vW8
GMAIL_CLIENT_ID=your_client_id_from_google_cloud.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret_from_google_cloud
GMAIL_REDIRECT_URI=http://YOUR-EC2-IP:4000/api/auth/gmail/callback
BACKEND_URL=http://YOUR-EC2-IP:4000
FRONTEND_URL=http://YOUR-EC2-IP:3000
NODE_ENV=production
PORT=4000
```

Press Ctrl+X → Y → Enter to save.

```bash
# Start backend with PM2
pm2 start src/index.js --name mailflow-backend

# Save PM2 config so it restarts on reboot
pm2 save
pm2 startup
# Run the command it gives you (starts with "sudo env...")
```

### Step 3: Set Up Frontend
```bash
cd /home/ubuntu/mailflow-frontend

# Create environment file
echo "REACT_APP_API_URL=http://YOUR-EC2-IP:4000/api" > .env

# Install and build
npm install
npm run build
```

### Step 4: Configure Nginx to Serve Frontend
```bash
sudo nano /etc/nginx/sites-available/mailflow
```

Paste this:
```nginx
server {
    listen 3000;
    root /home/ubuntu/mailflow-frontend/build;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mailflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## PART 6 — Update Google OAuth Redirect URL
1. Go back to Google Cloud Console → Credentials
2. Click your OAuth client
3. Under "Authorized redirect URIs" — update to:
   `http://YOUR-EC2-IP:4000/api/auth/gmail/callback`
4. Save

---

## PART 7 — Open the App
1. Open your browser
2. Go to: `http://YOUR-EC2-IP:3000`
3. You'll see the MailFlow setup screen
4. Create your account
5. Go to Settings → Connect Gmail
6. Done! 🎉

---

## Useful Commands (for later)

```bash
# Check backend logs
pm2 logs mailflow-backend

# Restart backend
pm2 restart mailflow-backend

# Check backend status
pm2 status

# If you update code and want to redeploy:
# 1. Upload new code via scp
# 2. cd /home/ubuntu/mailflow-backend && pm2 restart mailflow-backend
# 3. cd /home/ubuntu/mailflow-frontend && npm run build
```

---

## Troubleshooting

**Can't connect to app?**
- Check EC2 security group has ports 3000 and 4000 open
- Check `pm2 status` — backend should show "online"
- Check `sudo systemctl status nginx`

**Gmail OAuth error?**
- Make sure redirect URI in Google Cloud exactly matches what's in your .env
- Make sure your Gmail is added as test user in OAuth consent screen

**Emails not sending?**
- Check `pm2 logs mailflow-backend` for errors
- Verify Gmail is connected in Settings page
- Check the sequence status is "active"
