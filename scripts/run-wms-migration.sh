#!/bin/bash

# Run WMS Grading Data Migration
# This script adds the wms_grading_data column to the location_snapshots table

set -e

echo "=================================="
echo "WMS Grading Data Migration"
echo "=================================="
echo ""

# Check if POSTGRES_URL is set
if [ -z "$POSTGRES_URL" ]; then
  echo "❌ Error: POSTGRES_URL environment variable is not set"
  echo ""
  echo "Please set your database URL:"
  echo "  export POSTGRES_URL='your_postgres_url_here'"
  echo ""
  echo "Or run with:"
  echo "  POSTGRES_URL='your_url' ./scripts/run-wms-migration.sh"
  exit 1
fi

echo "✓ Database URL found"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
  echo "❌ Error: psql is not installed"
  echo ""
  echo "Install PostgreSQL client:"
  echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
  echo "  macOS: brew install postgresql"
  exit 1
fi

echo "✓ psql is installed"
echo ""

# Run migration
echo "Running migration: 013_add_wms_grading_data.sql"
echo ""

psql "$POSTGRES_URL" -f src/lib/db/migrations/013_add_wms_grading_data.sql

echo ""
echo "=================================="
echo "✅ Migration Complete!"
echo "=================================="
echo ""
echo "The wms_grading_data column has been added to location_snapshots."
echo ""
echo "Next steps:"
echo "1. Test the WMS grading API:"
echo "   curl -X POST http://localhost:3000/api/location/wms-grading \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"latitude\":52.0907,\"longitude\":5.1214,\"address\":\"Utrecht\"}'"
echo ""
echo "2. Grade an existing location snapshot:"
echo "   curl -X POST http://localhost:3000/api/location/snapshots/{id}/grade-wms"
echo ""
echo "3. Read the documentation:"
echo "   docs/03-features/location-analysis/wms-grading-system.md"
echo ""
