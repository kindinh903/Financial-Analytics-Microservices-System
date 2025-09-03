#!/bin/bash

# Backtest Service Test Script

echo "=== Backtest Service Test Script ==="

# Base URL
BASE_URL="http://localhost:8080"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# Test 1: Health Check
echo -e "\n${YELLOW}1. Testing Health Check...${NC}"
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health"
print_status $? "Health Check"

# Test 2: Run Backtest for BTCUSDT 1h
echo -e "\n${YELLOW}2. Running Backtest for BTCUSDT 1h...${NC}"
BACKTEST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/backtest" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "interval": "1h",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z",
    "initialBalance": 10000,
    "commission": 0.001,
    "strategy": "AI_PREDICTION"
  }')

if [ $? -eq 0 ]; then
    echo "Backtest Response:"
    echo "$BACKTEST_RESPONSE" | jq '.' 2>/dev/null || echo "$BACKTEST_RESPONSE"
    BACKTEST_ID=$(echo "$BACKTEST_RESPONSE" | jq -r '.id' 2>/dev/null)
    if [ "$BACKTEST_ID" != "null" ] && [ "$BACKTEST_ID" != "" ]; then
        print_status 0 "Backtest Created Successfully"
        
        # Test 3: Get Backtest Result
        echo -e "\n${YELLOW}3. Getting Backtest Result...${NC}"
        curl -s "$BASE_URL/api/backtest/$BACKTEST_ID" | jq '.' 2>/dev/null || echo "Failed to get backtest result"
        print_status $? "Get Backtest Result"
        
        # Test 4: Get Backtest Stats
        echo -e "\n${YELLOW}4. Getting Backtest Stats...${NC}"
        curl -s "$BASE_URL/api/backtest/stats" | jq '.' 2>/dev/null || echo "Failed to get backtest stats"
        print_status $? "Get Backtest Stats"
        
        # Test 5: Get Backtest List
        echo -e "\n${YELLOW}5. Getting Backtest List...${NC}"
        curl -s "$BASE_URL/api/backtest?symbol=BTCUSDT" | jq '.' 2>/dev/null || echo "Failed to get backtest list"
        print_status $? "Get Backtest List"
        
        # Test 6: Delete Backtest
        echo -e "\n${YELLOW}6. Deleting Backtest...${NC}"
        curl -s -X DELETE "$BASE_URL/api/backtest/$BACKTEST_ID" -w "%{http_code}"
        print_status $? "Delete Backtest"
    else
        print_status 1 "Backtest Creation Failed"
    fi
else
    print_status 1 "Backtest Creation Failed"
fi

# Test 7: Run Multiple Backtests
echo -e "\n${YELLOW}7. Running Multiple Backtests...${NC}"

# ETHUSDT 15m
echo "Running ETHUSDT 15m backtest..."
curl -s -X POST "$BASE_URL/api/backtest" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "ETHUSDT",
    "interval": "15m",
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-01-22T23:59:59Z",
    "initialBalance": 5000,
    "commission": 0.0015,
    "strategy": "AI_PREDICTION"
  }' > /dev/null
print_status $? "ETHUSDT 15m Backtest"

# BNBUSDT 4h
echo "Running BNBUSDT 4h backtest..."
curl -s -X POST "$BASE_URL/api/backtest" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BNBUSDT",
    "interval": "4h",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z",
    "initialBalance": 15000,
    "commission": 0.001,
    "strategy": "AI_PREDICTION"
  }' > /dev/null
print_status $? "BNBUSDT 4h Backtest"

# Test 8: Final Stats
echo -e "\n${YELLOW}8. Final Statistics...${NC}"
curl -s "$BASE_URL/api/backtest/stats" | jq '.' 2>/dev/null || echo "Failed to get final stats"
print_status $? "Final Statistics"

echo -e "\n${GREEN}=== Test Script Completed ===${NC}"
