#!/bin/bash

# Comprehensive Log Viewing Script for Tic-Tac-Toe Online
# Usage: ./scripts/cat-logs.sh [log-type] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
LOG_DIR="debug-logs"
PROJECT_NAME="tic-tac-toe-online-vercel"

# Helper functions
print_header() {
    echo -e "${CYAN}================================================================${NC}"
    echo -e "${CYAN}🔍 $1${NC}"
    echo -e "${CYAN}================================================================${NC}"
}

print_section() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo -e "${BLUE}$(printf '%.0s-' {1..50})${NC}"
}

show_help() {
    cat << EOF
${GREEN}📋 Tic-Tac-Toe Online Log Viewer${NC}

${YELLOW}Usage:${NC}
  ./scripts/cat-logs.sh [command] [options]

${YELLOW}Commands:${NC}
  vercel          View Vercel deployment logs
  production      View production/runtime logs  
  browser         View browser/client logs
  errors          View error logs only
  pusher          View Pusher-related logs
  api             View API endpoint logs
  recent          View most recent logs (last 1 hour)
  live            Tail live logs (follow mode)
  search <term>   Search logs for specific term
  summary         Show log summary and statistics
  clean           Clean old log files
  all             View all logs (default)

${YELLOW}Options:${NC}
  -f, --follow    Follow/tail logs in real-time
  -n, --lines N   Show last N lines (default: 100)  
  -t, --time      Show logs from last N minutes/hours (e.g., -t 30m, -t 2h)
  -v, --verbose   Show verbose output
  -c, --color     Force color output
  --no-color      Disable color output

${YELLOW}Examples:${NC}
  ./scripts/cat-logs.sh vercel              # View Vercel logs
  ./scripts/cat-logs.sh errors -n 50        # Last 50 error lines
  ./scripts/cat-logs.sh live                # Follow live logs
  ./scripts/cat-logs.sh search "pusher"     # Search for pusher-related logs
  ./scripts/cat-logs.sh recent -t 2h        # Logs from last 2 hours
  ./scripts/cat-logs.sh api --follow        # Follow API logs

${YELLOW}Quick Commands:${NC}
  cat-vercel-logs     # Alias for vercel logs
  cat-error-logs      # Alias for error logs  
  tail-live-logs      # Alias for live logs
EOF
}

# Get Vercel logs
get_vercel_logs() {
    print_section "Vercel Deployment Logs"
    
    if command -v vercel &> /dev/null; then
        echo -e "${GREEN}📡 Fetching latest Vercel logs...${NC}"
        
        # Get latest deployment
        LATEST_DEPLOY=$(vercel ls --limit 1 2>/dev/null | tail -n +2 | head -n 1 | awk '{print $2}')
        
        if [ ! -z "$LATEST_DEPLOY" ]; then
            echo -e "${BLUE}Latest deployment: $LATEST_DEPLOY${NC}\n"
            vercel logs "$LATEST_DEPLOY" --limit ${LINES:-100}
        else
            echo -e "${RED}❌ No deployments found${NC}"
        fi
    else
        echo -e "${RED}❌ Vercel CLI not installed${NC}"
    fi
}

# Get production logs via API
get_production_logs() {
    print_section "Production Application Logs"
    
    echo -e "${GREEN}🌐 Testing production endpoints...${NC}\n"
    
    # Health check
    echo -e "${BLUE}Health Check:${NC}"
    curl -s "https://${PROJECT_NAME}.vercel.app/api/health-check" | jq '.' 2>/dev/null || echo "Failed to get health check"
    
    echo -e "\n${BLUE}Pusher Config:${NC}"
    curl -s "https://${PROJECT_NAME}.vercel.app/api/pusher-config" | jq '.' 2>/dev/null || echo "Failed to get pusher config"
    
    echo -e "\n${BLUE}Game List:${NC}"
    curl -s "https://${PROJECT_NAME}.vercel.app/api/game/list" | jq '.' 2>/dev/null || echo "Failed to get game list"
}

# Get browser logs
get_browser_logs() {
    print_section "Browser/Client-Side Logs"
    
    # Check if we have browser log files
    if [ -d "$LOG_DIR" ]; then
        BROWSER_LOGS=$(find "$LOG_DIR" -name "*browser*" -o -name "*client*" 2>/dev/null)
        if [ ! -z "$BROWSER_LOGS" ]; then
            echo -e "${GREEN}📱 Found browser log files:${NC}"
            echo "$BROWSER_LOGS" | while read -r file; do
                echo -e "\n${BLUE}📄 $file:${NC}"
                tail -n ${LINES:-50} "$file"
            done
        else
            echo -e "${YELLOW}⚠️  No browser log files found${NC}"
            echo -e "${BLUE}💡 Use: node scripts/debug-logs.js browser${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No log directory found${NC}"
        echo -e "${BLUE}💡 Run: node scripts/debug-logs.js${NC}"
    fi
}

