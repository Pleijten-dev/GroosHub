# Documentation Verification Checklist

> **Purpose**: Verify all documentation was successfully consolidated and nothing is missing
> **Last Verified**: 2025-12-08

---

## Quick Verification Commands

### 1. Check All Original Files Were Copied

```bash
# List all .md files that were in root (now should be in docs/)
echo "Checking root .md files are gone (except README, CLAUDE, TODO)..."
ls -1 *.md 2>/dev/null | grep -v "README.md\|CLAUDE.md\|TODO.md"
# Expected output: (empty - no extra files)

# Check old Documentation/ folder is gone
echo "Checking Documentation/ folder is gone..."
ls -d Documentation/ 2>/dev/null
# Expected output: ls: cannot access 'Documentation/': No such file or directory
```

### 2. Verify Key Files Exist in New Locations

```bash
# Verify all major docs are in /docs/
ls -1 docs/03-features/ai-chatbot/rebuild-roadmap.md \
     docs/03-features/lca/project-status.md \
     docs/07-database/current-schema.md \
     docs/07-database/URGENT-MIGRATION-REQUIRED.md \
     docs/03-features/location-analysis/scoring-system.md
# Expected: All files should exist
```

### 3. Verify File Completeness

```bash
# Check line counts (should match original sizes)
wc -l docs/03-features/ai-chatbot/rebuild-roadmap.md
# Expected: 3281 lines (contains ALL weeks 1-8)

wc -l docs/03-features/lca/project-status.md
# Expected: ~1000+ lines (comprehensive LCA status)

wc -l docs/07-database/current-schema.md
# Expected: ~800+ lines (complete schema with 49 tables)
```

### 4. Search for Specific Content

```bash
# Verify Week 4-8 content exists in chatbot roadmap
grep -c "Week [4-8]" docs/03-features/ai-chatbot/rebuild-roadmap.md
# Expected: 10+ matches

# Verify RAG System section exists
grep -A 5 "## Week 4: RAG System" docs/03-features/ai-chatbot/rebuild-roadmap.md
# Expected: Shows RAG System heading and tasks

# Verify Image Generation section exists
grep -A 5 "## Week 5: Image Generation" docs/03-features/ai-chatbot/rebuild-roadmap.md
# Expected: Shows Image Generation heading and tasks

# Verify Agent System section exists
grep -A 5 "## Week 6: Agent System" docs/03-features/ai-chatbot/rebuild-roadmap.md
# Expected: Shows Agent System heading and tasks
```

---

## Manual Verification Checklist

### ✅ Root Folder Cleanup

- [ ] Only 3 .md files in root: `README.md`, `CLAUDE.md`, `TODO.md`
- [ ] No duplicate .md files (AI_CHATBOT_SETUP.md, etc.)
- [ ] Old `Documentation/` folder removed
- [ ] `references/` folder exists with 2 files + README

### ✅ Documentation Structure

- [ ] `/docs/` folder exists
- [ ] `/docs/README.md` master index exists
- [ ] 10 main sections (01-getting-started through 10-development-tools)
- [ ] `/docs/archive/` contains old files

### ✅ Critical Files Present

#### AI Chatbot
- [ ] `docs/03-features/ai-chatbot/rebuild-roadmap.md` exists
- [ ] Contains Week 1-8 (verified: 3281 lines)
- [ ] Week 4: RAG System section present
- [ ] Week 5: Image Generation section present
- [ ] Week 6: Agent System section present
- [ ] Week 7-8: Optimization & Deployment present

#### LCA
- [ ] `docs/03-features/lca/project-status.md` exists
- [ ] Phase 3.3 components documented
- [ ] Future features documented

#### Database
- [ ] `docs/07-database/current-schema.md` exists (49 tables documented)
- [ ] `docs/07-database/URGENT-MIGRATION-REQUIRED.md` exists
- [ ] Migration guide exists

#### Location Analysis
- [ ] `docs/03-features/location-analysis/scoring-system.md` exists
- [ ] Consolidated scoring (4 files → 1)
- [ ] Primary and secondary scoring documented

#### Testing
- [ ] `docs/08-testing/testing-strategy.md` exists
- [ ] Test infrastructure documented

