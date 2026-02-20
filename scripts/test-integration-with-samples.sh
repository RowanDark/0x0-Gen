#!/bin/bash

# 0xGen Sample Data Import Test
# Tests importing all sample data files

set -e

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3100}"
SAMPLES_DIR="${SAMPLES_DIR:-./samples}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "============================================"
echo "0xGen Sample Data Import Test"
echo "============================================"
echo ""

# Check if samples directory exists
if [ ! -d "$SAMPLES_DIR" ]; then
    echo -e "${RED}Samples directory not found: $SAMPLES_DIR${NC}"
    exit 1
fi

# Check gateway health
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/healthz" 2>/dev/null || echo "000")
if [ "$HEALTH" != "200" ]; then
    echo -e "${RED}Gateway not healthy. Start it first.${NC}"
    exit 1
fi

# Create test project
echo "Creating test project..."
PROJECT_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/recon/projects" \
    -H "Content-Type: application/json" \
    -d '{"name":"Sample Data Test","targets":["example-target.com"]}')

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Failed to create project${NC}"
    exit 1
fi

echo "Project ID: $PROJECT_ID"
echo ""

# Test each sample file
TOTAL_ENTITIES=0

test_import() {
    local file=$1
    local source=$2

    if [ ! -f "$file" ]; then
        echo -e "${RED}✗${NC} File not found: $file"
        return
    fi

    echo -n "Importing $file ($source)... "

    RESPONSE=$(curl -s -X POST "$GATEWAY_URL/recon/projects/$PROJECT_ID/import" \
        -F "file=@$file" \
        -F "source=$source" 2>/dev/null)

    if echo "$RESPONSE" | grep -q '"total"'; then
        IMPORTED=$(echo "$RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
        NEW=$(echo "$RESPONSE" | grep -o '"new":[0-9]*' | cut -d':' -f2)
        echo -e "${GREEN}✓${NC} $IMPORTED total, $NEW new"
        TOTAL_ENTITIES=$((TOTAL_ENTITIES + NEW))
    else
        echo -e "${RED}✗${NC} Failed"
        echo "Response: $RESPONSE"
    fi
}

# Import each sample file
test_import "$SAMPLES_DIR/amass-example.json" "amass"
test_import "$SAMPLES_DIR/subfinder-example.txt" "subfinder"
test_import "$SAMPLES_DIR/httpx-example.json" "httpx"
test_import "$SAMPLES_DIR/nuclei-example.json" "nuclei"
test_import "$SAMPLES_DIR/nmap-example.xml" "nmap"
test_import "$SAMPLES_DIR/ffuf-example.json" "ffuf"
test_import "$SAMPLES_DIR/wayback-example.txt" "waybackurls"
test_import "$SAMPLES_DIR/shodan-example.json" "shodan"

echo ""
echo "============================================"
echo "Import Summary"
echo "============================================"
echo "Total new entities: $TOTAL_ENTITIES"
echo ""

# Get final stats
echo "Final project stats:"
curl -s "$GATEWAY_URL/recon/projects/$PROJECT_ID/stats" | python3 -m json.tool 2>/dev/null || \
    curl -s "$GATEWAY_URL/recon/projects/$PROJECT_ID/stats"

echo ""
echo "Test project ID: $PROJECT_ID"
echo "You can view this in the Recon UI at http://localhost:3004"
echo ""
echo "To delete the test project:"
echo "  curl -X DELETE $GATEWAY_URL/recon/projects/$PROJECT_ID"
