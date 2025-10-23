#!/bin/bash
# Test complex multi-word drawtext filter similar to what we generate

# Generate a filter with 5 words appearing at different times
FILTER="drawtext=text='Herman,':font='Verdana':fontsize=36:fontcolor=ffffff@1.0:box=1:boxcolor=000000bf:boxborderw=8:x=(w-346)/2+0:y=h*0.85:enable='between(t,0,0.6)',drawtext=text='what':font='Verdana':fontsize=36:fontcolor=ffffff@0.5:x=(w-346)/2+162:y=h*0.85:enable='between(t,0,0.6)',drawtext=text='now?':font='Verdana':fontsize=36:fontcolor=ffffff@0.5:x=(w-346)/2+259:y=h*0.85:enable='between(t,0,0.6)'"

echo "Testing complex filter..."
echo "Filter length: ${#FILTER}"

ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=1 -vf "$FILTER" -t 1 -y test-complex.mp4 2>&1 | tail -10

if [ -f test-complex.mp4 ]; then
    echo "SUCCESS: Complex filter works!"
    ls -lh test-complex.mp4
else
    echo "FAILED: Complex filter did not work"
fi
