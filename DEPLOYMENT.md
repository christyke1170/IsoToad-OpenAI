# Deployment Guide

Learn how to deploy your Discord AI bot for 24/7 operation.

## Deployment Options

### Option 1: VPS/Cloud Server (Recommended)

**Best for:** Reliable 24/7 uptime, full control, cost-effective

**Recommended Providers:**
- **DigitalOcean** - $4-6/month (Droplet)
- **Linode** - $5/month (Nanode)
- **Vultr** - $3.50/month (High Frequency)
- **AWS Lightsail** - $3.50/month

#### Setup Steps

1. **Create Server**
   ```bash
   # Ubuntu 22.04 LTS recommended
   # 1GB RAM minimum, 2GB recommended
   ```

2. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

3. **Upload Your Bot**
   ```bash
   # Upload files (using SCP, SFTP, or Git)
   scp -r discord-ai-bot user@your-server-ip:/home/user/
   
   # Or clone from GitHub
   git clone https://github.com/yourusername/discord-ai-bot.git
   ```

4. **Install and Configure**
   ```bash
   cd discord-ai-bot
   npm install
   
   # Copy and edit .env file
   cp .env.example .env
   # Edit .env with your credentials
   ```

5. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   
   # Start your bot
   pm2 start src/index.js --name discord-ai-bot
   
   # Save PM2 configuration
   pm2 save
   
   # Setup startup script
   pm2 startup
   # Follow the instructions to run the startup command
   ```

6. **Verify Everything Works**
   ```bash
   # Check bot status
   pm2 status
   
   # View logs
   pm2 logs discord-ai-bot
   
   # Check if bot is online in Discord
   ```

#### PM2 Commands

```bash
# Start/Stop/Restart
pm2 start discord-ai-bot
pm2 stop discord-ai-bot
pm2 restart discord-ai-bot

# View status and logs
pm2 status
pm2 logs discord-ai-bot
pm2 monit

# Save/Restore configuration
pm2 save
pm2 resurrect

# Delete from PM2
pm2 delete discord-ai-bot
```

### Option 2: Raspberry Pi (Budget Option)

**Best for:** Learning, low-cost, always-on at home

#### Setup Steps

1. **Install Raspberry Pi OS**
   - Download from [raspberrypi.com/software](https://www.raspberrypi.com/software/)
   - Flash to SD card using Raspberry Pi Imager

2. **Initial Setup**
   ```bash
   # Enable SSH (create empty ssh file in boot partition)
   touch /boot/ssh
   
   # Connect to WiFi (create wpa_supplicant.conf in boot)
   # Or use Ethernet for better reliability
   ```

3. **Install Dependencies**
   ```bash
   # SSH into Pi
   ssh pi@raspberrypi.local
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

4. **Setup Bot**
   ```bash
   # Copy files to Pi
   scp -r discord-ai-bot pi@raspberrypi.local:/home/pi/
   
   # Install and configure
   cd discord-ai-bot
   npm install
   
   # Setup PM2
   npm install -g pm2
   pm2 start src/index.js --name discord-ai-bot
   pm2 startup
   pm2 save
   ```

#### Power Considerations
- Use official Raspberry Pi power supply
- Consider UPS for power outages
- Monitor temperature (keep below 60°C)

### Option 3: Cloud Platforms

#### Railway (Easiest)

**Pros:** Zero configuration, automatic deployments
**Cons:** Limited free tier, credit card required

1. **Deploy to Railway**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway init
   railway add
   railway deploy
   ```

2. **Set Environment Variables**
   - In Railway dashboard, go to Settings → Variables
   - Add your `.env` variables

#### Render (Good Alternative)

**Pros:** Generous free tier, easy setup
**Cons:** Slower deployments

1. **Connect GitHub**
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository

2. **Create Web Service**
   - Select your repository
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add environment variables

#### Fly.io (Container-Based)

**Pros:** Good free tier, container deployment
**Cons:** More complex setup

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Setup**
   ```bash
   fly launch
   # Answer prompts (choose Docker, skip database)
   
   # Set environment variables
   fly secrets set DISCORD_BOT_TOKEN=your_token_here
   fly secrets set LLM_API_KEY=your_api_key_here
   ```

3. **Deploy**
   ```bash
   fly deploy
   ```

## Monitoring and Maintenance

### Health Checks

1. **Discord Status**
   - Check if bot appears online in Discord
   - Test basic commands

2. **Server Monitoring**
   ```bash
   # Check system resources
   htop
   df -h  # Disk usage
   free -h  # Memory usage
   
   # Check bot logs
   pm2 logs discord-ai-bot --lines 100
   ```

3. **Automated Monitoring**
   ```bash
   # Install monitoring tools
   sudo apt install htop
   
   # Create health check script
   # Add to crontab for regular checks
   ```

### Backup Strategy

1. **Configuration Backup**
   ```bash
   # Backup .env file (keep secure!)
   cp .env .env.backup
   
   # Backup PM2 configuration
   pm2 dump
   ```

2. **Code Backup**
   ```bash
   # Use Git for version control
   git add .
   git commit -m "Deployment backup"
   git push origin main
   ```

### Updates and Maintenance

1. **Regular Updates**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Update Node.js dependencies
   npm update
   ```

2. **Bot Updates**
   ```bash
   # Pull latest code
   git pull origin main
   
   # Install new dependencies
   npm install
   
   # Restart bot
   pm2 restart discord-ai-bot
   ```

## Cost Breakdown

### VPS Options (Monthly)
- **DigitalOcean**: $4-6
- **Linode**: $5
- **Vultr**: $3.50
- **AWS Lightsail**: $3.50

### Additional Costs
- **Gemini API**: $0.00035 per 1K tokens
- **Estimated usage**: 1000 messages/day ≈ $1-2/month

### Raspberry Pi (One-time)
- **Pi 4 (2GB)**: $55
- **Power supply**: $10
- **SD card**: $15
- **Case**: $10
- **Total**: ~$90 one-time

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` to Git
   - Use strong, unique API keys
   - Rotate keys regularly

2. **Server Security**
   ```bash
   # Create non-root user
   adduser deploy
   
   # Setup SSH keys (disable password auth)
   # Configure firewall
   ufw allow 22
   ufw enable
   ```

3. **Bot Security**
   - Limit bot permissions to minimum required
   - Monitor for unusual activity
   - Set up rate limiting

## Troubleshooting

### Bot Won't Start
```bash
# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs discord-ai-bot

# Test manually
node src/index.js
```

### Bot Disconnects Frequently
- Check internet connection stability
- Monitor server resources (RAM, CPU)
- Check Discord API status

### High API Costs
- Review daily token usage with `/stats`
- Adjust rate limiting in `.env`
- Monitor Gemini API usage dashboard

### Server Performance Issues
```bash
# Check resource usage
htop

# Check disk space
df -h

# Restart if needed
sudo reboot
```

## Next Steps

1. **Set up monitoring alerts**
2. **Configure log rotation**
3. **Add backup automation**
4. **Consider load balancing for high traffic**
5. **Set up CI/CD for automated deployments**