### ✅ External References

- [ ] `/references/` folder exists
- [ ] `references/CloudFlareR2_Documentation.md` (517 KB)
- [ ] `references/vercelAISDKv5.md` (1.1 MB)
- [ ] `references/README.md` explains purpose

### ✅ Other Folders

- [ ] `/migrations/archive/` contains old migrations
  - [ ] old-core/ (11 files)
  - [ ] old-scripts/ (5 files)
  - [ ] restructure-incomplete/ (27+ files)
- [ ] `/tests/unit/` contains test files
  - [ ] db/projects.test.ts
  - [ ] encryption/messageEncryption.test.ts

---

## Content Verification - AI Chatbot Roadmap

**File**: `docs/03-features/ai-chatbot/rebuild-roadmap.md`

### Week-by-Week Content Check

| Week | Topic | Status | Line Count Check |
|------|-------|--------|------------------|
| Week 1 | Core Chat Infrastructure | ✅ Present | Lines 150-600+ |
| Week 2 | Saved Chats & Chat Lists | ✅ Present | Lines 600-900+ |
| Week 3 | Multi-Modal Support | ✅ Present | Lines 900-1080+ |
| **Week 4** | **RAG System** | ✅ Present | **Lines 1081-1285** |
| **Week 5** | **Image Generation** | ✅ Present | **Lines 1286-1550** |
| **Week 6** | **Agent System** | ✅ Present | **Lines 1551-1850** |
| **Week 7** | **Optimization** | ✅ Present | **Lines 1851-2100** |
| **Week 8** | **Testing & Deployment** | ✅ Present | **Lines 2101-2400** |

### Specific Section Verification

Run these commands to verify each week:

```bash
# Week 4: RAG System
grep -n "## Week 4: RAG System" docs/03-features/ai-chatbot/rebuild-roadmap.md
# Expected: Line 1081

# Week 5: Image Generation
grep -n "## Week 5: Image Generation" docs/03-features/ai-chatbot/rebuild-roadmap.md
# Expected: Line 1286

# Week 6: Agent System
grep -n "## Week 6: Agent System" docs/03-features/ai-chatbot/rebuild-roadmap.md
# Expected: Line 1551

# Week 7-8: Polish & Deployment
grep -n "## Week 7-8:" docs/03-features/ai-chatbot/rebuild-roadmap.md
# Expected: Line 1851+
```

---

## Content Verification - LCA

**File**: `docs/03-features/lca/project-status.md`

### Expected Sections

- [ ] Phase 3.3 Overview
- [ ] Navigation & Shell components
- [ ] Dashboard components
- [ ] Reusable components (MPG Score Badge, etc.)
- [ ] Project Detail tabs (Overzicht, Elementen, Resultaten)
- [ ] Reports & Export
- [ ] Materials Database
- [ ] Templates
- [ ] Settings
- [ ] Future features (NMD, AI-powered, Collaboration)

```bash
# Verify LCA content
grep "Phase 3.3" docs/03-features/lca/project-status.md
grep "MPG Score Badge" docs/03-features/lca/project-status.md
grep "NMD integration" docs/03-features/lca/project-status.md
```

---

## Content Verification - Database

**File**: `docs/07-database/current-schema.md`

### Expected Content

- [ ] 49 tables documented
- [ ] Table comparison (old vs new)
- [ ] Migration strategy
- [ ] Sample queries
- [ ] Foreign key relationships

```bash
# Verify database documentation
wc -l docs/07-database/current-schema.md
# Expected: 800+ lines

# Check table count
grep -c "CREATE TABLE" docs/07-database/current-schema.md
# Expected: 20+ (shows examples of table definitions)

# Check urgent migration exists
ls -lh docs/07-database/URGENT-MIGRATION-REQUIRED.md
# Expected: File exists
```

---

## Automated Verification Script

Create this script to verify everything at once:

**File**: `scripts/verify-docs.sh`

