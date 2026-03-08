#!/bin/bash
# Enrich a tune with data from TheSession.org
# Usage: enrich_tune.sh <thesession_id>
# Output: JSON with name, type, commonKeys

TUNE_ID="${1:?Usage: enrich_tune.sh <thesession_id>}"

curl -s "https://thesession.org/tunes/${TUNE_ID}?format=json&perpage=50" | python3 -c "
import sys, json
from collections import Counter

d = json.load(sys.stdin)

# Normalize key names
def normalize_key(k):
    k = k.replace('major', '').replace('minor', 'm').replace('dorian', 'dor').replace('mixolydian', 'mix')
    return k

settings = d.get('settings', [])
keys = [normalize_key(s['key']) for s in settings]
common = Counter(keys).most_common()

result = {
    'name': d.get('name', ''),
    'type': d.get('type', ''),
    'aliases': [a if isinstance(a, str) else a.get('name', '') for a in d.get('aliases', [])],
    'commonKeys': [k for k, _ in common],
    'thesession': int('${TUNE_ID}'),
    'settingsCount': len(settings),
}

print(json.dumps(result, indent=2))
"
