#!/usr/bin/env bash
#
# Build the candidate-facing homework zip for ONE candidate, with their seed
# stamped into every file that mentions it, and record the assignment.
#
# Internal only. The file list below is an allow-list: anything not named here
# (homework-evaluation/, seeds.md, PLAN*.md, tools/) cannot reach the candidate.
#
#   make bundle SEED=2417 CANDIDATE=christiam                     # both scaffolds
#   make bundle SEED=2417 CANDIDATE=christiam FRAMEWORK=playwright # one only
#
set -euo pipefail

cd "$(dirname "$0")/.."

SEED="${SEED:-}"
CANDIDATE="${CANDIDATE:-}"
FRAMEWORK="${FRAMEWORK:-both}"
SEEDS_FILE=seeds.md

die() { printf '\nerror: %s\n\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- validation
usage="usage: make bundle SEED=<seed> CANDIDATE=<name> [FRAMEWORK=both|cypress|playwright]"
[ -n "$SEED" ]      || die "SEED is required.      $usage"
[ -n "$CANDIDATE" ] || die "CANDIDATE is required. $usage"
case "$SEED" in ''|*[!0-9]*) die "SEED must be a positive integer (got '$SEED')";; esac
[ "$SEED" -gt 0 ] || die "SEED must be a positive integer (got '$SEED')"
[ "$SEED" != 1000 ] || die "1000 is the app default — a candidate with no seed lands on it
       by accident, so it must never be handed out. Pick another seed;
       $SEEDS_FILE lists the verified ones."
[ -z "$FRAMEWORK" ] && FRAMEWORK=both
case "$FRAMEWORK" in
  both|cypress|playwright) ;;
  *) die "FRAMEWORK must be both, cypress or playwright (got '$FRAMEWORK'). $usage" ;;
esac
command -v zip >/dev/null 2>&1 || die "zip is not installed"

# ------------------------------------------------------- seed ledger, part 1
if [ ! -f "$SEEDS_FILE" ]; then
  grep -v '_example_' seeds.example.md > "$SEEDS_FILE"
  echo "created $SEEDS_FILE from seeds.example.md (git-ignored)"
fi

# Only the assignment table is wide; the reference table below it has 2 columns.
# Seed is the second column, so it stays $3 after the split on '|'.
if awk -F'|' -v s="$SEED" 'NF>=7 { c=$3; gsub(/[ \t]/,"",c); if (c==s) { print "       " $0; f=1 } } END { exit !f }' \
     "$SEEDS_FILE"; then
  die "seed $SEED is already assigned (row above). Seeds must not be reused
       within a round — the Tier B answer key would transfer between candidates."
fi

