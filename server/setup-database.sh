#!/bin/bash

echo "🗄️ Setting up PostgreSQL for Fortress Modeler"
echo "=============================================="

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL is installed"
else
    echo "❌ PostgreSQL not found. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install postgresql@15
        brew services start postgresql@15
    else
        echo "Please install PostgreSQL manually or install Homebrew first"
        exit 1
    fi
fi

# Check if Docker is available (alternative option)
if command -v docker &> /dev/null; then
    echo "✅ Docker is available for database option"
    echo ""
    echo "Choose database setup method:"
    echo "1) Local PostgreSQL (if installed)"
    echo "2) Docker PostgreSQL (recommended for isolation)"
    echo "3) Skip database setup (manual setup)"
    echo ""
    read -p "Enter choice (1-3): " choice
else
    choice=1
fi

case $choice in
    1)
        echo "Setting up local PostgreSQL database..."
        # Create database and user
        createdb fortress_modeler 2>/dev/null || echo "Database may already exist"
        psql fortress_modeler -c "CREATE USER fortress_user WITH PASSWORD 'fortress_dev_password';" 2>/dev/null || echo "User may already exist"
        psql fortress_modeler -c "GRANT ALL PRIVILEGES ON DATABASE fortress_modeler TO fortress_user;" 2>/dev/null
        
        # Update .env file
        sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL=postgresql://fortress_user:fortress_dev_password@localhost:5432/fortress_modeler|' .env
        echo "✅ Local PostgreSQL configured"
        ;;
    2)
        echo "Setting up Docker PostgreSQL..."
        docker run --name fortress-postgres \
            -e POSTGRES_USER=fortress_user \
            -e POSTGRES_PASSWORD=fortress_dev_password \
            -e POSTGRES_DB=fortress_modeler \
            -p 5432:5432 \
            -d postgres:15
        
        # Update .env file
        sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL=postgresql://fortress_user:fortress_dev_password@localhost:5432/fortress_modeler|' .env
        echo "✅ Docker PostgreSQL configured"
        ;;
    3)
        echo "⚠️  Database setup skipped - please configure DATABASE_URL manually"
        ;;
esac

echo ""
echo "🔧 Next steps:"
echo "1. Run 'npm run db:migrate' to create tables"
echo "2. Run 'npm run dev' to start server with database"
echo "3. Test with 'npm run db:test'"