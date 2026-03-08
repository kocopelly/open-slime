# Import Bookmarks / Sets from TheSession

## Find a member

```bash
curl -s "https://thesession.org/members/search?q=USERNAME&format=json" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'{m[\"id\"]}: {m[\"name\"]}') for m in d.get('members',[])]"
```

## Fetch bookmarks

```bash
MEMBER_ID=176411
curl -s "https://thesession.org/members/${MEMBER_ID}/bookmarks?format=json&perpage=50"
```

Response: `{ bookmarks: [{ tune: { id, name, url, type }, member, date }] }`

Paginate if `pages > 1`.

## Fetch sets

```bash
curl -s "https://thesession.org/members/${MEMBER_ID}/sets?format=json&perpage=50"
```

Response: `{ sets: [{ id, name, url, settings: [{ id, url, key, abc, tune: { id, name } }] }] }`

## Import workflow

1. Fetch all bookmarks (paginate)
2. For each bookmarked tune, get full details + common keys
3. Generate tune registry entries
4. Fetch all sets
5. Map set tunes to registry IDs
6. Generate session-compatible set data

## Browser fallback (HTML scraping)

If API returns incomplete data:

```
https://thesession.org/members/{id}/sets
https://thesession.org/members/{id}/bookmarks
```

Sets page lists tune names with links like `/tunes/{id}`. Parse with:
```bash
curl -s "https://thesession.org/members/{id}/sets" | grep -oP '/tunes/\d+' | sort -u
```
