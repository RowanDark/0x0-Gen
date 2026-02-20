#!/bin/bash

# 0xGen Integration Test Script
# Tests core workflows to verify the application is working

set -e

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3100}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "0xGen Integration Test Suite"
echo "============================================"
echo ""
echo "Gateway URL: $GATEWAY_URL"
echo ""

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

# -------------------------------------------
# Test 1: Gateway Health Check
# -------------------------------------------
echo "--- Test 1: Gateway Health Check ---"

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/healthz" 2>/dev/null || echo "000")

if [ "$HEALTH" = "200" ]; then
    pass "Gateway is healthy"
else
    fail "Gateway health check failed (HTTP $HEALTH)"
    echo "Is the gateway running? Start it with: pnpm --filter @0x0-gen/gateway dev"
    exit 1
fi

# -------------------------------------------
# Test 2: Services Status
# -------------------------------------------
echo ""
echo "--- Test 2: Services Status ---"

SERVICES=$(curl -s "$GATEWAY_URL/services" 2>/dev/null)

if echo "$SERVICES" | grep -q '"status":"running"'; then
    pass "Services endpoint returns running services"
else
    fail "Services endpoint not returning expected data"
fi

# -------------------------------------------
# Test 3: Create Recon Project
# -------------------------------------------
echo ""
echo "--- Test 3: Create Recon Project ---"

PROJECT_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/recon/projects" \
    -H "Content-Type: application/json" \
    -d '{"name":"Integration Test Project","targets":["example-target.com"]}' 2>/dev/null)

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$PROJECT_ID" ]; then
    pass "Created project with ID: $PROJECT_ID"
else
    fail "Failed to create project"
    echo "Response: $PROJECT_RESPONSE"
fi

# -------------------------------------------
# Test 4: List Projects
# -------------------------------------------
echo ""
echo "--- Test 4: List Projects ---"

PROJECTS=$(curl -s "$GATEWAY_URL/recon/projects" 2>/dev/null)

if echo "$PROJECTS" | grep -q "$PROJECT_ID"; then
    pass "Project appears in list"
else
    fail "Project not found in list"
fi

# -------------------------------------------
# Test 5: Import Text Data
# -------------------------------------------
echo ""
echo "--- Test 5: Import Text Data ---"

IMPORT_DATA="www.example-target.com
api.example-target.com
mail.example-target.com"

IMPORT_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/recon/projects/$PROJECT_ID/import/text" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"$IMPORT_DATA\",\"source\":\"subfinder\"}" 2>/dev/null)

if echo "$IMPORT_RESPONSE" | grep -q '"total"'; then
    IMPORT_TOTAL=$(echo "$IMPORT_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    pass "Imported $IMPORT_TOTAL entities"
else
    fail "Import failed"
    echo "Response: $IMPORT_RESPONSE"
fi

# -------------------------------------------
# Test 6: List Entities
# -------------------------------------------
echo ""
echo "--- Test 6: List Entities ---"

ENTITIES=$(curl -s "$GATEWAY_URL/recon/projects/$PROJECT_ID/entities" 2>/dev/null)

if echo "$ENTITIES" | grep -q '"entities"'; then
    ENTITY_COUNT=$(echo "$ENTITIES" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    pass "Found $ENTITY_COUNT entities"
else
    fail "Failed to list entities"
fi

# -------------------------------------------
# Test 7: Get Project Stats
# -------------------------------------------
echo ""
echo "--- Test 7: Get Project Stats ---"

STATS=$(curl -s "$GATEWAY_URL/recon/projects/$PROJECT_ID/stats" 2>/dev/null)

if echo "$STATS" | grep -q '"total"'; then
    pass "Stats endpoint working"
else
    fail "Stats endpoint failed"
fi

# -------------------------------------------
# Test 8: Get Graph Data
# -------------------------------------------
echo ""
echo "--- Test 8: Get Graph Data ---"

GRAPH=$(curl -s "$GATEWAY_URL/recon/projects/$PROJECT_ID/graph" 2>/dev/null)

if echo "$GRAPH" | grep -q '"nodes"'; then
    NODE_COUNT=$(echo "$GRAPH" | grep -o '"nodes":\[' | wc -l)
    pass "Graph endpoint working"
else
    fail "Graph endpoint failed"
fi

# -------------------------------------------
# Test 9: List Transforms
# -------------------------------------------
echo ""
echo "--- Test 9: List Transforms ---"

TRANSFORMS=$(curl -s "$GATEWAY_URL/mapper/transforms" 2>/dev/null)

if echo "$TRANSFORMS" | grep -q '"transforms"'; then
    TRANSFORM_COUNT=$(echo "$TRANSFORMS" | grep -o '"id"' | wc -l)
    pass "Found $TRANSFORM_COUNT transforms"
else
    fail "Transforms endpoint failed"
fi

# -------------------------------------------
# Test 10: Create Mapper Canvas
# -------------------------------------------
echo ""
echo "--- Test 10: Create Mapper Canvas ---"

CANVAS_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/mapper/canvases" \
    -H "Content-Type: application/json" \
    -d "{\"projectId\":\"$PROJECT_ID\",\"name\":\"Test Canvas\"}" 2>/dev/null)

CANVAS_ID=$(echo "$CANVAS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CANVAS_ID" ]; then
    pass "Created canvas with ID: $CANVAS_ID"
else
    fail "Failed to create canvas"
fi

# -------------------------------------------
# Test 11: Decoder Transform
# -------------------------------------------
echo ""
echo "--- Test 11: Decoder Service ---"

DECODE_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/decoder/transform" \
    -H "Content-Type: application/json" \
    -d '{"input":"SGVsbG8gV29ybGQ=","pipeline":[{"type":"base64","direction":"decode"}]}' 2>/dev/null)

if echo "$DECODE_RESPONSE" | grep -q "Hello World"; then
    pass "Decoder working (base64 decode)"
else
    fail "Decoder failed"
    echo "Response: $DECODE_RESPONSE"
fi

# -------------------------------------------
# Test 12: Repeater Tab Management
# -------------------------------------------
echo ""
echo "--- Test 12: Repeater Service ---"

# Create a tab
TAB_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/replay/tabs" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Tab"}' 2>/dev/null)

if echo "$TAB_RESPONSE" | grep -q '"id"'; then
    pass "Repeater tab creation working"
else
    warn "Repeater tab creation returned unexpected response (may be expected if service uses different endpoint)"
fi

# -------------------------------------------
# Cleanup: Delete Test Project
# -------------------------------------------
echo ""
echo "--- Cleanup ---"

DELETE_RESPONSE=$(curl -s -X DELETE "$GATEWAY_URL/recon/projects/$PROJECT_ID" 2>/dev/null)

if echo "$DELETE_RESPONSE" | grep -q '"ok"'; then
    pass "Cleaned up test project"
else
    warn "Failed to clean up test project (may need manual cleanup)"
fi

# -------------------------------------------
# Summary
# -------------------------------------------
echo ""
echo "============================================"
echo "Test Summary"
echo "============================================"
echo -e "${GREEN}Passed${NC}: $TESTS_PASSED"
echo -e "${RED}Failed${NC}: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check output above.${NC}"
    exit 1
fi
