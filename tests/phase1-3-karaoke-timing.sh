#!/bin/bash
# Phase 1.3: Test complex multi-word karaoke filters with timing

echo "=== Phase 1.3: Karaoke Timing Tests ==="
echo ""

# Test 1: 3 words, current word highlighted (karaoke effect)
# At t=0-1: "Hello" highlighted, "World Test" at 50%
echo "Test 1: 3-word karaoke effect"
FILTER1="drawtext=text='Hello':font='Arial':fontsize=32:fontcolor=ffffff@1.0:box=1:boxcolor=000000cc:boxborderw=8:x=(w-288)/2+0:y=h*0.85:enable='between(t,0,1)',drawtext=text='World':font='Arial':fontsize=32:fontcolor=ffffff@0.5:x=(w-288)/2+106:y=h*0.85:enable='between(t,0,1)',drawtext=text='Test':font='Arial':fontsize=32:fontcolor=ffffff@0.5:x=(w-288)/2+211:y=h*0.85:enable='between(t,0,1)'"

ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=3 \
  -vf "$FILTER1" \
  -t 3 -y tests/karaoke1-simple.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 2: 5-word window with transitions (matches our app logic)
# t=0-0.5: "Hello" highlighted + 2 context words
# t=0.5-1: "World" highlighted + 4 context words
# t=1-1.5: "Test" highlighted + 4 context words
echo -e "\nTest 2: 5-word window with transitions"
FILTER2="drawtext=text='Hello':font='Verdana':fontsize=36:fontcolor=ffffff@1.0:box=1:boxcolor=000000bf:boxborderw=8:x=(w-346)/2+0:y=h*0.85:enable='between(t,0,0.5)',drawtext=text='World':font='Verdana':fontsize=36:fontcolor=ffffff@0.5:x=(w-346)/2+120:y=h*0.85:enable='between(t,0,0.5)',drawtext=text='Test':font='Verdana':fontsize=36:fontcolor=ffffff@0.5:x=(w-346)/2+240:y=h*0.85:enable='between(t,0,0.5)',drawtext=text='Hello':font='Verdana':fontsize=36:fontcolor=ffffff@0.5:x=(w-450)/2+0:y=h*0.85:enable='between(t,0.5,1)',drawtext=text='World':font='Verdana':fontsize=36:fontcolor=ffffff@1.0:box=1:boxcolor=000000bf:boxborderw=8:x=(w-450)/2+120:y=h*0.85:enable='between(t,0.5,1)',drawtext=text='Test':font='Verdana':fontsize=36:fontcolor=ffffff@0.5:x=(w-450)/2+240:y=h*0.85:enable='between(t,0.5,1)',drawtext=text='Caption':font='Verdana':fontsize=36:fontcolor=ffffff@0.5:x=(w-450)/2+350:y=h*0.85:enable='between(t,0.5,1)'"

ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=3 \
  -vf "$FILTER2" \
  -t 3 -y tests/karaoke2-transitions.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 3: With Comic Sans MS (font spacing + karaoke)
echo -e "\nTest 3: Comic Sans MS with karaoke"
FILTER3="drawtext=text='I'll':font='Comic\ Sans\ MS':fontsize=42:fontcolor=ffffff@1.0:box=1:boxcolor=000000cc:boxborderw=8:x=(w-300)/2+0:y=h*0.85:enable='between(t,0,1)',drawtext=text='do':font='Comic\ Sans\ MS':fontsize=42:fontcolor=ffffff@0.5:x=(w-300)/2+80:y=h*0.85:enable='between(t,0,1)',drawtext=text='it':font='Comic\ Sans\ MS':fontsize=42:fontcolor=ffffff@0.5:x=(w-300)/2+150:y=h*0.85:enable='between(t,0,1)'"

ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=3 \
  -vf "$FILTER3" \
  -t 3 -y tests/karaoke3-comicsans.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 4: Top position (verify positioning works)
echo -e "\nTest 4: Karaoke at top position"
FILTER4="drawtext=text='Top':font='Arial':fontsize=32:fontcolor=ffffff@1.0:box=1:boxcolor=000000cc:boxborderw=8:x=(w-200)/2+0:y=h*0.15:enable='between(t,0,1)',drawtext=text='Text':font='Arial':fontsize=32:fontcolor=ffffff@0.5:x=(w-200)/2+100:y=h*0.15:enable='between(t,0,1)'"

ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=2 \
  -vf "$FILTER4" \
  -t 2 -y tests/karaoke4-top.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

# Test 5: Middle position
echo -e "\nTest 5: Karaoke at middle position"
FILTER5="drawtext=text='Middle':font='Arial':fontsize=32:fontcolor=ffffff@1.0:box=1:boxcolor=000000cc:boxborderw=8:x=(w-250)/2+0:y=h*0.5:enable='between(t,0,1)',drawtext=text='Text':font='Arial':fontsize=32:fontcolor=ffffff@0.5:x=(w-250)/2+150:y=h*0.5:enable='between(t,0,1)'"

ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=2 \
  -vf "$FILTER5" \
  -t 2 -y tests/karaoke5-middle.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

echo -e "\n=== Results ==="
ls -lh tests/karaoke*.mp4 2>/dev/null | awk '{if ($5 != "0") print "✓", $9, "(" $5 ")"; else print "✗", $9, "(FAILED)"}'

# Count successes
SUCCESS_COUNT=$(ls -l tests/karaoke*.mp4 2>/dev/null | awk '$5 > 0' | wc -l | tr -d ' ')
TOTAL_COUNT=$(ls tests/karaoke*.mp4 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "Passed: $SUCCESS_COUNT / $TOTAL_COUNT"

if [ "$SUCCESS_COUNT" -eq "$TOTAL_COUNT" ] && [ "$TOTAL_COUNT" -gt 0 ]; then
    echo "✓ Phase 1.3 PASSED"
    exit 0
else
    echo "✗ Phase 1.3 FAILED"
    exit 1
fi
