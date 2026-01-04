# Automated Test Script

## Quick Start

Run all tests with one command:

```bash
./script.sh
```

## What It Tests

1. ✅ **Backend Status** - Checks if backend is running
2. ✅ **System Health** - Tests `/api/health` endpoint
3. ✅ **Prover API Health** - Tests `/api/health/prover` endpoint
4. ✅ **Unit Tests** - Runs all cargo tests
5. ✅ **Spell Prove Endpoint** - Tests mock mode functionality
6. ⚠️ **Environment Validation** - Manual check reminder

## Prerequisites

- Backend must be running on port 3001
- Python 3 installed (for JSON parsing)

## Output

The script provides:
- 🟢 Green checkmarks for passed tests
- 🔴 Red X marks for failed tests
- 🟡 Yellow warnings for manual checks
- Clear summary at the end

## Example Output

```
╔════════════════════════════════════════╗
║   ✅ ALL TESTS PASSED! 🎉            ║
╔════════════════════════════════════════╗

Total Tests Run:    6
Tests Passed:       6
Tests Failed:       0
```

## Troubleshooting

**If backend is not running:**
```bash
cd backend
RUST_LOG=debug cargo run
```

**To make script executable:**
```bash
chmod +x script.sh
```
