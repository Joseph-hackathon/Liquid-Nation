#!/bin/bash

# Docker Setup Checker for Liquid Nation

echo "🔍 Checking Docker setup for Liquid Nation..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo ""
    echo "📦 Installation options:"
    echo ""
    echo "1. Docker Desktop (Recommended):"
    echo "   - Download from: https://www.docker.com/products/docker-desktop"
    echo "   - Or via Homebrew: brew install --cask docker"
    echo ""
    echo "2. After installation, start Docker Desktop and run this script again"
    exit 1
fi

echo "✅ Docker is installed: $(docker --version)"
echo ""

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "❌ Docker is not running"
    echo ""
    echo "🚀 Please start Docker Desktop and try again"
    echo "   - macOS: open -a Docker"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check docker-compose (try v2 first, then v1)
if docker compose version &> /dev/null; then
    echo "✅ docker compose is available: $(docker compose version)"
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    echo "✅ docker-compose is installed: $(docker-compose --version)"
    COMPOSE_CMD="docker-compose"
else
    echo "❌ docker-compose is not available"
    exit 1
fi

echo ""

# Check if PostgreSQL container is running
if docker ps | grep -q liquid-nation-postgres; then
    echo "✅ PostgreSQL container is running"
    echo ""
    echo "📊 Container status:"
    docker ps | grep liquid-nation-postgres
    echo ""
    
    # Check if PostgreSQL is healthy
    if docker exec liquid-nation-postgres pg_isready -U liquidnation &> /dev/null; then
        echo "✅ PostgreSQL is healthy and accepting connections"
    else
        echo "⚠️  PostgreSQL container is running but not ready yet"
    fi
else
    echo "ℹ️  PostgreSQL container is not running"
    echo ""
    echo "🚀 To start PostgreSQL:"
    echo "   $COMPOSE_CMD up -d postgres"
    echo ""
    echo "   Or for full stack:"
    echo "   $COMPOSE_CMD -f docker-compose.full.yml up -d"
fi

echo ""
echo "📝 Database connection info:"
echo "   URL: postgres://liquidnation:liquidnation123@localhost:5432/liquid_nation"
echo "   User: liquidnation"
echo "   Password: liquidnation123"
echo "   Database: liquid_nation"
echo ""

# Check if backend .env is configured for Docker
if [ -f "backend/.env" ]; then
    if grep -q "postgres://liquidnation:liquidnation123@localhost:5432/liquid_nation" backend/.env; then
        echo "✅ Backend .env is configured for Docker PostgreSQL"
    else
        echo "⚠️  Backend .env might not be configured for Docker"
        echo "   Consider copying backend/.env.docker to backend/.env"
    fi
else
    echo "⚠️  Backend .env file not found"
    echo "   Copy backend/.env.docker to backend/.env"
fi

echo ""
echo "✨ Setup check complete!"

