#!/bin/sh
# 4K 240 к/с: 3 рендера параллельно на куски, потом склейка без перекодирования и звук.
cd "$(dirname "$0")"
N=22080; P=3; STEP=$(((N + P - 1) / P))
for i in 0 1 2; do
  node render.cjs full res=2160 fps=240 from=$((i * STEP)) to=$(((i + 1) * STEP)) part=$i > render4k_p$i.log 2>&1 &
done
wait
: > parts.txt; for i in 0 1 2; do echo "file 'video_2160_240_p$i.mp4'" >> parts.txt; done
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i parts.txt -c copy video_2160_240.mp4 && sh mux.sh 2160 240 && echo ALL4K
