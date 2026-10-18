#!/bin/sh
# Сборка: картинка + музыка (-14 LUFS) в ../Claude-Crab-Story-2026-<имя>.mp4
# sh mux.sh 1080 60     - 1080p 60 к/с + лёгкая копия для телефона
# sh mux.sh 2160 240    - 4K 240 к/с
set -e
cd "$(dirname "$0")"
RES=$1; FPS=$2; OUT=..
ffmpeg -y -hide_banner -loglevel error -i music.wav -af loudnorm=I=-14:TP=-1.0:LRA=11 -ar 48000 norm.wav
case $RES in 2160) TAG=4K ;; *) TAG=${RES}p ;; esac
NAME="Claude-Crab-Story-2026-$TAG-${FPS}fps"
ffmpeg -y -hide_banner -loglevel error -i video_${RES}_${FPS}.mp4 -i norm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -movflags +faststart -shortest "$OUT/$NAME.mp4"
if [ "$RES" = 1080 ]; then
  ffmpeg -y -hide_banner -loglevel error -i video_${RES}_${FPS}.mp4 -i norm.wav -map 0:v -map 1:a -c:v libx264 -preset slow -b:v 2200k -maxrate 3500k -bufsize 7000k \
    -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -b:a 160k -movflags +faststart -shortest "$OUT/Claude-Crab-Story-2026-light.mp4"
fi
ls -la "$OUT"/Claude-Crab-Story-2026*.mp4
