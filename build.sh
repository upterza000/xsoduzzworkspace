#!/bin/bash
# Render build script for Puppeteer dependencies

echo "📦 Installing Puppeteer dependencies..."

# Update package lists
apt-get update || true

# Install Chromium and dependencies
apt-get install -y \
  chromium-browser \
  chromium-codecs-ffmpeg \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libatspi2.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2 \
  xdg-utils \
  || echo "⚠️ Warning: Some dependencies might not be available"

echo "✅ Dependencies installation completed!"

# Install npm packages
npm ci

echo "🎉 Build completed successfully!"
