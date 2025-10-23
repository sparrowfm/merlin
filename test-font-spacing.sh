#!/bin/bash
# Test font names with spaces (like "Comic Sans MS")

echo "Test 1: Comic Sans MS with escaped spaces"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='Test':font='Comic\ Sans\ MS':fontsize=42:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y test-comic-sans.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

echo -e "\nTest 2: Helvetica Neue with escaped spaces"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='Test':font='Helvetica\ Neue':fontsize=42:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y test-helvetica.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

echo -e "\nTest 3: Times New Roman with escaped spaces"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 \
  -vf "drawtext=text='Test':font='Times\ New\ Roman':fontsize=42:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" \
  -t 1 -y test-times.mp4 2>&1 | grep -E "(Error|error|No option|muxing overhead)"

echo -e "\nResults:"
ls -lh test-comic-sans.mp4 test-helvetica.mp4 test-times.mp4 2>/dev/null | awk '{print $9, $5}'
