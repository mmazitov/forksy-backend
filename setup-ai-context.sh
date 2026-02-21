#!/bin/bash
# setup-ai-context.sh
#
# Usage:
#   ./setup-ai-context.sh           — interactive selection
#   ./setup-ai-context.sh all       — setup all tools
#   ./setup-ai-context.sh claude    — setup Claude Code only
#   ./setup-ai-context.sh cursor    — setup Cursor only
#   ./setup-ai-context.sh copilot   — setup GitHub Copilot only
#   ./setup-ai-context.sh antigravity — setup Antigravity only

set -e  # Stop on error

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to create a symlink
create_symlink() {
    local source=$1
    local target=$2

    # Delete old file/symlink if it exists
    if [ -e "$target" ] || [ -L "$target" ]; then
        echo -e "  ${YELLOW}🗑️  Removing existing:${NC} $target"
        rm "$target"
    fi

    # Create parent directory if needed
    mkdir -p "$(dirname "$target")"

    # Create a new symlink
    ln -sf "$source" "$target"
    echo -e "  ${CYAN}🔗 Creating symlink:${NC}  $target → $source"
}

# Function to sync files from a source directory to a destination directory
sync_files() {
    local source_dir=$1
    local dest_dir=$2

    if [ -d "$source_dir" ]; then
        echo -e "  ${BLUE}📁 Syncing directory:${NC} $source_dir → $dest_dir"
        mkdir -p "$dest_dir"
        find "$source_dir" -name "*.md" | while read -r source; do
            rel="${source#$source_dir/}"
            target="$dest_dir/$rel"
            mkdir -p "$(dirname "$target")"
            depth=$(echo "$target" | tr -cd '/' | wc -c | tr -d ' ')
            prefix=$(printf '../%.0s' $(seq 1 "$depth"))
            create_symlink "${prefix}${source}" "$target"
        done
    else
        echo -e "  ${YELLOW}ℹ️  Skipping directory:${NC} $source_dir (not found)"
    fi
}

print_header() {
    echo -e "\n${BOLD}--- Setting up $1 ---${NC}"
}

setup_claude() {
    print_header "Claude Code"
    create_symlink "AGENTS.md" "CLAUDE.md"
    sync_files ".ai/commands" ".claude/commands"
}

setup_cursor() {
    print_header "Cursor"
    echo -e "  ${GREEN}✓${NC} Cursor natively reads AGENTS.md — no symlink needed"
}

setup_copilot() {
    print_header "GitHub Copilot"
    create_symlink "AGENTS.md" ".copilot-instructions.md"
}

setup_antigravity() {
    print_header "Antigravity"
    echo -e "  ${GREEN}✓${NC} Antigravity natively reads AGENTS.md"
    create_symlink "../AGENTS.md" ".agent/AGENTS.md"
    sync_files ".ai/commands" ".agent/workflows"
    sync_files ".ai/rules" ".agent/rules"
    sync_files ".ai/project" ".agent/project"
}

# Interactive menu function
select_tool_interactive() {
    local options=("claude" "cursor" "copilot" "antigravity" "all" "exit")
    local selected=0
    
    # Use tput to manage cursor
    tput civis # hide cursor
    trap 'tput cnorm; echo; exit 0' INT TERM

    while true; do
        echo -e "\n${BOLD}🤖 Please select the AI tool to set up (use arrow keys):${NC}"
        for i in "${!options[@]}"; do
            if [ "$i" -eq "$selected" ]; then
                echo -e "  \033[1;32m▶ ${options[$i]}\033[0m"
            else
                echo "    ${options[$i]}"
            fi
        done

        # Read key press
        IFS= read -rsn1 key
        if [[ $key == $'\x1b' ]]; then
            read -rsn2 key
            if [[ $key == "[A" ]]; then # Up
                ((selected--))
                [ $selected -lt 0 ] && selected=$((${#options[@]} - 1))
            elif [[ $key == "[B" ]]; then # Down
                ((selected++))
                [ $selected -ge ${#options[@]} ] && selected=0
            fi
        elif [[ $key == "" ]]; then # Enter
            break
        fi

        # Move screen cursor up to redraw menu
        # Total lines: options count + 2 (the header and trailing newline)
        echo -en "\033[$((${#options[@]} + 2))A"
    done

    tput cnorm # show cursor
    echo "" # move to next line after selection

    if [ "${options[$selected]}" == "exit" ]; then
        echo -e "${YELLOW}Setup cancelled.${NC}"
        exit 0
    fi
    
    TOOL="${options[$selected]}"
}

# START OF EXECUTION

# Check availability AGENTS.md
if [ ! -f "AGENTS.md" ]; then
    echo -e "${RED}❌ Error: AGENTS.md not found!${NC}"
    echo "This file should be in the root of your project."
    exit 1
fi

# Determine tool
if [ -n "$1" ]; then
    TOOL="$1"
else
    select_tool_interactive
fi

echo -e "🚀 ${BOLD}Setting up AI development environment...${NC} (tool: $TOOL)"

# Run based on argument
case "$TOOL" in
    claude)      setup_claude ;;
    cursor)      setup_cursor ;;
    copilot)     setup_copilot ;;
    antigravity) setup_antigravity ;;
    all)
        setup_claude
        setup_cursor
        setup_copilot
        setup_antigravity
        ;;
    *)
        echo -e "${RED}❌ Unknown tool: $TOOL${NC}"
        echo "Available: claude, cursor, copilot, antigravity, all"
        exit 1
        ;;
esac

# Verify symlinks
echo -e "\n${BOLD}🔍 Verifying symlinks...${NC}"
for file in CLAUDE.md .copilot-instructions.md .agent/AGENTS.md; do
    if [ -L "$file" ]; then
        if [ -e "$file" ]; then
            echo -e "  ${GREEN}✓${NC} $file is valid"
        else
            echo -e "  ${RED}❌ $file is broken!${NC}"
        fi
    fi
done

echo -e "\n${GREEN}${BOLD}✅ Setup complete!${NC}"
