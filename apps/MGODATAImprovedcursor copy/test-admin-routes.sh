#!/bin/bash

# Test Admin Routes - Verify no /pricing redirect

echo "🧪 Testing Admin Routes Fix"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=5173
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-password}

echo "📋 Configuration:"
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  Admin:    $ADMIN_USER:****"
echo ""

# Function to test endpoint
test_endpoint() {
  local url=$1
  local description=$2
  
  echo -n "Testing $description... "
  
  response=$(curl -s -o /dev/null -w "%{http_code}|%{url_effective}" -u "$ADMIN_USER:$ADMIN_PASS" "$url")
  status_code=$(echo $response | cut -d'|' -f1)
  final_url=$(echo $response | cut -d'|' -f2)
  
  # Check if redirected to /pricing
  if [[ "$final_url" == *"/pricing"* ]]; then
    echo -e "${RED}❌ FAIL - Redirected to /pricing${NC}"
    return 1
  fi
  
  # Check status code
  if [[ "$status_code" == "200" || "$status_code" == "401" ]]; then
    echo -e "${GREEN}✅ PASS (HTTP $status_code)${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠️  WARNING - HTTP $status_code${NC}"
    return 1
  fi
}

echo "🧪 Testing Backend (Direct) on :$BACKEND_PORT"
echo "----------------------------------------------"
test_endpoint "http://localhost:$BACKEND_PORT/health" "Health Check"
test_endpoint "http://localhost:$BACKEND_PORT/openapi.json" "/openapi.json"
test_endpoint "http://localhost:$BACKEND_PORT/docs" "/docs (Swagger UI)"
test_endpoint "http://localhost:$BACKEND_PORT/admin" "/admin (Console)"
echo ""

echo "🧪 Testing Frontend (Proxied) on :$FRONTEND_PORT"
echo "-------------------------------------------------"
test_endpoint "http://localhost:$FRONTEND_PORT/openapi.json" "/openapi.json (proxied)"
test_endpoint "http://localhost:$FRONTEND_PORT/docs" "/docs (proxied)"
test_endpoint "http://localhost:$FRONTEND_PORT/admin" "/admin (proxied)"
echo ""

echo "🔍 Checking for /pricing redirects..."
echo "--------------------------------------"

# Test without auth to see if it redirects to pricing
echo -n "Testing /admin without auth... "
response=$(curl -s -o /dev/null -w "%{url_effective}" "http://localhost:$FRONTEND_PORT/admin")
if [[ "$response" == *"/pricing"* ]]; then
  echo -e "${RED}❌ FAIL - Redirects to /pricing${NC}"
else
  echo -e "${GREEN}✅ PASS - No redirect (shows auth prompt)${NC}"
fi

echo ""
echo "=============================="
echo "✅ Test Complete!"
echo ""
echo "💡 Next Steps:"
echo "  1. If tests show ❌, restart Vite dev server"
echo "  2. Clear browser cache (Cmd+Shift+R)"
echo "  3. Check ADMIN_USER/ADMIN_PASS in backend .env"
echo "  4. Visit http://localhost:5173/admin in browser"
echo ""



