#!/bin/sh
# 4K 240 к/с: 4 рендера параллельно на куски ролика (видеокарта простаивает, упор в PNG и x264), потом склейка без перекодирования.
cd "$(dirname "$0")"
N=28800; P=4; STEP=$((N / P))
for i in 0 1 2 3; do
  node render.cjs full res=2160 fps=240 from=$((i * STEP)) to=$(((i + 1) * STEP)) part=$i > render4k_p$i.log 2>&1 &
done
wait
: > parts.txt; for i in 0 1 2 3; do echo "file 'video_2160_240_p$i.mp4'" >> parts.txt; done
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i parts.txt -c copy video_2160_240.mp4 && sh mux.sh 2160 240 && echo ALL4K
