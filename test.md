# Testing Guide - Prover API Fix (Issue #53)

This guide shows you how to test all the improvements made to fix the Prover API reliability issues.

---

## Prerequisites

Ensure the backend is running:
```bash
cd backend
RUST_LOG=debug cargo run
```

---

## Test 1: Health Check Endpoints ✅

**Purpose:** Verify the health monitoring system works

### Overall System Health
```bash
curl -s http://localhost:3001/api/health | python3 -m json.tool
```

**Expected output:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2026-01-02T20:05:12+00:00",
  "prover_api": {
    "url": "https://v8.charms.dev/spells/prove",
    "reachable": true,
    "latency_ms": 961,
    "error": null
  },
  "mock_mode": true
}
```

### Prover API Status Only
```bash
curl -s http://localhost:3001/api/health/prover | python3 -m json.tool
```

**Expected output:**
```json
{
  "url": "https://v8.charms.dev/spells/prove",
  "reachable": true,
  "latency_ms": 456,
  "error": null
}
```

**Success criteria:**
- ✅ `"reachable": true`
- ✅ `latency_ms` shows response time (typically 400-1000ms)
- ✅ `"error": null`

---

## Test 2: Environment Validation ✅

**Purpose:** Verify configuration is displayed on startup

### View Startup Logs

Check the terminal where the backend is running. You should see:

```
=== Environment Validation ===
✅ Prover API URL: https://v8.charms.dev/spells/prove
⚠️  Mock mode: ENABLED (Prover API will not be called)
⚠️  SWAP_APP_BINARY_PATH not set (using defaults)
⚠️  SWAP_APP_VK not set (using default)
✅ Bitcoin RPC: http://127.0.0.1:48332
✅ Server port: 3001
=== Validation Complete ===
```

**Success criteria:**
- ✅ All config variables are displayed
- ✅ Emoji indicators (✅/⚠️) show status clearly
- ✅ Mock mode status is shown

---

## Test 3: Unit Tests ✅

**Purpose:** Verify spell validation and helper methods work correctly

```bash
cd backend
cargo test
```

**Expected output:**
```
running 6 tests
test services::charms::tests::test_is_mock_mode ... ok
test services::charms::tests::test_api_url ... ok
test services::charms::tests::test_build_spell ... ok
test services::charms::tests::test_validate_spell_missing_version ... ok
test services::charms::tests::test_validate_spell_valid ... ok
test services::charms::tests::test_validate_spell_invalid_yaml ... ok

test result: ok. 6 passed; 0 failed; 0 ignored; 0 measured
```

**Success criteria:**
- ✅ All 6 tests pass
- ✅ No compilation errors

---

## Test 4: Mock Mode Testing ✅

**Purpose:** Verify mock mode returns transactions without calling Prover API

### Make a Spell Prove Request

```bash
curl -X POST http://localhost:3001/api/spells/prove \
  -H "Content-Type: application/json" \
  -d '{
    "spell_yaml": "version: 8\nstate: []\nclauses: []",
    "app_binary": "",
    "prev_txs": [],
    "funding_utxo": "test:0",
    "funding_utxo_value": 10000,
    "change_address": "tb1qtest",
    "fee_rate": 10.0
  }'
```

**Expected behavior:**
- Returns mock transactions immediately
- No actual API call to Prover API
- Response includes `"success": true` and mock transaction data

**Check logs** - You should see:
```
🔧 Mock mode: returning simulated transaction
```

**Success criteria:**
- ✅ Response received quickly (<100ms)
- ✅ Mock transaction returned
- ✅ No Prover API calls in logs

---

## Test 5: Real Prover API with Retry Logic 🚀

**Purpose:** Test retry mechanism and real API integration

### Step 1: Stop Backend
Press `Ctrl+C` in the terminal where backend is running

### Step 2: Restart with Mock Mode Disabled
```bash
cd backend
MOCK_MODE=false RUST_LOG=debug cargo run
```

### Step 3: Make API Request
```bash
curl -X POST http://localhost:3001/api/spells/prove \
  -H "Content-Type: application/json" \
  -d '{
    "spell_yaml": "version: 8\nstate: []\nclauses: []",
    "app_binary": "",
    "prev_txs": [],
    "funding_utxo": "test:0",
    "funding_utxo_value": 10000,
    "change_address": "tb1qtest",
    "fee_rate": 10.0
  }'