# Get error logs
get_error_logs() {
    print_section "Error Logs"
    
    if [ -d "$LOG_DIR" ]; then
        echo -e "${GREEN}🔍 Searching for errors in log files...${NC}\n"
        
        find "$LOG_DIR" -name "*.log" -o -name "*.json" 2>/dev/null | while read -r file; do
            ERRORS=$(grep -i "error\|exception\|failed\|crash" "$file" 2>/dev/null | tail -n ${LINES:-20})
            if [ ! -z "$ERRORS" ]; then
                echo -e "${RED}❌ Errors in $file:${NC}"
                echo "$ERRORS"
                echo ""
            fi
        done
    else
        echo -e "${YELLOW}⚠️  No log files found${NC}"
    fi
}

# Get Pusher logs
get_pusher_logs() {
    print_section "Pusher-Related Logs"
    
    if [ -d "$LOG_DIR" ]; then
        echo -e "${GREEN}🔌 Searching for Pusher-related logs...${NC}\n"
        
        find "$LOG_DIR" -name "*.log" -o -name "*.json" 2>/dev/null | while read -r file; do
            PUSHER_LOGS=$(grep -i "pusher\|websocket\|connection\|subscribe" "$file" 2>/dev/null | tail -n ${LINES:-30})
            if [ ! -z "$PUSHER_LOGS" ]; then
                echo -e "${PURPLE}🔌 Pusher logs in $file:${NC}"
                echo "$PUSHER_LOGS"
                echo ""
            fi
        done
    else
        echo -e "${YELLOW}⚠️  No log files found${NC}"
    fi
}

# Get API logs
get_api_logs() {
    print_section "API Endpoint Logs"
    
    if [ -d "$LOG_DIR" ]; then
        echo -e "${GREEN}🔗 Searching for API-related logs...${NC}\n"
        
        find "$LOG_DIR" -name "*api*" -o -name "*endpoint*" 2>/dev/null | while read -r file; do
            echo -e "${BLUE}📡 API logs in $file:${NC}"
            tail -n ${LINES:-30} "$file"
            echo ""
        done
        
        # Also search for API patterns in all logs
        find "$LOG_DIR" -name "*.log" 2>/dev/null | while read -r file; do
            API_LOGS=$(grep -i "api/\|endpoint\|route\|POST\|GET" "$file" 2>/dev/null | tail -n ${LINES:-20})
            if [ ! -z "$API_LOGS" ]; then
                echo -e "${BLUE}🔗 API activity in $file:${NC}"
                echo "$API_LOGS"
                echo ""
            fi
        done
    else
        echo -e "${YELLOW}⚠️  No log files found${NC}"
    fi
}

# Get recent logs
get_recent_logs() {
    print_section "Recent Logs (${TIME_FILTER:-1 hour})"
    
    if [ -d "$LOG_DIR" ]; then
        echo -e "${GREEN}⏰ Finding recent log files...${NC}\n"
        
        # Find files modified in the last hour (or specified time)
        FIND_TIME="-60"  # Default: 60 minutes
        if [ ! -z "$TIME_FILTER" ]; then
            case "$TIME_FILTER" in
                *m) FIND_TIME="-${TIME_FILTER%m}" ;;
                *h) HOURS="${TIME_FILTER%h}"; FIND_TIME="-$((HOURS * 60))" ;;
                *) FIND_TIME="-${TIME_FILTER}" ;;
            esac
        fi
        
        find "$LOG_DIR" -name "*.log" -o -name "*.json" -mmin "$FIND_TIME" 2>/dev/null | while read -r file; do
            echo -e "${BLUE}📄 $file (modified: $(stat -f "%Sm" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null)):${NC}"
            tail -n ${LINES:-50} "$file"
            echo ""
        done
    else
        echo -e "${YELLOW}⚠️  No log files found${NC}"
    fi
}

# Live/follow logs
follow_live_logs() {
    print_section "Live Log Following"
    
    echo -e "${GREEN}📺 Following live logs... (Press Ctrl+C to stop)${NC}\n"
    
    # Try to follow Vercel logs
    if command -v vercel &> /dev/null; then
        echo -e "${BLUE}📡 Following Vercel logs...${NC}"
        vercel logs --follow &
        VERCEL_PID=$!
    fi
    
    # Follow local log files if they exist
    if [ -d "$LOG_DIR" ]; then
        echo -e "${BLUE}📁 Following local log files...${NC}"
        find "$LOG_DIR" -name "*.log" 2>/dev/null | head -3 | while read -r file; do
            echo -e "${CYAN}Following: $file${NC}"
            tail -f "$file" &
        done
    fi
    
    # Wait for interrupt
    wait
}

