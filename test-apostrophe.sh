#!/bin/bash
# Test different apostrophe escaping methods for FFmpeg drawtext

echo "Test 1: Using typographic apostrophe (U+2019)"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 -vf "drawtext=text='I'll':font='Arial':fontsize=32:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" -t 1 -y test-apo1.mp4 2>&1 | grep -E "(Error|error|No option)"

echo -e "\nTest 2: Using double backslash escape"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 -vf "drawtext=text='I\\\\'ll':font='Arial':fontsize=32:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" -t 1 -y test-apo2.mp4 2>&1 | grep -E "(Error|error|No option)"

echo -e "\nTest 3: Just remove apostrophes"
ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 -vf "drawtext=text='Ill':font='Arial':fontsize=32:fontcolor=ffffff@1.0:x=(w-text_w)/2:y=h*0.5" -t 1 -y test-apo3.mp4 2>&1 | grep -E "(Error|error|No option)"

echo -e "\nDone. Check which test succeeded."
ls -lh test-apo*.mp4 2>/dev/null