```bash
#!/bin/bash

echo "🔍 Documentation Verification Script"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 - MISSING!"
        ((ERRORS++))
    fi
}

# Function to check folder exists
check_folder() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
    else
        echo -e "${RED}✗${NC} $1/ - MISSING!"
        ((ERRORS++))
    fi
}

# Function to check content
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contains '$2'"
    else
        echo -e "${RED}✗${NC} $1 missing content: '$2'"
        ((ERRORS++))
    fi
}

echo "📁 Checking folder structure..."
check_folder "docs"
check_folder "docs/01-getting-started"
check_folder "docs/03-features/ai-chatbot"
check_folder "docs/03-features/lca"
check_folder "docs/07-database"
check_folder "references"
check_folder "migrations/archive"
check_folder "tests/unit"
echo ""

echo "📄 Checking critical files..."
check_file "README.md"
check_file "CLAUDE.md"
check_file "TODO.md"
check_file "docs/README.md"
check_file "docs/03-features/ai-chatbot/rebuild-roadmap.md"
check_file "docs/03-features/lca/project-status.md"
check_file "docs/07-database/current-schema.md"
check_file "docs/07-database/URGENT-MIGRATION-REQUIRED.md"
check_file "references/CloudFlareR2_Documentation.md"
check_file "references/vercelAISDKv5.md"
echo ""

echo "🔎 Checking AI Chatbot Roadmap content..."
check_content "docs/03-features/ai-chatbot/rebuild-roadmap.md" "Week 4: RAG System"
check_content "docs/03-features/ai-chatbot/rebuild-roadmap.md" "Week 5: Image Generation"
check_content "docs/03-features/ai-chatbot/rebuild-roadmap.md" "Week 6: Agent System"
check_content "docs/03-features/ai-chatbot/rebuild-roadmap.md" "Week 7"
check_content "docs/03-features/ai-chatbot/rebuild-roadmap.md" "Week 8"
echo ""

echo "🏢 Checking LCA content..."
check_content "docs/03-features/lca/project-status.md" "Phase 3.3"
check_content "docs/03-features/lca/project-status.md" "MPG Score Badge"
echo ""

echo "🗄️ Checking Database content..."
check_content "docs/07-database/current-schema.md" "49 tables"
check_content "docs/07-database/URGENT-MIGRATION-REQUIRED.md" "CRITICAL"
echo ""

echo "===================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo "Documentation is complete and properly organized."
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found!${NC}"
    echo "Some documentation may be missing or incomplete."
    exit 1
fi
```

---

## How to Use This Checklist

### Option 1: Manual Verification (5 minutes)

1. Open this file
2. Run each command in the "Quick Verification Commands" section
3. Check off items in the "Manual Verification Checklist"

### Option 2: Automated Verification (30 seconds)

```bash
# Create the script
nano scripts/verify-docs.sh
# Paste the script content above
# Save and exit (Ctrl+X, Y, Enter)

# Make executable
chmod +x scripts/verify-docs.sh

# Run verification
./scripts/verify-docs.sh
```

### Option 3: Quick Spot Check (1 minute)

```bash
# Just verify the files you're concerned about
grep -c "Week [4-8]" docs/03-features/ai-chatbot/rebuild-roadmap.md
# Should return 10+ matches

# Check file size
du -h docs/03-features/ai-chatbot/rebuild-roadmap.md
# Should be ~106K (large file with all content)
```

---

## If Content Is Missing

If any checks fail:

1. **Check git history**:
   ```bash
   git log --all --full-history -- "*CHATBOT_REBUILD_ROADMAP.md"
   ```

2. **Restore from git** (if needed):
   ```bash
   git checkout <commit-hash> -- <file-path>
   ```

3. **Check archive**:
   ```bash
   ls docs/archive/
   ```

---

## Confidence Indicators

✅ **You can be confident documentation is complete if**:
- All 10 docs/ folders exist
- rebuild-roadmap.md has 3281 lines
- Week 4-8 searches return results
- references/ folder has 2 files
- TODO.md has ~150 items organized by feature

❌ **Red flags (investigate further)**:
- Any .md files still in root (except README, CLAUDE, TODO)
- rebuild-roadmap.md < 3000 lines
- Week 4-8 searches return no results
- Missing critical files from checklist

---

**Last Verified**: 2025-12-08
**Verification Script**: `scripts/verify-docs.sh`
**Documentation Root**: `/docs/README.md`
