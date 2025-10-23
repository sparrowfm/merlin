#!/bin/bash
# Phase 1.1: Test basic text escaping in FFmpeg drawtext

echo "=== Phase 1.1: Basic Text Escaping Tests ==="
echo ""

# Test 1: Plain text (baseline)
echo "Test 1: Plain text (no special characters)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='Hello World':font='Arial':fontsize=32:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y tests/test1-plain.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 2: Typographic apostrophe (')
echo -e "\nTest 2: Typographic apostrophe (I'll, don't)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='I'll don't can't':font='Arial':fontsize=32:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y tests/test2-apostrophe.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 3: Escaped colons
echo -e "\nTest 3: Escaped colons (time\\:12\\:34)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='time\\:12\\:34':font='Arial':fontsize=32:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y tests/test3-colons.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 4: Escaped percent signs
echo -e "\nTest 4: Escaped percent signs (100\\% complete)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='100\\% complete':font='Arial':fontsize=32:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y tests/test4-percent.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 5: Escaped backslashes
echo -e "\nTest 5: Escaped backslashes (C\\\\\\\\Users)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='C\\\\\\\\Users':font='Arial':fontsize=32:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y tests/test5-backslash.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 6: Combined special characters
echo -e "\nTest 6: Combined (I'll do 100\\% at 12\\:34)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='I'll do 100\\% at 12\\:34':font='Arial':fontsize=32:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y tests/test6-combined.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

echo -e "\n=== Results ==="
ls -lh tests/test*.mp4 2>/dev/null | awk '{if ($5 != "0") print "✓", $9, "(" $5 ")"; else print "✗", $9, "(FAILED)"}'

# Count successes
SUCCESS_COUNT=$(ls -l tests/test*.mp4 2>/dev/null | awk '$5 > 0' | wc -l | tr -d ' ')
TOTAL_COUNT=$(ls tests/test*.mp4 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "Passed: $SUCCESS_COUNT / $TOTAL_COUNT"

if [ "$SUCCESS_COUNT" -eq "$TOTAL_COUNT" ] && [ "$TOTAL_COUNT" -gt 0 ]; then
    echo "✓ Phase 1.1 PASSED"
    exit 0
else
    echo "✗ Phase 1.1 FAILED"
    exit 1
fi