TIERB='_(node unavailable — fill in from bug-catalog.md)_'
if command -v node >/dev/null 2>&1; then
  TIERB=$(node -e '
function mulberry32(a){return function(){a|=0;a=(a+0x6d2b79f5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
var rand=mulberry32(Number(process.argv[1])+7919);
var pool=["fx_b1","fx_b2","fx_b3","fx_b4","fx_b5","fx_b6"];
for(var i=pool.length-1;i>0;i--){var j=Math.floor(rand()*(i+1));var t=pool[i];pool[i]=pool[j];pool[j]=t;}
console.log(pool.slice(0,3).sort().map(function(f){return "`"+f+"`";}).join(", "));' "$SEED")
fi

# ------------------------------------------------------------ stage & stamp
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

for path in START-HERE.md Makefile docker-compose.yml docker app homework; do
  [ -e "$path" ] || die "missing candidate-facing path: $path"
  cp -R "$path" "$STAGE/"
done

# Drop the scaffold(s) the candidate is not getting, and the compose service that
# went with it — a service pointing at a build context we just deleted would
# blow up the first time they typed the wrong FRAMEWORK.
drop_service() {  # drop_service <name> <next-key-or-EOF>
  # 'nextkey', not 'next' — next is an awk keyword.
  awk -v svc="  $1:" -v nextkey="  $2:" '
    $0 == svc { skip = 1; next }
    skip && $0 == nextkey { skip = 0 }
    !skip { print }
  ' "$STAGE/docker-compose.yml" > "$STAGE/docker-compose.yml.tmp" \
    && mv "$STAGE/docker-compose.yml.tmp" "$STAGE/docker-compose.yml"
  grep -q "^  $1:" "$STAGE/docker-compose.yml" \
    && die "the '$1' service survived removal from docker-compose.yml"
  return 0
}

case "$FRAMEWORK" in
  cypress)
    rm -rf "$STAGE/homework/starter-playwright" "$STAGE/docker"
    drop_service playwright __eof__
    ;;
  playwright)
    rm -rf "$STAGE/homework/starter-cypress"
    drop_service cypress playwright
    ;;
esac

rm -rf "$STAGE/homework/starter-cypress/node_modules" \
       "$STAGE/homework/starter-cypress/cypress/screenshots" \
       "$STAGE/homework/starter-cypress/cypress/videos" \
       "$STAGE/homework/starter-cypress/cypress/downloads" \
       "$STAGE/homework/starter-playwright/node_modules" \
       "$STAGE/homework/starter-playwright/test-results" \
       "$STAGE/homework/starter-playwright/playwright-report" \
       "$STAGE/homework/starter-playwright/blob-report" \
       "$STAGE/homework/starter-playwright/.last-run.json"
find "$STAGE" -name .DS_Store -delete

# A verifier left behind in a scaffold would hand over the answer key.
if find "$STAGE" -name 'verify.internal.*' | grep -q .; then
  find "$STAGE" -name 'verify.internal.*' >&2
  die "an internal verifier is sitting in a scaffold (rows above) — delete it and re-run"
fi

stamp() {  # stamp <file> <sed-expr>...
  local f="$STAGE/$1"; shift
  [ -f "$f" ] || die "cannot stamp missing file: $1"
  sed "$@" "$f" > "$f.stamped" && mv "$f.stamped" "$f"
}

# The brief: fill the blank, and stop pointing at the email as the source.
grep -q '`______`' "$STAGE/homework/assignment.md" \
  || die "seed placeholder \`______\` not found in homework/assignment.md — did the brief change?"
stamp homework/assignment.md \
  -e "s/\`______\`/\`$SEED\`/" \
  -e 's/(in your assignment email — the/(the/'

# The quickstart: state the seed outright instead of deferring to the email.
stamp START-HERE.md \
  -e "s/Your assignment email contains a \*\*build seed\*\*\./Your **build seed is \`$SEED\`**./" \
  -e "s/1234/$SEED/g"

# The Makefile: drop the internal section, then make a bare `make start`
# correct for this candidate.
sed '/^# --- internal (not shipped to candidates)/,$d' "$STAGE/Makefile" \
  > "$STAGE/Makefile.stamped" && mv "$STAGE/Makefile.stamped" "$STAGE/Makefile"
sed -e 's/ bundle$//' "$STAGE/Makefile" \
  > "$STAGE/Makefile.stamped" && mv "$STAGE/Makefile.stamped" "$STAGE/Makefile"
if grep -q 'tools/bundle.sh' "$STAGE/Makefile"; then
  die "internal bundle target survived into the staged Makefile"
fi
if grep -qE '^\.PHONY:.* bundle( |$)' "$STAGE/Makefile"; then
  die "'bundle' survived in the staged .PHONY line — the sed that strips it no longer matches"
fi

grep -qE '^SEED +\?= 1000$' "$STAGE/Makefile" \
  || die "'SEED ?= 1000' not found in Makefile — did the default change?"
stamp Makefile -e "s/^SEED \(  *\)?= 1000$/SEED \1?= $SEED/" -e "s/SEED=1234/SEED=$SEED/g"
grep -qE "^SEED +\?= $SEED$" "$STAGE/Makefile" \
  || die "stamping the Makefile seed default did not take"

# If they only get one scaffold, make FRAMEWORK unnecessary for them.
case "$FRAMEWORK" in
  cypress|playwright)
    stamp Makefile -e "s/^FRAMEWORK ?=$/FRAMEWORK ?= $FRAMEWORK/"
    grep -qE "^FRAMEWORK \?= $FRAMEWORK$" "$STAGE/Makefile" \
      || die "stamping the Makefile FRAMEWORK default did not take"
    ;;
esac

# The Cypress scaffold: the native path has its own silent 1000 default.
if [ -d "$STAGE/homework/starter-cypress" ]; then
  grep -q "process.env.SEED || '1000'" "$STAGE/homework/starter-cypress/cypress.config.js" \
    || die "seed default not found in homework/starter-cypress/cypress.config.js — did the scaffold change?"
  stamp homework/starter-cypress/cypress.config.js \
    -e "s/process.env.SEED || '1000'/process.env.SEED || '$SEED'/" \
    -e "s/SEED=1234/SEED=$SEED/g"
  stamp homework/starter-cypress/README.md -e "s/1234/$SEED/g"
fi

# The Playwright scaffold: same silent 1000, in use.seed.
if [ -d "$STAGE/homework/starter-playwright" ]; then
  grep -q "process.env.SEED || '1000'" "$STAGE/homework/starter-playwright/playwright.config.js" \
    || die "seed default not found in homework/starter-playwright/playwright.config.js — did the scaffold change?"
  stamp homework/starter-playwright/playwright.config.js \
    -e "s/process.env.SEED || '1000'/process.env.SEED || '$SEED'/" \
    -e "s/SEED=1234/SEED=$SEED/g"
  stamp homework/starter-playwright/README.md -e "s/1234/$SEED/g"
  stamp homework/starter-playwright/tests/support/fixtures.js -e "s/SEED=1234/SEED=$SEED/g"
fi

# The compose file: a third silent 1000, hit by anyone bypassing make.
grep -c '${SEED:-1000}' "$STAGE/docker-compose.yml" >/dev/null \
  || die "seed default not found in docker-compose.yml — did it change?"
stamp docker-compose.yml -e "s/\${SEED:-1000}/\${SEED:-$SEED}/g"
if grep -q '${SEED:-1000}' "$STAGE/docker-compose.yml"; then
  die "a \${SEED:-1000} default survived stamping in docker-compose.yml"
fi

# Nothing candidate-facing may still point at a seed that is not theirs.
if grep -rn '1234' "$STAGE/START-HERE.md" "$STAGE/Makefile" "$STAGE/homework" >/dev/null 2>&1; then
  grep -rn '1234' "$STAGE/START-HERE.md" "$STAGE/Makefile" "$STAGE/homework" >&2
  die "a stale example seed survived stamping (rows above)"
fi

# ------------------------------------------------------------------- bundle
slug=$(printf '%s' "$CANDIDATE" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/-$//')
OUT="${OUT:-../aceup-qa-homework-$slug.zip}"
mkdir -p "$(dirname "$OUT")"
OUT_ABS="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
rm -f "$OUT_ABS"
(cd "$STAGE" && zip -qr "$OUT_ABS" .)

# ------------------------------------------------------- seed ledger, part 2
row=$(printf '| %s | %s | %s | %s | %s | | |' "$CANDIDATE" "$SEED" "$TIERB" "$FRAMEWORK" "$(date +%F)")
awk -v row="$row" '
  { print }
  /^\|---\|---\|---\|---\|---\|---\|---\|$/ && !done { print row; done=1 }
' "$SEEDS_FILE" > "$SEEDS_FILE.tmp" && mv "$SEEDS_FILE.tmp" "$SEEDS_FILE"
grep -q "^| $CANDIDATE | $SEED |" "$SEEDS_FILE" \
  || die "the ledger row was not inserted — has the header separator in $SEEDS_FILE changed?
       The zip at $OUT_ABS was written; record the assignment by hand."

cat <<SUMMARY

  bundle    $OUT_ABS
  candidate $CANDIDATE
  seed      $SEED   (Tier B: $TIERB)
  framework $FRAMEWORK
  recorded  $SEEDS_FILE

  The seed is stamped into assignment.md, START-HERE.md, the Makefile, both
  scaffold configs and docker-compose.yml, so 'make start' is correct for them
  even with no arguments. Still put the seed in the email — belt and braces.

SUMMARY
