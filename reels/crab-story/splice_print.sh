#!/bin/sh
# Копии ролика, где ракету печатает 3D-принтер (?ph=1, просьба Алексея 18.10: «сделать копию тех видео, в неё впаять это»).
# Перерендерен только кусок между ключевыми кадрами старого видео, остальное - те же кадры без перекодирования.
#   1080p 60:  ключевые кадры 40.0 и 48.0   -> кадры 2400..2880
#   4K 240:    ключевые кадры 40.0 и 46.9   -> кадры 9600..11256
# Старые файлы не трогаются, новые - с хвостом «-printer».
set -e
cd "$(dirname "$0")"
OUT=..
splice() { # RES FPS FROM TO T0 T1 PHLEN
  # PHLEN - длина вставки без 2 последних кадров: после 46 с кадры с принтером и без совпадают, а copy-склейка
  # с inpoint на ключевом кадре старого видео приносит 2 кадра до него (открытый GOP) - так длина ролика сходится до кадра
  RES=$1; FPS=$2
  [ -f video_${RES}_${FPS}_pph$RES.mp4 ] || node render.cjs full res=$RES fps=$FPS from=$3 to=$4 part=ph$RES ph=1 > splice_$RES.log 2>&1
  printf "file 'video_%s_%s.mp4'\noutpoint %s\nfile 'video_%s_%s_pph%s.mp4'\noutpoint %s\nfile 'video_%s_%s.mp4'\ninpoint %s\n" \
    $RES $FPS $5 $RES $FPS $RES $7 $RES $FPS $6 > splice_$RES.txt
  ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i splice_$RES.txt -c copy video_${RES}_${FPS}_printer.mp4
}
splice 1080 60 2400 2880 40 48 7.9667
ffmpeg -y -hide_banner -loglevel error -i video_1080_60_printer.mp4 -i norm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -movflags +faststart -shortest "$OUT/Claude-Crab-Story-2026-1080p-60fps-printer.mp4"
ffmpeg -y -hide_banner -loglevel error -i video_1080_60_printer.mp4 -i norm.wav -map 0:v -map 1:a -c:v libx264 -preset slow -b:v 2200k -maxrate 3500k -bufsize 7000k \
  -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -b:a 160k -movflags +faststart -shortest "$OUT/Claude-Crab-Story-2026-light-printer.mp4"
echo "1080 DONE $(date +%H:%M)"
splice 2160 240 9600 11256 40 46.9 6.8917
ffmpeg -y -hide_banner -loglevel error -i video_2160_240_printer.mp4 -i norm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -movflags +faststart -shortest "$OUT/Claude-Crab-Story-2026-4K-240fps-printer.mp4"
echo "4K DONE $(date +%H:%M)"
