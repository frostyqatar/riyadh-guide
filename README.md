# Riyadh — a scraped directory

A static site listing places in Riyadh, grouped into lists, each row carrying the
rating and review count Google Maps had on the day it was pulled.

**Live:** <https://frostyqatar.github.io/riyadh-guide/>

| tab | what | filter |
|---|---|---|
| Eat & drink | restaurants and cafés | 4.8★ and 1,001+ reviews |
| Dessert | kunafa, gelato, chocolate, cake, donut, crêpe | 4.7★ and 200+ |
| Things to do | museums, parks, landmarks, entertainment | 4.5★ and 300+ |
| Shopping | maamoul, dates, nuts, spices, imported goods, cheap shops, wood-fired bakeries | 4.2★ and 50+ |
| Near metro | anything above within 900 m of a Riyadh Metro stop | joined from OSM |

## How the data was collected

No API key, no vendor. A Playwright script drives real Chrome against
`google.com/maps` and reads the `tbm=map` XHR that the page itself loads — the
same JSON behind the results panel, which carries exact `rating` and review
counts. Reading that is faster and far less brittle than parsing card layout.

Two things make it work:

**Hex tiling.** Google returns at most ~40 places per query. A single circle
silently drops the rest, so the search area is covered by a hex lattice of query
circles (a triangular lattice of spacing `s` has covering radius `s/√3`, so
circles of radius `r` placed `r√3` apart tile the plane with ~13% overlap).
Dense cells that still saturate split into 4 and re-query.

**Query variety.** Plain `restaurant` is a weak probe — Google ranks by
prominence for *that word*, and cuisine words partition the space differently.
Using 9–11 words per list (English + Arabic) took recall from ~43% to near
complete in testing. `معمول`, `كنافة`, `حلويات مستوردة`, `بو خمسة`, `عطر` and
`افران الحطب` each surface a different slice.

Metro stations and line membership come from OpenStreetMap via Overpass, joined
to the scraped places by distance, so no extra scraping was needed for it.

## Honest limits

Coverage is not a census. Roughly 40 results per query means a small venue in a
dense area can be missed, and prominence ranking guarantees the well-known places
most of all. Duplicate branches are folded into one row (the `+n` badge).

## Build

```
python build_data.py     # reads the CSVs, writes data.js + csv/
```

Static, no build step, no dependencies. `index.html` + `style.css` + `app.js`.
