#!/bin/sh
# Picture + music for one piece: sh tools/mux_music.sh <music/piece> [video file, default video.mp4]
# The WAV written by synth2.cjs is normalized to -14 LUFS (norm.wav), then muxed without re-encoding the picture
# into <piece>.mp4; for a 1080p picture a light copy <piece>-light.mp4 (~20-30 MB) is made as well.
set -e
cd "$1"
NAME="$(basename "$(pwd)")"
VIDEO="${2:-video.mp4}"
[ -f "$VIDEO" ] || { echo "no $VIDEO - run node render2.cjs full first" >&2; exit 1; }
WAV="$(ls *.wav 2>/dev/null | grep -v '^norm\.wav$' | head -1)"
[ -n "$WAV" ] || { echo "no WAV - run node synth2.cjs first" >&2; exit 1; }
ffmpeg -y -hide_banner -loglevel error -i "$WAV" -af loudnorm=I=-14:TP=-1.0:LRA=11 -ar 48000 norm.wav
ffmpeg -y -hide_banner -loglevel error -i "$VIDEO" -i norm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k \
  -movflags +faststart -shortest "$NAME.mp4"
H="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$VIDEO")"
if [ "$H" = 1080 ]; then
  ffmpeg -y -hide_banner -loglevel error -i "$VIDEO" -i norm.wav -map 0:v -map 1:a -c:v libx264 -preset slow -b:v 2000k \
    -maxrate 3500k -bufsize 7000k -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
    -c:a aac -b:a 160k -movflags +faststart -shortest "$NAME-light.mp4"
fi
ls -la "$NAME"*.mp4
