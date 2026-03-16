# Node.js Upgrade Guide

Your Discord bot requires Node.js 18+ to work with the latest discord.js library.

## Why Upgrade?

- **discord.js v14+** requires Node.js 18+
- Better performance and security
- Access to latest JavaScript features
- Better compatibility with modern packages

## How to Upgrade

### Option 1: Download from Node.js Website (Recommended)

1. **Download Node.js 18+**
   - Go to [nodejs.org](https://nodejs.org/)
   - Download the LTS version (currently 18.x or 20.x)
   - Run the installer

2. **Verify Installation**
   ```bash
   node --version  # Should show v18.x or v20.x
   npm --version   # Should show v8.x or higher
   ```

3. **Reinstall Dependencies**
   ```bash
   npm install
   ```

4. **Test the Bot**
   ```bash
   node simple-test.js  # Should work now
   npm start           # Should start without errors
   ```

### Option 2: Use Node Version Manager (NVM)

**For Windows:**
1. Download [NVM for Windows](https://github.com/coreybutler/nvm-windows/releases)
2. Install and restart command prompt
3. Run:
   ```bash
   nvm install 18
   nvm use 18
   ```

**For macOS/Linux:**
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then:
nvm install 18
nvm use 18
```

## After Upgrading

1. **Verify Node.js Version**
   ```bash
   node --version  # Should be v18.x or higher
   ```

2. **Reinstall Dependencies**
   ```bash
   npm install
   ```

3. **Test Configuration**
   ```bash
   node simple-test.js
   ```

4. **Start the Bot**
   ```bash
   npm start
   ```

## Troubleshooting

### "node:internal/modules/cjs/loader:936" errors
- This means you're still using Node.js 16
- Verify with `node --version`
- Reinstall Node.js 18+ if needed

### "SyntaxError: Unexpected token '{'" errors
- These are class field syntax errors from older Node.js
- Upgrade to Node.js 18+ to fix

### Dependencies still not working
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again

## Quick Test

After upgrading, run this test:

```bash
# Check Node.js version
node --version

# Test basic functionality
node -e "console.log('Node.js is working!')"

# Test bot configuration
node simple-test.js

# Start the bot
npm start
```

## Next Steps

Once Node.js is upgraded:
1. Edit `.env` with your Discord bot token and Gemini API key
2. Run `npm start`
3. Invite bot to Discord server
4. Test with `@YourBot Hello`

The bot should now work without syntax errors!