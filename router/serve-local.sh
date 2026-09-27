#!/bin/sh
# Run Marc's River router on this Mac with the key from hsec (RIVER_API_KEY). Usage: ./serve-local.sh [step]
cd "$(dirname "$0")"
exec /Users/touko/.local/bin/hsec exec --only RIVER_API_KEY -- .venv/bin/python serve.py --run r1 ${1:+--step $1}
