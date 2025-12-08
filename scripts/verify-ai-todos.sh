#!/bin/bash
# Verify that TODO.md contains all AI Assistant features from rebuild-roadmap.md
# Usage: bash scripts/verify-ai-todos.sh

set -e

echo "🔍 Verifying AI Assistant TODO completeness..."
echo ""

# Define expected sections from rebuild-roadmap.md Week 4-8
declare -a sections=(
  "RAG System"
  "Image Generation"
  "Agent System"
  "Optimization"
  "Advanced Features"
  "Testing"
  "Documentation"
  "Deployment"
)

missing=0
found=0

# Check each section
for section in "${sections[@]}"; do
  if grep -qi "$section" TODO.md; then
    echo "✅ $section"
    ((found++))
  else
    echo "❌ MISSING: $section"
    ((missing++))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $found found, $missing missing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Detailed verification
echo ""
echo "📊 Detailed Feature Count:"
echo ""

# Count RAG features
rag_count=$(sed -n '/### 🔥 HIGH: RAG System/,/### 🔥 HIGH: Image Generation/p' TODO.md | grep -c "^\- \[ \]" || true)
echo "  RAG System (Week 4): $rag_count tasks"

# Count Image Generation features
img_count=$(sed -n '/### 🔥 HIGH: Image Generation/,/### 🔥 HIGH: Agent System/p' TODO.md | grep -c "^\- \[ \]" || true)
echo "  Image Generation (Week 5): $img_count tasks"

# Count Agent System features
agent_count=$(sed -n '/### 🔥 HIGH: Agent System/,/### 🔥 HIGH: UI Improvements/p' TODO.md | grep -c "^\- \[ \]" || true)
echo "  Agent System (Week 6): $agent_count tasks"

# Count Performance features
perf_count=$(sed -n '/### ⚙️ MEDIUM: Performance Optimization/,/### ⚙️ MEDIUM: Voice Input/p' TODO.md | grep -c "^\- \[ \]" || true)
echo "  Performance Optimization (Week 7): $perf_count tasks"

# Count Testing features
test_count=$(sed -n '/### ⚙️ MEDIUM: Testing \(Week 8\)/,/### ⚙️ MEDIUM: Documentation/p' TODO.md | grep -c "^\- \[ \]" || true)
echo "  Testing (Week 8): $test_count tasks"

# Count Documentation features
doc_count=$(sed -n '/### ⚙️ MEDIUM: Documentation/,/### ⚙️ MEDIUM: Deployment/p' TODO.md | grep -c "^\- \[ \]" || true)
echo "  Documentation (Week 8): $doc_count tasks"

# Count Deployment features
deploy_count=$(sed -n '/### ⚙️ MEDIUM: Deployment & Monitoring/,/^---$/p' TODO.md | grep -c "^\- \[ \]" || true)
echo "  Deployment & Monitoring (Week 8): $deploy_count tasks"

total=$((rag_count + img_count + agent_count + perf_count + test_count + doc_count + deploy_count))
echo ""
echo "  TOTAL AI ASSISTANT TASKS: $total"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $missing -eq 0 ]; then
  echo "✅ VERIFICATION PASSED - All sections present!"
  exit 0
else
  echo "❌ VERIFICATION FAILED - $missing sections missing"
  echo ""
  echo "Please review:"
  echo "  - docs/03-features/ai-chatbot/rebuild-roadmap.md"
  echo "  - docs/AI-ASSISTANT-TODO-VERIFICATION.md"
  exit 1
fi
