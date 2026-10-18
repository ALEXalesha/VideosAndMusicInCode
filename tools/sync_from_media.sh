#!/usr/bin/env bash
# Copies the source code of the videos and music from the working folders into this repository.
#
#   bash tools/sync_from_media.sh            # code only
#   bash tools/sync_from_media.sh --posters  # code and the poster frames in docs/ (needs ffmpeg and the -light videos)
#
# The works are made in the Media folder next to the projects (MEDIA, default ../../../Media from here:
# Reels/<film>/source* and Music/<piece>/source). Only code is copied: no WAV, PNG frames or MP4.
# The local path to Playwright in render scripts becomes a plain require('playwright') (package.json).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MEDIA="${MEDIA:-$ROOT/../../../Media}"
[ -d "$MEDIA/Reels" ] && [ -d "$MEDIA/Music" ] || { echo "no Reels/ and Music/ in $MEDIA - set MEDIA" >&2; exit 1; }

copy() { # copy <source dir> <target dir> <files...>
  local src="$1" dst="$2"; shift 2
  mkdir -p "$ROOT/$dst"
  for f in "$@"; do
    [ -f "$src/$f" ] || { echo "missing $src/$f" >&2; exit 1; }
    sed -E "s#require\('[^']*node_modules/playwright'\)#require('playwright')#" "$src/$f" > "$ROOT/$dst/$f"
  done
  echo "$dst: $#"
}

copy "$MEDIA/Reels/Showreel/source3" reels/showreel \
  timeline.js shaders.js reel.js reel.html synth.cjs render.cjs mux.sh render4k.sh
copy "$MEDIA/Reels/CrabFilm/source" reels/crab-story \
  timeline.js shaders.js film.js film.html synth.cjs render.cjs mux.sh render4k.sh splice_print.sh

PIECES="Nocturne:nocturne-in-d-minor Toccata:toccata-in-e-minor Waltz:waltz-in-a-major Blues:midnight-blues-in-f
Prelude:rain-prelude-in-c-major Tango:tango-in-d-minor Lullaby:lullaby-in-e-flat-major"
for p in $PIECES; do
  copy "$MEDIA/Music/${p%%:*}/source" "music/${p##*:}" song.js synth2.cjs viz.js viz.html render2.cjs render4.cjs
done

# The check: no absolute path to a local drive must remain in the copied code.
if grep -r -l -E "(^|[^A-Za-z])[A-Z]:[\\/]" "$ROOT/reels" "$ROOT/music"; then
  echo "absolute paths left in the files above" >&2; exit 1
fi

[ "${1:-}" = --posters ] || exit 0
command -v ffmpeg >/dev/null || { echo "no ffmpeg" >&2; exit 1; }
mkdir -p "$ROOT/docs"
strip() { # strip <video> <out.jpg> <t1> <t2> <t3>: three frames side by side
  ffmpeg -v error -y -ss "$3" -i "$1" -ss "$4" -i "$1" -ss "$5" -i "$1" \
    -filter_complex "[0:v]scale=640:-2[a];[1:v]scale=640:-2[b];[2:v]scale=640:-2[c];[a][b][c]hstack=3" \
    -frames:v 1 -q:v 4 "$2"
}
strip "$MEDIA/Reels/Showreel/Claude-Showreel-2026-light.mp4" "$ROOT/docs/showreel.jpg" 45 62 100
strip "$MEDIA/Reels/CrabFilm/Claude-Crab-Story-2026-light.mp4" "$ROOT/docs/crab-story.jpg" 20 34 62
for p in $PIECES; do
  v=$(ls "$MEDIA/Music/${p%%:*}"/*-light.mp4 | head -1)
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v")
  t=$(awk -v d="$d" 'BEGIN { printf "%.1f", d * 0.45 }')
  ffmpeg -v error -y -ss "$t" -i "$v" -frames:v 1 -vf scale=800:-2 -q:v 4 "$ROOT/docs/${p##*:}.jpg"
done
ls -la "$ROOT/docs"
