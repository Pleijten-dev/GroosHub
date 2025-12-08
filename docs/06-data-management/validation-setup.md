# Data Validation Setup Guide

## Overview

This project has automated data integrity validation to ensure all JSON files remain consistent and error-free. The validation runs at **three levels**:

1. **Local Development** - Manual validation
2. **Pre-commit Hook** - Automatic validation before every commit
3. **CI/CD Pipeline** - Automatic validation on GitHub

---

## 🔍 What Gets Validated

The validation script checks:

✅ **Property Type Mappings** - All `typology_ids` exist in housing-typologies.json
✅ **Persona Housing Preferences** - All `desired_property_types` exist in property-type-mapping.json
✅ **Communal Spaces Target Groups** - All `target_groups` match persona names
✅ **Public Spaces Target Groups** - All `target_groups` match persona names
✅ **Locale Consistency** - Dutch and English versions have matching IDs

**Master Source of Truth:** `housing-personas.json`

All persona names in other files MUST exactly match names from this file.

---

## 🚀 Setup (First Time)

### 1. Install Git Hooks

After cloning the repository, run:

```bash
npm run setup:hooks
```

This installs the pre-commit hook that validates data before every commit.

### 2. Verify Setup

```bash
npm run validate:data
```

You should see:
```
✓ All validations passed! Data integrity is intact.
```

---

## 💻 Daily Workflow

### Running Validation Manually

```bash
npm run validate:data
```

### When You Make Changes to JSON Files

1. Edit your JSON files as needed
2. Try to commit:
   ```bash
   git add .
   git commit -m "Update personas"
   ```
3. **Validation runs automatically!**
   - ✅ If valid: Commit succeeds
   - ❌ If errors: Commit is blocked with detailed error messages

### If Validation Fails

**For Persona Name Mismatches:**

Run the auto-fix script:
```bash
npx tsx scripts/fix-persona-names.ts
```

Then try committing again.

**For Other Errors:**

Read the error messages carefully and fix the issues manually, then try again.

---

## 🔧 Available Commands

| Command | Description |
|---------|-------------|
| `npm run validate:data` | Run validation manually |
| `npm run setup:hooks` | Install git pre-commit hook |
| `npx tsx scripts/fix-persona-names.ts` | Auto-fix persona name mismatches |

---

## 🤖 How It Works

### Level 1: Manual Validation

Run anytime during development:
```bash
npm run validate:data
```

### Level 2: Pre-commit Hook

**Location:** `.git/hooks/pre-commit`

**Trigger:** Runs automatically before every `git commit`

**Behavior:**
- ✅ Commit succeeds if validation passes
- ❌ Commit is blocked if errors found
- ⚠️ Warnings are shown but don't block commits

**Example blocked commit:**
```
🔍 Running data integrity validation...

✗ [Persona Housing] Invalid desired_property_type in persona
  Persona "Zelfstandige Senior" desires "Middensegment 2-kamer grondgebonden woning"
  which doesn't exist in property-type-mapping.json

❌ Commit blocked: Data validation failed!

Please fix the errors above before committing.
```

### Level 3: CI/CD Pipeline

**Location:** `.github/workflows/validate-data.yml`

**Trigger:**
- Push to `main`, `master`, or `claude/**` branches
- Pull requests
- Changes to JSON files in `src/features/location/data/sources/`

**Behavior:**
- Runs `npm run validate:data` in GitHub Actions
- ❌ Pull requests fail if validation errors found
- ✅ Green checkmark if all validations pass

**GitHub Status Check:**
You'll see "Data Integrity Validation" in your PR checks.

---

## 🎯 Benefits

### 1. **Catches Errors Early**
- Before code review
- Before merging
- Before production

### 2. **Consistent Data**
- All persona names match across files
- No broken references
- No typos slip through

### 3. **Developer Confidence**
- Know immediately if changes break data integrity
- Auto-fix tools for common issues
- Clear error messages

### 4. **Team Collaboration**
- Prevents colleagues from committing bad data
- Automatic checks on every PR
- Shared validation rules

---

## 📝 Validation Rules

### Error vs Warning

**Errors (Block Commits):**
- Missing typology_ids in property-type-mapping
- Persona references non-existent housing types
- Locale count mismatches (nl vs en)

**Warnings (Don't Block):**
- Persona names don't exactly match (typos, singular/plural)
- Example: "Jonge Starter" vs "Jonge Starters"

### Why Warnings Don't Block

Warnings indicate naming inconsistencies that should be fixed but won't break functionality. They're shown for awareness but allow commits to proceed.

---

## 🛠️ Troubleshooting

### "Pre-commit hook not running"

Reinstall hooks:
```bash
npm run setup:hooks
```

### "Validation passes locally but fails in CI/CD"

Ensure you've committed all changes:
```bash
git status
git add .
git commit -m "Your message"
```

### "How do I skip the pre-commit hook?"

**Not recommended**, but if absolutely necessary:
```bash
git commit --no-verify -m "Your message"
```

⚠️ **Warning:** This bypasses validation and may introduce data errors!

### "Validation is slow"

The validation typically takes 2-3 seconds. If it's slower:
- Check if `node_modules` needs reinstalling
- Run `npm ci` to get fresh dependencies

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `scripts/validate-data-integrity.ts` | Main validation script |
| `scripts/fix-persona-names.ts` | Auto-fix for name mismatches |
| `scripts/install-git-hooks.sh` | Installs pre-commit hook |
| `.git/hooks/pre-commit` | Git hook (not in version control) |
| `.github/workflows/validate-data.yml` | CI/CD workflow |
| `DATA_VALIDATION_RESULTS.md` | Detailed validation findings |
| `JSON_DATA_FILES_INVENTORY.md` | Complete JSON file catalog |

---

## 🎓 For New Team Members

1. Clone the repository
2. Run `npm install`
3. Run `npm run setup:hooks`
4. Make a test change and try to commit
5. Watch the validation run automatically!

---

## 🔄 Updating Validation Rules

To add new validation checks:

1. Edit `scripts/validate-data-integrity.ts`
2. Add your validation function
3. Call it from `main()`
4. Test with `npm run validate:data`
5. Commit your changes

The pre-commit hook and CI/CD will automatically use the updated rules.

---

## ✅ Best Practices

1. **Run validation before committing:**
   ```bash
   npm run validate:data
   ```

2. **Fix errors immediately:**
   - Don't accumulate validation errors
   - Use auto-fix tools when available

3. **Check CI/CD status:**
   - Look for green checkmarks on PRs
   - Fix issues before requesting review

4. **Keep housing-personas.json as master:**
   - This is the source of truth
   - Update other files to match, not vice versa

---

## 📞 Questions?

If you encounter issues not covered here:
1. Check `DATA_VALIDATION_RESULTS.md` for detailed findings
2. Run `npm run validate:data` for specific error messages
3. Review the validation script: `scripts/validate-data-integrity.ts`

---

**Last Updated:** 2025-11-21
**Validation System Version:** 1.0
