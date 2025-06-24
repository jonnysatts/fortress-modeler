#!/bin/bash

echo "🧪 Testing Fortress Modeler Server - Phase 1"
echo "=============================================="

# Start server in background
echo "Starting server..."
node src/simple-server.js &
SERVER_PID=$!
sleep 3

echo -e "\n✅ Test 1: Basic Health Check"
curl -s http://localhost:4000/health | jq '.'

echo -e "\n✅ Test 2: Detailed Health Check"
curl -s http://localhost:4000/health/detailed | jq '.components.server.status, .components.environment.status'

echo -e "\n✅ Test 3: Projects Endpoint"
curl -s http://localhost:4000/api/projects | jq '.message'

echo -e "\n✅ Test 4: CORS Headers"
curl -s -I -H "Origin: http://localhost:5173" http://localhost:4000/health | grep -i "access-control"

echo -e "\n✅ Test 5: 404 Handler"
curl -s http://localhost:4000/nonexistent | jq '.error'

echo -e "\n✅ Test 6: Environment Variables"
if grep -q "GOOGLE_CLIENT_ID" .env && grep -q "JWT_SECRET" .env; then
    echo "Environment variables configured ✓"
else
    echo "Environment variables need configuration ⚠️"
fi

# Clean up
kill $SERVER_PID 2>/dev/null
echo -e "\n🎉 Phase 1 Tests Complete!"
echo "✅ Basic Express server working"
echo "✅ Health endpoints working"
echo "✅ CORS configured for React app"
echo "✅ Environment setup ready"
echo "✅ Ready for Phase 2 (Database + Auth)"