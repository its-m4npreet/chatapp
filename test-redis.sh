#!/bin/bash

# Redis Testing Script
# This script helps you test and debug Redis caching in your chat app

echo "🧪 Chat App Redis Testing Suite"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Check Redis Server
test_redis_connection() {
    echo -e "${BLUE}Test 1: Redis Server Connection${NC}"
    echo "───────────────────────────────────"
    
    if redis-cli ping 2>/dev/null | grep -q PONG; then
        echo -e "${GREEN}✓ Redis server is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Redis server is not running${NC}"
        echo "  Start Redis with: redis-server"
        return 1
    fi
}

# Test 2: Check Redis Configuration
test_redis_config() {
    echo ""
    echo -e "${BLUE}Test 2: Redis Configuration${NC}"
    echo "───────────────────────────────────"
    
    echo -e "${YELLOW}Redis Info:${NC}"
    redis-cli info server | grep -E "redis_version|tcp_port|uptime_in_seconds"
    
    echo ""
    echo -e "${YELLOW}Redis Memory:${NC}"
    redis-cli info memory | grep -E "used_memory_human|used_memory_peak_human"
}

# Test 3: Check Node.js Dependencies
test_node_dependencies() {
    echo ""
    echo -e "${BLUE}Test 3: Node.js Dependencies${NC}"
    echo "───────────────────────────────────"
    
    cd backend
    
    if grep -q '"redis"' package.json; then
        echo -e "${GREEN}✓ Redis package found in package.json${NC}"
    else
        echo -e "${RED}✗ Redis package NOT in package.json${NC}"
        echo "  Run: npm install redis"
        return 1
    fi
    
    if [ -d "node_modules/redis" ]; then
        echo -e "${GREEN}✓ Redis module is installed${NC}"
    else
        echo -e "${RED}✗ Redis module NOT installed${NC}"
        echo "  Run: npm install"
        return 1
    fi
    
    cd ..
}

# Test 4: Check Environment Configuration
test_env_config() {
    echo ""
    echo -e "${BLUE}Test 4: Environment Configuration${NC}"
    echo "───────────────────────────────────"
    
    cd backend
    
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓ .env file exists${NC}"
        
        if grep -q "REDIS_HOST" .env; then
            echo -e "${GREEN}✓ REDIS_HOST configured${NC}"
            REDIS_HOST=$(grep "REDIS_HOST=" .env | cut -d'=' -f2)
            echo "  Value: $REDIS_HOST"
        else
            echo -e "${YELLOW}⚠ REDIS_HOST not in .env (using default: localhost)${NC}"
        fi
        
        if grep -q "REDIS_PORT" .env; then
            echo -e "${GREEN}✓ REDIS_PORT configured${NC}"
            REDIS_PORT=$(grep "REDIS_PORT=" .env | cut -d'=' -f2)
            echo "  Value: $REDIS_PORT"
        else
            echo -e "${YELLOW}⚠ REDIS_PORT not in .env (using default: 6379)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ .env file not found${NC}"
        echo "  Copy from .env.example and configure"
    fi
    
    cd ..
}

# Test 5: Check Files Exist
test_files_exist() {
    echo ""
    echo -e "${BLUE}Test 5: Required Files${NC}"
    echo "───────────────────────────────────"
    
    FILES=(
        "backend/config/redis.js"
        "backend/services/cacheService.js"
        "backend/workers/cachePersistenceWorker.js"
    )
    
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}✓ $file exists${NC}"
        else
            echo -e "${RED}✗ $file NOT found${NC}"
        fi
    done
}

# Test 6: Test Redis Commands
test_redis_commands() {
    echo ""
    echo -e "${BLUE}Test 6: Redis Commands${NC}"
    echo "───────────────────────────────────"
    
    # Test SET and GET
    echo -e "${YELLOW}Testing SET/GET:${NC}"
    redis-cli SET test:key "Hello Redis" EX 10
    VALUE=$(redis-cli GET test:key)
    if [ "$VALUE" = "Hello Redis" ]; then
        echo -e "${GREEN}✓ SET/GET works correctly${NC}"
        echo "  Retrieved: $VALUE"
    else
        echo -e "${RED}✗ SET/GET failed${NC}"
    fi
    
    # Test DEL
    echo -e "${YELLOW}Testing DEL:${NC}"
    redis-cli DEL test:key
    DELETED=$(redis-cli EXISTS test:key)
    if [ "$DELETED" = "0" ]; then
        echo -e "${GREEN}✓ DEL works correctly${NC}"
    else
        echo -e "${RED}✗ DEL failed${NC}"
    fi
    
    # Test EXPIRE
    echo -e "${YELLOW}Testing EXPIRE (5s TTL):${NC}"
    redis-cli SET expire:test "Test data"
    redis-cli EXPIRE expire:test 5
    TTL=$(redis-cli TTL expire:test)
    echo -e "${GREEN}✓ Key will expire in: $TTL seconds${NC}"
    
    # Test KEYS pattern
    echo -e "${YELLOW}Testing KEYS pattern:${NC}"
    redis-cli SET message:1 "msg1"
    redis-cli SET message:2 "msg2"
    KEYS=$(redis-cli KEYS "message:*")
    echo -e "${GREEN}✓ Found keys: $KEYS${NC}"
    redis-cli DEL message:1 message:2
}

# Test 7: Monitor Real-time Operations
test_redis_monitor() {
    echo ""
    echo -e "${BLUE}Test 7: Real-time Monitor (5 seconds)${NC}"
    echo "───────────────────────────────────"
    echo -e "${YELLOW}Monitoring Redis operations...${NC}"
    timeout 5 redis-cli MONITOR || true
}

# Interactive Menu
show_menu() {
    echo ""
    echo "📋 Select a test to run:"
    echo "───────────────────────"
    echo "1) All tests"
    echo "2) Connection test"
    echo "3) Configuration test"
    echo "4) Dependencies test"
    echo "5) Environment test"
    echo "6) Files test"
    echo "7) Redis commands test"
    echo "8) Real-time monitor"
    echo "9) Exit"
    echo ""
    read -p "Enter choice [1-9]: " choice
}

# Run All Tests
run_all_tests() {
    test_redis_connection || return 1
    test_redis_config
    test_node_dependencies
    test_env_config
    test_files_exist
    test_redis_commands
    
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}✓ All tests completed!${NC}"
    echo -e "${GREEN}================================${NC}"
}

# Main Script
main() {
    while true; do
        show_menu
        case $choice in
            1) run_all_tests ;;
            2) test_redis_connection ;;
            3) test_redis_config ;;
            4) test_node_dependencies ;;
            5) test_env_config ;;
            6) test_files_exist ;;
            7) test_redis_commands ;;
            8) test_redis_monitor ;;
            9) 
                echo "Goodbye! 👋"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice${NC}"
                ;;
        esac
    done
}

# Quick Mode (run all tests without menu)
if [ "$1" = "--quick" ]; then
    run_all_tests
else
    main
fi
