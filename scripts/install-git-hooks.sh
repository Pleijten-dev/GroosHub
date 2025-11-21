#!/bin/bash
# Install git hooks for the project
# Run this after cloning the repository: npm run setup:hooks

echo "Installing git hooks..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
# Pre-commit hook to validate data integrity
# Prevents commits if JSON data has integrity errors

echo "🔍 Running data integrity validation..."

# Run the validation script
npm run validate:data

# Capture exit code
VALIDATION_EXIT_CODE=$?

if [ $VALIDATION_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Commit blocked: Data validation failed!"
  echo ""
  echo "Please fix the errors above before committing."
  echo "You can run 'npm run validate:data' to see the issues."
  echo ""
  echo "To fix persona name mismatches, run:"
  echo "  npx tsx scripts/fix-persona-names.ts"
  echo ""
  exit 1
fi

echo "✅ Data validation passed!"
exit 0
EOF

# Make hook executable
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks installed successfully!"
echo ""
echo "Pre-commit hook will now:"
echo "  • Validate data integrity before every commit"
echo "  • Block commits if errors are found"
echo "  • Allow commits with warnings (but show them)"
echo ""
echo "To test: Try making a commit - validation will run automatically"
