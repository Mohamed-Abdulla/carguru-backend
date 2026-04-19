#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# CarGuru — Recommendation API Test Suite
# Tests all filter combinations to ensure hard filters are correctly enforced.
# Usage: chmod +x test_recommendations.sh && ./test_recommendations.sh
# ─────────────────────────────────────────────────────────────────────────────

BASE="http://localhost:3003/api/recommendations"
PASS=0
FAIL=0

run_test() {
  local name="$1"
  local body="$2"
  local check_fn="$3"
  local expected_desc="$4"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 TEST: $name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  response=$(curl -s -X POST "$BASE" \
    -H "Content-Type: application/json" \
    -d "$body")

  echo "  Request : $body"
  echo "  Expected: $expected_desc"

  # Extract useful info
  count=$(echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
recs = d.get('data', {}).get('recommendations', [])
print(len(recs))
" 2>/dev/null)

  prices=$(echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
recs = d.get('data', {}).get('recommendations', [])
for r in recs:
    print(f'  ₹{r[\"car\"][\"price_lakh\"]}L  {r[\"car\"][\"make\"]} {r[\"car\"][\"model\"]}  score={r[\"match_score\"]}')
" 2>/dev/null)

  echo "  Results ($count cars):"
  echo "$prices"

  # Run the assertion
  result=$(echo "$response" | python3 -c "$check_fn" 2>&1)
  if [ "$result" = "PASS" ]; then
    echo "  ✅ PASSED"
    ((PASS++))
  else
    echo "  ❌ FAILED: $result"
    ((FAIL++))
  fi
}

# ─── TEST 1: Budget Max Hard Filter ──────────────────────────────────────────
run_test "budget_max=7.5 — no car above 7.5L" \
  '{"budget_max": 7.5, "top_n": 10}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
violations=[r for r in recs if r["car"]["price_lakh"]>7.5]
print("PASS" if not violations else f"FAIL: cars above budget: {[r[\"car\"][\"price_lakh\"] for r in violations]}")' \
  "No car should have price_lakh > 7.5"

# ─── TEST 2: Budget Max very low ─────────────────────────────────────────────
run_test "budget_max=4 — no car above 4L (likely 0 results)" \
  '{"budget_max": 4, "top_n": 6}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
violations=[r for r in recs if r["car"]["price_lakh"]>4]
print("PASS" if not violations else f"FAIL: cars above budget: {[r[\"car\"][\"price_lakh\"] for r in violations]}")' \
  "No car should have price_lakh > 4"

# ─── TEST 3: Budget Min Hard Filter ──────────────────────────────────────────
run_test "budget_min=15 budget_max=25 — no car below 15L" \
  '{"budget_min": 15, "budget_max": 25, "top_n": 6}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
violations=[r for r in recs if r["car"]["price_lakh"]<15 or r["car"]["price_lakh"]>25]
print("PASS" if not violations else f"FAIL: out-of-range prices: {[r[\"car\"][\"price_lakh\"] for r in violations]}")' \
  "All cars must be between 15L and 25L"

# ─── TEST 4: Fuel Type Hard Filter ───────────────────────────────────────────
run_test "fuel_type=Electric — only electric cars" \
  '{"budget_max": 50, "fuel_type": ["Electric"], "top_n": 6}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
violations=[r for r in recs if r["car"]["fuel_type"].lower()!="electric"]
print("PASS" if not violations else f"FAIL: non-electric cars: {[r[\"car\"][\"fuel_type\"] for r in violations]}")' \
  "Only Electric cars"

# ─── TEST 5: Fuel Type Multi ─────────────────────────────────────────────────
run_test "fuel_type=[Petrol, Diesel] — no electric/hybrid/cng" \
  '{"budget_max": 30, "fuel_type": ["Petrol", "Diesel"], "top_n": 6}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
allowed={"petrol","diesel"}
violations=[r for r in recs if r["car"]["fuel_type"].lower() not in allowed]
print("PASS" if not violations else f"FAIL: wrong fuel types: {[r[\"car\"][\"fuel_type\"] for r in violations]}")' \
  "Only Petrol or Diesel cars"

# ─── TEST 6: Body Type Hard Filter ───────────────────────────────────────────
run_test "body_type=SUV — only SUVs" \
  '{"budget_max": 30, "body_type": ["SUV"], "top_n": 6}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
violations=[r for r in recs if r["car"]["body_type"].lower()!="suv"]
print("PASS" if not violations else f"FAIL: non-SUV cars: {[r[\"car\"][\"body_type\"] for r in violations]}")' \
  "Only SUV body type"

# ─── TEST 7: Body Type Multi ─────────────────────────────────────────────────
run_test "body_type=[Hatchback, Sedan] — no SUVs or MPVs" \
  '{"budget_max": 20, "body_type": ["Hatchback", "Sedan"], "top_n": 6}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
allowed={"hatchback","sedan"}
violations=[r for r in recs if r["car"]["body_type"].lower() not in allowed]
print("PASS" if not violations else f"FAIL: wrong body types: {[r[\"car\"][\"body_type\"] for r in violations]}")' \
  "Only Hatchback or Sedan"

# ─── TEST 8: Seats Hard Filter ───────────────────────────────────────────────
run_test "seats=7 — only 7+ seaters" \
  '{"budget_max": 40, "seats": 7, "top_n": 6}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
violations=[r for r in recs if r["car"]["seats"]<7]
print("PASS" if not violations else f"FAIL: cars with <7 seats: {[r[\"car\"][\"seats\"] for r in violations]}")' \
  "All cars must have 7 or more seats"

# ─── TEST 9: Transmission Hard Filter ────────────────────────────────────────
run_test "transmission=Automatic — only automatics" \
  '{"budget_max": 30, "transmission": "Automatic", "top_n": 6}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
violations=[r for r in recs if r["car"]["transmission"].lower()!="automatic"]
print("PASS" if not violations else f"FAIL: non-automatic cars: {[r[\"car\"][\"transmission\"] for r in violations]}")' \
  "Only Automatic transmission cars"

# ─── TEST 10: All Filters Combined ───────────────────────────────────────────
run_test "ALL FILTERS — budget 10-20L, Petrol, SUV, 5 seats, Manual" \
  '{"budget_min": 10, "budget_max": 20, "fuel_type": ["Petrol"], "body_type": ["SUV"], "seats": 5, "transmission": "Manual", "top_n": 6}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
violations=[]
for r in recs:
  c=r["car"]
  if c["price_lakh"]<10 or c["price_lakh"]>20: violations.append(f"price={c[\"price_lakh\"]}")
  if c["fuel_type"].lower()!="petrol": violations.append(f"fuel={c[\"fuel_type\"]}")
  if c["body_type"].lower()!="suv": violations.append(f"body={c[\"body_type\"]}")
  if c["seats"]<5: violations.append(f"seats={c[\"seats\"]}")
  if c["transmission"].lower()!="manual": violations.append(f"trans={c[\"transmission\"]}")
print("PASS" if not violations else f"FAIL: {violations}")' \
  "Only Petrol SUVs, 10-20L, ≥5 seats, Manual"

# ─── TEST 11: Priorities without conflict ─────────────────────────────────────
run_test "priorities=[safety, mileage] with budget_max=20" \
  '{"budget_max": 20, "priorities": ["safety", "mileage"], "top_n": 6}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
violations=[r for r in recs if r["car"]["price_lakh"]>20]
print("PASS" if not violations else f"FAIL: cars above budget: {[r[\"car\"][\"price_lakh\"] for r in violations]}")' \
  "Budget still strictly enforced with priority hints"

# ─── TEST 12: Use case filter (soft — should not disqualify but rank) ─────────
run_test "use_case=city — top results should match city use" \
  '{"budget_max": 15, "use_case": ["city"], "top_n": 6}' \
  'import sys,json
d=json.load(sys.stdin)
recs=d.get("data",{}).get("recommendations",[])
violations=[r for r in recs if r["car"]["price_lakh"]>15]
print("PASS" if not violations else f"FAIL: cars above budget: {[r[\"car\"][\"price_lakh\"] for r in violations]}")' \
  "Budget enforced; city-suitable cars ranked higher"

# ─── SUMMARY ─────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULTS: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
