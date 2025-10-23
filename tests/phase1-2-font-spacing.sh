#!/bin/bash
# Phase 1.2: Test font names with spaces in FFmpeg drawtext

echo "=== Phase 1.2: Font Name Spacing Tests ==="
echo ""

# Test 1: Single-word font (baseline)
echo "Test 1: Arial (single word, baseline)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='Test':font='Arial':fontsize=42:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y tests/font1-arial.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 2: Comic Sans MS with escaped spaces
echo -e "\nTest 2: Comic Sans MS (escaped spaces)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='Test':font='Comic\ Sans\ MS':fontsize=42:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y tests/font2-comic-sans.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 3: Helvetica Neue with escaped spaces
echo -e "\nTest 3: Helvetica Neue (escaped spaces)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='Test':font='Helvetica\ Neue':fontsize=42:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y tests/font3-helvetica.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 4: Times New Roman with escaped spaces
echo -e "\nTest 4: Times New Roman (escaped spaces)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='Test':font='Times\ New\ Roman':fontsize=42:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y tests/font4-times.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 5: Comic Sans MS with box and opacity (like our actual filter)
echo -e "\nTest 5: Comic Sans MS with box + opacity (real-world scenario)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='Test':font='Comic\ Sans\ MS':fontsize=42:fontcolor=ffffff@1.0:box=1:boxcolor=000000cc:boxborderw=8:x=(w-text_w)/2:y=h*0.85" \
  -t 1 -y tests/font5-comic-fullstyle.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 6: Comic Sans MS with apostrophe + box (ultimate test)
echo -e "\nTest 6: Comic Sans MS with apostrophe text (I'll)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='I'll':font='Comic\ Sans\ MS':fontsize=42:fontcolor=ffffff@1.0:box=1:boxcolor=000000cc:boxborderw=8:x=(w-text_w)/2:y=h*0.85" \
  -t 1 -y tests/font6-comic-apostrophe.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

echo -e "\n=== Results ==="
ls -lh tests/font*.mp4 2>/dev/null | awk '{if ($5 != "0") print "✓", $9, "(" $5 ")"; else print "✗", $9, "(FAILED)"}'

# Count successes
SUCCESS_COUNT=$(ls -l tests/font*.mp4 2>/dev/null | awk '$5 > 0' | wc -l | tr -d ' ')
TOTAL_COUNT=$(ls tests/font*.mp4 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "Passed: $SUCCESS_COUNT / $TOTAL_COUNT"

if [ "$SUCCESS_COUNT" -eq "$TOTAL_COUNT" ] && [ "$TOTAL_COUNT" -gt 0 ]; then
    echo "✓ Phase 1.2 PASSED"
    exit 0
else
    echo "✗ Phase 1.2 FAILED"
    exit 1
fi
