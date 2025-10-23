#!/bin/bash
# Test that commas in text are properly escaped

echo "=== Testing Comma Escaping in Drawtext ==="
echo ""

# Create test video
ffmpeg -f lavfi -i color=c=blue:s=640x360:d=2 -y /tmp/test_comma_input.mp4 2>/dev/null

# Test 1: Text with comma at end (like "Herman,")
echo "Test 1: Text with trailing comma"
FILTER="drawtext=text='Herman,':font='Arial':fontsize=32:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0,1)'"
ffmpeg -i /tmp/test_comma_input.mp4 -vf "$FILTER" -y /tmp/test_comma_1.mp4 2>&1 | grep -q "Error\|No such filter\|Invalid"
if [ $? -eq 0 ]; then
    echo "  ✗ FAILED: Comma not escaped - FFmpeg error"
    echo "  This is expected to fail - demonstrating the bug"
else
    echo "  ✓ PASSED: Text with comma works"
fi

# Test 2: Text with escaped comma
echo ""
echo "Test 2: Text with escaped comma"
FILTER="drawtext=text='Herman\\,':font='Arial':fontsize=32:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0,1)'"
ffmpeg -i /tmp/test_comma_input.mp4 -vf "$FILTER" -y /tmp/test_comma_2.mp4 2>&1 | grep -q "Error\|No such filter\|Invalid"
if [ $? -eq 0 ]; then
    echo "  ✗ FAILED: Even with escape, FFmpeg error"
else
    echo "  ✓ PASSED: Escaped comma works"
fi

# Test 3: Multiple filters with commas
echo ""
echo "Test 3: Multiple filters where first has comma in text"
FILTER="drawtext=text='Herman\\,':font='Arial':fontsize=32:x=100:y=100:enable='between(t,0,1)',drawtext=text='what':font='Arial':fontsize=32:x=200:y=100:enable='between(t,0,1)'"
ffmpeg -i /tmp/test_comma_input.mp4 -vf "$FILTER" -y /tmp/test_comma_3.mp4 2>&1 | grep -q "Error\|No such filter\|Invalid"
if [ $? -eq 0 ]; then
    echo "  ✗ FAILED: Multiple filters with comma"
else
    echo "  ✓ PASSED: Multiple filters with escaped comma works"
fi

# Clean up
rm -f /tmp/test_comma_*.mp4

echo ""
echo "=== Comma Escaping Test Complete ==="