# Search logs
search_logs() {
    local search_term="$1"
    print_section "Searching for: '$search_term'"
    
    if [ -z "$search_term" ]; then
        echo -e "${RED}❌ No search term provided${NC}"
        return 1
    fi
    
    if [ -d "$LOG_DIR" ]; then
        echo -e "${GREEN}🔍 Searching in log files...${NC}\n"
        
        find "$LOG_DIR" -name "*.log" -o -name "*.json" 2>/dev/null | while read -r file; do
            MATCHES=$(grep -i "$search_term" "$file" 2>/dev/null)
            if [ ! -z "$MATCHES" ]; then
                echo -e "${BLUE}📄 Matches in $file:${NC}"
                echo "$MATCHES" | head -n ${LINES:-20}
                echo ""
            fi
        done
    else
        echo -e "${YELLOW}⚠️  No log files found${NC}"
    fi
}

# Show log summary
show_summary() {
    print_section "Log Summary & Statistics"
    
    if [ -d "$LOG_DIR" ]; then
        echo -e "${GREEN}📊 Log directory statistics:${NC}\n"
        
        # File counts
        LOG_COUNT=$(find "$LOG_DIR" -name "*.log" 2>/dev/null | wc -l)
        JSON_COUNT=$(find "$LOG_DIR" -name "*.json" 2>/dev/null | wc -l)
        TOTAL_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
        
        echo -e "${BLUE}📁 Directory: $LOG_DIR${NC}"
        echo -e "${BLUE}📄 Log files: $LOG_COUNT${NC}"
        echo -e "${BLUE}📄 JSON files: $JSON_COUNT${NC}"  
        echo -e "${BLUE}💾 Total size: $TOTAL_SIZE${NC}"
        
        echo -e "\n${BLUE}📋 Recent files:${NC}"
        find "$LOG_DIR" -type f 2>/dev/null | head -10 | while read -r file; do
            SIZE=$(ls -lh "$file" 2>/dev/null | awk '{print $5}')
            echo "  $file ($SIZE)"
        done
        
        # Error summary
        echo -e "\n${BLUE}❌ Error summary:${NC}"
        ERROR_COUNT=$(find "$LOG_DIR" -name "*.log" -exec grep -i "error\|exception\|failed" {} \; 2>/dev/null | wc -l)
        echo -e "${RED}  Total errors found: $ERROR_COUNT${NC}"
        
    else
        echo -e "${YELLOW}⚠️  No log directory found${NC}"
        echo -e "${BLUE}💡 Run: node scripts/debug-logs.js${NC}"
    fi
}

# Clean old logs
clean_logs() {
    print_section "Cleaning Old Log Files"
    
    if [ -d "$LOG_DIR" ]; then
        echo -e "${GREEN}🧹 Cleaning logs older than 7 days...${NC}\n"
        
        OLD_FILES=$(find "$LOG_DIR" -name "*.log" -o -name "*.json" -mtime +7 2>/dev/null)
        if [ ! -z "$OLD_FILES" ]; then
            echo "Files to be deleted:"
            echo "$OLD_FILES"
            echo ""
            read -p "Delete these files? (y/N): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "$OLD_FILES" | xargs rm -f
                echo -e "${GREEN}✅ Old files deleted${NC}"
            else
                echo -e "${YELLOW}⚠️  Cleanup cancelled${NC}"
            fi
        else
            echo -e "${GREEN}✅ No old files to clean${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No log directory found${NC}"
    fi
}

# Parse arguments
COMMAND="all"
LINES=100
TIME_FILTER=""
FOLLOW=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -t|--time)
            TIME_FILTER="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        search)
            COMMAND="search"
            SEARCH_TERM="$2"
            shift 2
            ;;
        vercel|production|browser|errors|pusher|api|recent|live|summary|clean|all)
            COMMAND="$1"
            shift
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
print_header "Tic-Tac-Toe Online Log Viewer"

case "$COMMAND" in
    vercel)
        get_vercel_logs
        ;;
    production)
        get_production_logs
        ;;
    browser)
        get_browser_logs
        ;;
    errors)
        get_error_logs
        ;;
    pusher)
        get_pusher_logs
        ;;
    api)
        get_api_logs
        ;;
    recent)
        get_recent_logs
        ;;
    live)
        follow_live_logs
        ;;
    search)
        search_logs "$SEARCH_TERM"
        ;;
    summary)
        show_summary
        ;;
    clean)
        clean_logs
        ;;
    all)
        get_vercel_logs
        get_production_logs
        get_error_logs
        ;;
esac

echo -e "\n${GREEN}✅ Log viewing complete${NC}" 