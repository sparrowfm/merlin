#!/bin/bash
# Phase 1.4: Test filter file approach for long filter strings

echo "=== Phase 1.4: Long Filter String Tests ==="
echo ""

# Test 1: Generate filter for 20 words (moderate length)
echo "Test 1: 20-word filter (~10KB)"
FILTER=""
for i in {0..19}; do
    START=$(echo "scale=2; $i * 0.5" | bc)
    END=$(echo "scale=2; ($i + 1) * 0.5" | bc)
    FILTER="${FILTER}drawtext=text='Word${i}':font='Arial':fontsize=32:fontcolor=ffffff@1.0:box=1:boxcolor=000000cc:boxborderw=8:x=(w-200)/2:y=h*0.85:enable=between(t\\,${START}\\,${END}),"
done
FILTER="${FILTER%,}" # Remove trailing comma
echo "$FILTER" > tests/filter-20words.txt
echo "Filter size: $(wc -c < tests/filter-20words.txt) bytes"

ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=10 \
  -filter_complex_script tests/filter-20words.txt \
  -t 10 -y tests/long1-20words.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 2: Generate filter for 50 words (realistic transcript)
echo -e "\nTest 2: 50-word filter (~25KB)"
FILTER=""
for i in {0..49}; do
    START=$(echo "scale=2; $i * 0.4" | bc)
    END=$(echo "scale=2; ($i + 1) * 0.4" | bc)
    FILTER="${FILTER}drawtext=text='Word${i}':font='Comic\ Sans\ MS':fontsize=36:fontcolor=ffffff@1.0:box=1:boxcolor=000000bf:boxborderw=8:x=(w-220)/2:y=h*0.85:enable=between(t\\,${START}\\,${END}),"
done
FILTER="${FILTER%,}"
echo "$FILTER" > tests/filter-50words.txt
echo "Filter size: $(wc -c < tests/filter-50words.txt) bytes"

ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=20 \
  -filter_complex_script tests/filter-50words.txt \
  -t 20 -y tests/long2-50words.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 3: Generate filter for 100 words (stress test)
echo -e "\nTest 3: 100-word filter (~50KB, stress test)"
FILTER=""
for i in {0..99}; do
    START=$(echo "scale=2; $i * 0.3" | bc)
    END=$(echo "scale=2; ($i + 1) * 0.3" | bc)
    FILTER="${FILTER}drawtext=text='W${i}':font='Verdana':fontsize=32:fontcolor=ffffff@1.0:x=(w-100)/2:y=h*0.85:enable=between(t\\,${START}\\,${END}),"
done
FILTER="${FILTER%,}"
echo "$FILTER" > tests/filter-100words.txt
echo "Filter size: $(wc -c < tests/filter-100words.txt) bytes"

ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=30 \
  -filter_complex_script tests/filter-100words.txt \
  -t 30 -y tests/long3-100words.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

echo -e "\n=== Results ==="
ls -lh tests/long*.mp4 2>/dev/null | awk '{if ($5 != "0") print "✓", $9, "(" $5 ")"; else print "✗", $9, "(FAILED)"}'

# Count successes
SUCCESS_COUNT=$(ls -l tests/long*.mp4 2>/dev/null | awk '$5 > 0' | wc -l | tr -d ' ')
TOTAL_COUNT=$(ls tests/long*.mp4 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "Passed: $SUCCESS_COUNT / $TOTAL_COUNT"

if [ "$SUCCESS_COUNT" -eq "$TOTAL_COUNT" ] && [ "$TOTAL_COUNT" -gt 0 ]; then
    echo "✓ Phase 1.4 PASSED"
    exit 0
else
    echo "✗ Phase 1.4 FAILED"
    exit 1
fi
