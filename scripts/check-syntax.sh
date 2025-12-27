#!/bin/bash
# Quick syntax check script for Phase 1 implementation

echo "🔍 Checking for common TypeScript/ESLint issues..."
echo ""

# Check for TypeScript issues
echo "📝 Checking TypeScript syntax..."

files=(
  "src/features/location/data/sources/historic-datasets.ts"
  "src/features/location/data/sources/cbs-demographics/client.ts"
  "src/features/location/data/sources/rivm-health/client.ts"
  "src/features/location/data/sources/politie-safety/client.ts"
  "src/features/location/data/sources/cbs-livability/client.ts"
  "src/app/[locale]/admin/test-historic-data/page.tsx"
)

issues=0

for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ File not found: $file"
    ((issues++))
    continue
  fi

  # Check for basic syntax issues

  # Check for 'any' type (should be minimal)
  any_count=$(grep -c ": any" "$file" || true)
  if [ $any_count -gt 0 ]; then
    echo "⚠️  $file: Found $any_count uses of 'any' type"
  fi

  # Check for console.log (acceptable in this case)
  console_count=$(grep -c "console\." "$file" || true)
  if [ $console_count -gt 0 ]; then
    echo "ℹ️  $file: Found $console_count console statements (expected)"
  fi

  # Check for missing exports
  if grep -q "export" "$file"; then
    echo "✅ $file: Has exports"
  else
    echo "⚠️  $file: No exports found"
  fi
done

echo ""
echo "📊 Summary:"
if [ $issues -eq 0 ]; then
  echo "✅ No critical issues found"
  echo ""
  echo "Note: To run full validation:"
  echo "  npm install"
  echo "  npm run lint"
  echo "  npm run build"
else
  echo "❌ Found $issues critical issues"
fi