```

### Step 4: Watch the Logs

**If API call succeeds:**
```
=== Prover API Request ===
API URL: https://v8.charms.dev/spells/prove
🔄 Prover API attempt 1/3
📡 Response status: 200 OK
📄 Raw response body: [...]
✅ Successfully received 2 transaction(s) from prover
```

**If API call fails (to test retry):**
```
🔄 Prover API attempt 1/3
❌ Request failed: connection timeout
⏳ Retrying in 2s...
🔄 Prover API attempt 2/3
❌ HTTP error 503: Service Unavailable
⏳ Retrying in 4s...
🔄 Prover API attempt 3/3
❌ Request failed: ...
```

**Success criteria:**
- ✅ See detailed emoji-based logging
- ✅ Retry attempts shown if API fails
- ✅ Exponential backoff delays (2s → 4s → 8s)
- ✅ Transaction data received on success

---

## Test 6: Spell Validation Tests

**Purpose:** Verify spell validation catches errors

### Run Validation-Specific Tests
```bash
cd backend
cargo test test_validate
```

**Expected output:**
```
running 3 tests
test services::charms::tests::test_validate_spell_valid ... ok
test services::charms::tests::test_validate_spell_invalid_yaml ... ok
test services::charms::tests::test_validate_spell_missing_version ... ok

test result: ok. 3 passed; 0 failed; 0 ignored
```

**Success criteria:**
- ✅ Valid spells pass validation
- ✅ Invalid YAML is rejected
- ✅ Missing version field is caught

---

## Quick Verification Checklist

Run these commands in sequence for a complete test:

```bash
# 1. Start backend (in one terminal)
cd backend
RUST_LOG=debug cargo run

# 2. In another terminal, test health checks
curl http://localhost:3001/api/health
curl http://localhost:3001/api/health/prover

# 3. Run unit tests
cd backend
cargo test

# 4. Test with mock mode (backend already running)
curl -X POST http://localhost:3001/api/spells/prove \
  -H "Content-Type: application/json" \
  -d '{"spell_yaml":"version: 8\nstate: []","app_binary":"","prev_txs":[],"funding_utxo":"test:0","funding_utxo_value":10000,"change_address":"tb1qtest","fee_rate":10.0}'
```

---

## Expected Results Summary

| Test | Expected Result |
|------|----------------|
| Health Check | ✅ API reachable, latency shown |
| Environment Validation | ✅ Config displayed with emoji indicators |
| Unit Tests | ✅ 6/6 tests pass |
| Mock Mode | ✅ Returns mock transactions instantly |
| Real API | ✅ Retry logic with detailed logs |
| Spell Validation | ✅ Invalid spells rejected |

---

## Troubleshooting

### Health check shows Prover API unreachable
- Check internet connection
- Verify firewall isn't blocking `v8.charms.dev`
- API may be temporarily down (check with maintainers)

### Tests fail
- Ensure you're in the `backend` directory
- Run `cargo clean` and `cargo build` to rebuild
- Check Rust version: `rustc --version` (should be 1.70+)

### Server won't start
- Port 3001 may be in use: `lsof -i :3001`
- Check `.env` file exists in `backend/` directory
- Verify all dependencies: `cargo check`

---

## Monitoring in Production

For production deployments, set up monitoring for:

1. **Health endpoint**: Poll `/api/health/prover` every 60 seconds
2. **Metrics to track**:
   - Prover API latency
   - Success/failure rates
   - Retry counts
3. **Alerts**:
   - Alert if `reachable: false` for > 5 minutes
   - Alert if latency > 5000ms consistently
   - Alert if failure rate > 50%

---

## Next Steps

After all tests pass:
1. Deploy to staging environment
2. Monitor health check endpoints
3. Review logs for any unexpected errors
4. Test with real user flows
5. Monitor Prover API success rates
