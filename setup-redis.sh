#!/bin/bash

# Redis Setup and Start Script
# This script helps you set up and start Redis for the chat application

echo "🚀 Chat App Redis Setup"
echo "========================="
echo ""

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis is not installed."
    echo ""
    echo "Install Redis:"
    echo ""
    echo "📦 Ubuntu/Debian:"
    echo "   sudo apt-get update"
    echo "   sudo apt-get install redis-server"
    echo ""
    echo "📦 macOS (Homebrew):"
    echo "   brew install redis"
    echo ""
    echo "🐳 Docker:"
    echo "   docker run -d -p 6379:6379 redis:latest"
    echo ""
    exit 1
fi

echo "✅ Redis found!"
echo ""

# Check if Redis is running
if redis-cli ping &> /dev/null; then
    echo "✅ Redis is already running!"
    echo ""
    echo "Server status:"
    redis-cli info server | grep redis_version
else
    echo "⏳ Starting Redis server..."
    
    # Try to start Redis
    if command -v systemctl &> /dev/null; then
        # Linux with systemd
        echo "   Using systemctl..."
        sudo systemctl start redis-server
        sleep 2
    elif command -v brew &> /dev/null; then
        # macOS with Homebrew
        echo "   Using Homebrew..."
        brew services start redis
        sleep 2
    else
        # Manual start
        echo "   Starting manually..."
        redis-server --daemonize yes
        sleep 2
    fi
    
    # Verify it's running
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis started successfully!"
    else
        echo "❌ Failed to start Redis. Please start it manually."
        exit 1
    fi
fi

echo ""
echo "📊 Redis Status:"
echo "=================="
redis-cli info server | head -6
echo ""

echo "🔍 Testing Redis Connection:"
redis-cli ping

echo ""
echo "✨ Redis is ready!"
echo ""
echo "Next steps:"
echo "1. Make sure .env has Redis configuration:"
echo "   REDIS_HOST=localhost"
echo "   REDIS_PORT=6379"
echo ""
echo "2. Install dependencies:"
echo "   cd backend"
echo "   npm install"
echo ""
echo "3. Start the server:"
echo "   npm run dev"
echo ""
echo "4. (Optional) Monitor Redis in another terminal:"
echo "   redis-cli"
echo "   > monitor"
echo ""
