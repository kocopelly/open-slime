# TheSession.org API — Full Endpoint Reference

## Authentication

None required. All endpoints are public.

## Response format

Append `?format=json` to any URL. Without it, you get HTML.

## Pagination

- `perpage` — results per page (default 10, max 50)
- `page` — page number (1-indexed)
- Response includes: `pages` (total pages), `total` (total results), `q` (query)

## Endpoints

### Tunes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tunes/search?q={query}&type={type}&format=json` | Search tunes |
| GET | `/tunes/{id}?format=json` | Tune detail (settings, recordings, comments) |
| GET | `/tunes/new?format=json` | Recently added tunes |
| GET | `/tunes/popular?format=json` | Popular tunes |

**Tune types:** reel, jig, slip jig, hornpipe, polka, slide, waltz, march, strathspey, mazurka, barndance, set dance

**Tune detail fields:**
- `id`, `name`, `url`, `type`
- `member` — who submitted it
- `date` — submission date
- `aliases[]` — alternative names
- `tunebooks` — count of tunebooks containing it
- `recordings[]` — `{ id, name, url, member, date }`
- `comments[]` — `{ id, url, member, date, content }`
- `settings[]` — individual transcriptions, each with:
  - `id`, `url`, `key`, `abc`, `member`, `date`

### Members

| Method | Path | Description |
|--------|------|-------------|
| GET | `/members/search?q={query}&format=json` | Search members |
| GET | `/members/{id}?format=json` | Member profile |
| GET | `/members/{id}/sets?format=json` | Member's tune sets |
| GET | `/members/{id}/bookmarks?format=json` | Member's bookmarks |
| GET | `/members/{id}/activity?format=json` | Member's activity |

### Sessions (live music gatherings)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sessions/search?q={location}&format=json` | Search sessions |
| GET | `/sessions/{id}?format=json` | Session detail |
| GET | `/sessions/nearby?latlon={lat},{lon}&format=json` | Nearby sessions |

### Recordings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/recordings/search?q={query}&format=json` | Search recordings |
| GET | `/recordings/{id}?format=json` | Recording detail |

### Events

| Method | Path | Description |
|--------|------|-------------|
| GET | `/events/search?q={query}&format=json` | Search events |
| GET | `/events/{id}?format=json` | Event detail |

### Discussions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/discussions/search?q={query}&format=json` | Search discussions |
| GET | `/discussions/{id}?format=json` | Discussion detail |

## Key format mapping

API returns verbose key names. Normalize:

| API format | Short form |
|-----------|-----------|
| Amajor | A |
| Aminor | Am |
| Amixolydian | Amix |
| Adorian | Ador |
| Bmajor | B |
| Bminor | Bm |
| Cmajor | C |
| Cminor | Cm |
| Dmajor | D |
| Dminor | Dm |
| Dmixolydian | Dmix |
| Ddorian | Ddor |
| Emajor | E |
| Eminor | Em |
| Edorian | Edor |
| Fmajor | F |
| Fminor | Fm |
| Gmajor | G |
| Gminor | Gm |
| Gmixolydian | Gmix |
| Gdorian | Gdor |

Pattern: strip `major` (just use letter), `minor` → `m`, `dorian` → `dor`, `mixolydian` → `mix`
