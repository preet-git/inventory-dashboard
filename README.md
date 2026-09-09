# Inventory dashboard

Angular 21 front end for the product inventory import API. One page: a sortable, paginated table
of every imported product, a summary panel, and an **Import Data** button that uploads a
spreadsheet and follows the import to its result.

## Running it

The API is not started here — it lives in the backend repository. Bring that up first, then:

```bash
docker compose up --build     # http://localhost:8081
```

The dashboard calls the API from the browser at `http://localhost:8080/api`, so the backend must
publish port 8080 and allow this origin (`CORS_ALLOWED_ORIGINS` must list `http://localhost:8081`).

For local development:

```bash
npm install
npm start        # http://localhost:4200
npm run build
```

Node 20.19+, 22.12+ or 24+ — Angular 21 refuses anything older (see `.nvmrc`).

## Layout

| Path | What it holds |
| --- | --- |
| `src/app/core/api-url.ts` | The API's address |
| `src/app/core/inventory-api.ts` | Every HTTP call, and the one place `{code, message}` error bodies are unwrapped |
| `src/app/core/products-store.ts` | Sort, page position, and the cursor stack that makes Prev work |
| `src/app/core/models.ts` | The API's shapes, mirrored one-for-one |
| `src/app/core/iso-date.pipe.ts` | `YYYY-MM-DD` formatting that does not drift a day across timezones |
| `src/app/dashboard/` | The page and its 70/30 split; owns the table state and the last import |
| `src/app/products-table/` | The table and its sort headers |
| `src/app/summary-panel/` | Right column: what was imported, and what was rejected |
| `src/app/import-dialog/` | Upload and poll |

Standalone components, signals and `OnPush` — the defaults Angular 21 generates. No router (one
page), no state library, and no custom nginx config: the app has no client-side routes, so the
stock nginx image serves the build as-is.

The page is one CSS grid — `minmax(0, 7fr)` for the table, `minmax(0, 3fr)` for the panel —
stacking to a single column below 1100px. The `minmax(0, …)` matters: a grid column's default
minimum is its content, so without it the wide table would push its column past its share instead
of scrolling inside it.

## Notes on the API

**Paging is by cursor.** The API pages by opaque cursor and returns no total count, so pages are
walked rather than jumped to: the store keeps the cursor that opened each visited page, and Prev
re-fetches with the one beneath. The "1–20 of 120" total comes from the summary endpoint.

**Stock age and line value are shown, not computed.** The API derives both. Recomputing age in the
browser would mean parsing a date into the user's timezone and disagreeing with the summary card
by a day for anyone west of Greenwich.

**The import is a job, not a request.** The upload returns a run id immediately and the work
happens on a worker, so the dialog polls the status endpoint once a second. The result — rows
read, imported, rejected, and which rows — only exists once the run finishes, and then stays in
the summary panel for the rest of the visit. Rejected row numbers are the first 100 the status
response inlines; beyond that the panel says how many are shown.

## Theme

ABLSoft's palette, from the design tokens on ablsoft.com: teal `#00BACB` primary, navy `#263744`
text, green `#29C229` accent, in Roboto with Roboto Slab for headings. Green heads *Successfully
imported*, a red drawn from ABLSoft's coral brand element heads *Rejected rows*. All tokens live
in `src/styles.css`; components refer to roles (`--accent`, `--danger`), never literals.
