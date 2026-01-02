#!/bin/bash

# Quick start script for Liquid Nation with Docker

set -e

echo "🚀 Starting Liquid Nation with Docker..."
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Determine compose command (try v2 first, then v1)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ docker-compose is not available"
    exit 1
fi

echo "📦 Starting PostgreSQL container..."
$COMPOSE_CMD up -d postgres

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Wait for PostgreSQL to be healthy
for i in {1..30}; do
    if docker exec liquid-nation-postgres pg_isready -U liquidnation &> /dev/null; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start. Check logs:"
        echo "   $COMPOSE_CMD logs postgres"
        exit 1
    fi
    sleep 1
done

echo ""
echo "📊 Container status:"
$COMPOSE_CMD ps

echo ""
echo "✨ PostgreSQL is running!"
echo ""
echo "📝 Next steps:"
echo "   1. Start the backend: cd backend && cargo run -p liquid-nation-backend"
echo "   2. Or use full Docker stack: $COMPOSE_CMD -f docker-compose.full.yml up -d"
echo ""
echo "🔗 Database connection:"
echo "   postgres://liquidnation:liquidnation123@localhost:5432/liquid_nation"
echo ""

