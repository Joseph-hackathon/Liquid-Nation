#!/bin/bash

# Prover API Test Suite
# Automated testing script for all Prover API improvements

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test header
print_test() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}Test $1: $2${NC}"
    echo -e "${BLUE}========================================${NC}\n"
    TESTS_RUN=$((TESTS_RUN + 1))
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ PASSED${NC}: $1\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

# Function to print failure
print_fail() {
    echo -e "${RED}❌ FAILED${NC}: $1\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  WARNING${NC}: $1\n"
}

# Function to check if backend is running
check_backend() {
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║     Prover API Fix - Automated Test Suite             ║"
echo "╔════════════════════════════════════════════════════════╗"
echo -e "${NC}\n"

# Check if backend is running
print_test "0" "Backend Status Check"
if check_backend; then
    print_success "Backend is running on port 3001"
else
    print_fail "Backend is not running!"
    echo -e "${YELLOW}Please start the backend first:${NC}"
    echo "  cd backend"
    echo "  RUST_LOG=debug cargo run"
    exit 1
fi

# Test 1: Overall Health Check
print_test "1" "Overall System Health Check"
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)

if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    print_success "System is healthy"
    
    # Check Prover API status in health response
    if echo "$HEALTH_RESPONSE" | grep -q '"reachable":true'; then
        print_success "Prover API is reachable"
        
        # Extract latency
        LATENCY=$(echo "$HEALTH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['prover_api']['latency_ms'])" 2>/dev/null || echo "unknown")
        echo -e "  ${GREEN}→${NC} Latency: ${LATENCY}ms"
    else
        print_warning "Prover API may not be reachable"
    fi
    
    # Check mock mode
    if echo "$HEALTH_RESPONSE" | grep -q '"mock_mode":true'; then
        echo -e "  ${YELLOW}→${NC} Mock mode: ENABLED"
    else
        echo -e "  ${GREEN}→${NC} Mock mode: DISABLED"
    fi
else
    print_fail "Health check failed"
    echo "$HEALTH_RESPONSE"
fi

# Test 2: Prover API Specific Health Check
print_test "2" "Prover API Health Check"
PROVER_RESPONSE=$(curl -s http://localhost:3001/api/health/prover)

if echo "$PROVER_RESPONSE" | grep -q '"reachable":true'; then
    LATENCY=$(echo "$PROVER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['latency_ms'])" 2>/dev/null || echo "unknown")
    API_URL=$(echo "$PROVER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['url'])" 2>/dev/null || echo "unknown")
    
    print_success "Prover API is reachable"
    echo -e "  ${GREEN}→${NC} URL: $API_URL"
    echo -e "  ${GREEN}→${NC} Latency: ${LATENCY}ms"
else
    print_fail "Prover API is not reachable"
    echo "$PROVER_RESPONSE"
fi

# Test 3: Unit Tests
print_test "3" "Unit Tests"
echo "Running cargo test in backend directory..."
cd backend

if cargo test 2>&1 | tee /tmp/test_output.txt | tail -20; then
    # Count passed tests
    PASSED=$(grep "test result:" /tmp/test_output.txt | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" || echo "0")
    FAILED=$(grep "test result:" /tmp/test_output.txt | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+" || echo "0")
    
    if [ "$FAILED" -eq "0" ]; then
        print_success "All unit tests passed ($PASSED tests)"
    else
        print_fail "$FAILED test(s) failed"
    fi
else
    print_fail "Unit tests encountered compilation errors"
fi

cd ..

# Test 4: Mock Mode Spell Prove Endpoint
print_test "4" "Mock Mode Spell Prove Endpoint"
SPELL_RESPONSE=$(curl -s -X POST http://localhost:3001/api/spells/prove \
  -H "Content-Type: application/json" \
  -d '{
    "spell_yaml": "version: 8\nstate: []",
    "app_binary": "",
    "prev_txs": [],
    "funding_utxo": "test:0",
    "funding_utxo_value": 10000,
    "change_address": "tb1qtest",
    "fee_rate": 10.0
  }')

if echo "$SPELL_RESPONSE" | grep -q '"success":true'; then
    TX_COUNT=$(echo "$SPELL_RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin)['transactions']))" 2>/dev/null || echo "0")
    print_success "Spell prove endpoint working"
    echo -e "  ${GREEN}→${NC} Returned $TX_COUNT transaction(s)"
    echo -e "  ${GREEN}→${NC} Mock mode functioning correctly"
else
    print_fail "Spell prove endpoint failed"
    echo "$SPELL_RESPONSE"
fi

# Test 5: Environment Validation (check logs)
print_test "5" "Environment Validation Check"
print_warning "Manual check required - verify startup logs show:"
echo "  ✅ === Environment Validation ==="
echo "  ✅ Prover API URL displayed"
echo "  ✅ Mock mode status shown"
echo "  ✅ Configuration displayed with ✅/⚠️ indicators"
echo ""
echo "Check the backend terminal for these messages on startup."

# Final Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}         Test Summary                   ${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "Total Tests Run:    ${BLUE}$TESTS_RUN${NC}"
echo -e "Tests Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed:       ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ ALL TESTS PASSED! 🎉            ║${NC}"
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}\n"
    exit 0
else
    echo -e "\n${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ❌ SOME TESTS FAILED                ║${NC}"
    echo -e "${RED}╔════════════════════════════════════════╗${NC}\n"
    exit 1
fi
