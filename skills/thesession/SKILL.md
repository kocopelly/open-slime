---
name: thesession
description: "Search, look up, and scrape tune data from TheSession.org (Irish traditional music database). Use when: (1) looking up a tune by name, (2) finding TheSession IDs, (3) getting common keys for a tune, (4) searching for tunes by type/key, (5) enriching tune data with metadata from TheSession. Supports both JSON API and browser fallback."
---

# TheSession.org

Irish traditional music database. Public JSON API + HTML fallback.

## API (preferred)

Base: `https://thesession.org`

All endpoints accept `?format=json`. Paginate with `&page=N&perpage=50`.

### Search tunes

```
GET /tunes/search?q=silver+spear&type=reel&format=json
```

Response: `{ items: [{ id, name, type, url }], pages, total }`

Types: `reel`, `jig`, `slip jig`, `hornpipe`, `polka`, `slide`, `waltz`, `march`, `strathspey`, `mazurka`, `barndance`, `set dance`

### Get tune details

```
GET /tunes/{id}?format=json&perpage=50
```

Response includes:
- `name`, `type`, `aliases[]`
- `settings[]` — each has `id`, `key`, `abc` (ABC notation), `member`, `date`
- `recordings[]`, `comments[]`, `tunebooks`, `collections`

**Extract common keys** from settings:
```python
from collections import Counter
keys = [s['key'] for s in data['settings']]
common = Counter(keys).most_common()
# Returns e.g. [('Dmajor', 16), ('Amajor', 1)]
```

Key format from API: `Dmajor`, `Aminor`, `Edorian`, `Gmixolydian`, etc.

**Normalize to short form:**
- `Dmajor` → `D`
- `Aminor` → `Am`
- `Edorian` → `Edor`
- `Gmixolydian` → `Gmix`
- `Adorian` → `Ador`

### Search members

```
GET /members/search?q=Kocopelly&format=json
```

### Get member profile

```
GET /members/{id}?format=json
```

### Get member sets

```
GET /members/{id}/sets?format=json
```

### Get member bookmarks

```
GET /members/{id}/bookmarks?format=json
```

## Browser fallback

When API returns incomplete data or for scraping ABC notation directly:

```
https://thesession.org/tunes/{id}
```

ABC settings are in the page HTML. Each setting block contains the key in `K:` field of the ABC notation.

## Key gotchas

- Some tune IDs return empty settings via API when `perpage` is too low. Always use `&perpage=50`.
- API rate limiting: be polite, add `sleep 0.5` between batch requests.
- Tune names have many variants/spellings. Use the `aliases` field and fuzzy matching.
- The search is accent-insensitive but not typo-tolerant.
- `format=json` must be explicit — default response is HTML.

## Common workflows

### Add a new tune to the registry

1. Search: `GET /tunes/search?q={name}&type={type}&format=json`
2. Pick the right match (check aliases if name doesn't match exactly)
3. Get details: `GET /tunes/{id}?format=json&perpage=50`
4. Extract common keys from settings
5. Build tune entry with `name`, `type`, `tradition`, `commonKeys`, `external.thesession`

### Link to specific dots (settings)

Each tune on TheSession has multiple "settings" (transcriptions). Each setting has a unique ID.

URL format: `https://thesession.org/tunes/{tuneId}#setting{settingId}`

From the API response:
```json
{
  "settings": [
    { "id": 182, "url": "https://thesession.org/tunes/182#setting182", "key": "Dmajor", "abc": "..." }
  ]
}
```

Use `settingId` in the nashville-folk-session data model to link a tune-in-a-set to the exact transcription used:
```json
{ "tuneId": "tune_001", "key": "D", "settingId": 182 }
```

### Batch enrich tunes

For each tune with a `thesession` ID:
```bash
for id in 182 901 36 8; do
  curl -s "https://thesession.org/tunes/${id}?format=json&perpage=50" | python3 -c "
    import sys,json
    from collections import Counter
    d = json.load(sys.stdin)
    keys = [s['key'] for s in d.get('settings',[])]
    c = Counter(keys).most_common()
    print(f\"{d['name']}: {', '.join(f'{k}({n})' for k,n in c)}\")
  "
  sleep 0.5
done
```

### Import user's bookmarks/sets

See references/import-bookmarks.md for the full workflow.
