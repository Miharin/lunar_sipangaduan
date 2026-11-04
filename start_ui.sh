#!/usr/bin/env bash
# (\__/)
# (˶ᵔ ᵕ ᵔ˶)  < "Lunar Territory."
# / >[CRIMSON+]>   "Hands off, unless you're Miharin."

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
node "$DIR/documentation_it.mjs"
