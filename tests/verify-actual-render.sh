#!/bin/bash
# Verify that the test output actually has continuous text

echo "=== Verifying Rendered Output Has Continuous Text ==="
echo ""

VIDEO="tests/test-output.mp4"

if [ ! -f "$VIDEO" ]; then
    echo "✗ Test video not found. Run e2e test first."
    exit 1
fi

# Extract frames at key points and check if they're different from background
echo "Extracting frames to verify text presence..."

# Frame 1: Should have "Hello" (word 1)
ffmpeg -ss 0.3 -i "$VIDEO" -vframes 1 -f image2 /tmp/frame_0_3.png -y 2>/dev/null

# Frame 2: Gap 1 (0.65s) - should still have text (Hello extended)
ffmpeg -ss 0.65 -i "$VIDEO" -vframes 1 -f image2 /tmp/frame_0_65.png -y 2>/dev/null

# Frame 3: Word 2 at 1.0s
ffmpeg -ss 1.0 -i "$VIDEO" -vframes 1 -f image2 /tmp/frame_1_0.png -y 2>/dev/null

# Frame 4: Gap 2 (1.35s) - should still have text (world extended)
ffmpeg -ss 1.35 -i "$VIDEO" -vframes 1 -f image2 /tmp/frame_1_35.png -y 2>/dev/null

# Frame 5: Just background (before any words)
ffmpeg -ss 4.5 -i "$VIDEO" -vframes 1 -f image2 /tmp/frame_bg.png -y 2>/dev/null

# Use ImageMagick to compare frames
echo ""
echo "Comparing frames..."

# Get file sizes - frames with text should be larger than background
SIZE_0_3=$(wc -c < /tmp/frame_0_3.png)
SIZE_0_65=$(wc -c < /tmp/frame_0_65.png)
SIZE_1_0=$(wc -c < /tmp/frame_1_0.png)
SIZE_1_35=$(wc -c < /tmp/frame_1_35.png)
SIZE_BG=$(wc -c < /tmp/frame_bg.png)

echo "Frame sizes:"
echo "  0.30s (word 1): ${SIZE_0_3} bytes"
echo "  0.65s (gap 1):  ${SIZE_0_65} bytes"
echo "  1.00s (word 2): ${SIZE_1_0} bytes"
echo "  1.35s (gap 2):  ${SIZE_1_35} bytes"
echo "  4.50s (bg):     ${SIZE_BG} bytes"
echo ""

# Frames with text should be noticeably different from background
if [ "$SIZE_0_3" -eq "$SIZE_BG" ] || [ "$SIZE_0_65" -eq "$SIZE_BG" ]; then
    echo "✗ FAILED: Gap detected at 0.65s (same as background)"
    open /tmp/frame_0_65.png 2>/dev/null
    exit 1
fi

if [ "$SIZE_1_35" -eq "$SIZE_BG" ]; then
    echo "✗ FAILED: Gap detected at 1.35s (same as background)"
    open /tmp/frame_1_35.png 2>/dev/null
    exit 1
fi

echo "✓ All gap frames have text (different from background)"
echo "✓ Caption continuity VERIFIED"

# Clean up
rm /tmp/frame_*.png 2>/dev/null

exit 0
