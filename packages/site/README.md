# Luke McEvoy — laboratory

Personal site: CV, live dissertation boards, and a catalog of scientific
instruments. Vite + React. Numbers on the Gaussian-focus and Jones boards
come from `@optics/kernel`.

```bash
npm run dev --workspace @optics/site
```

Opens on [http://127.0.0.1:5300](http://127.0.0.1:5300). Production:

```bash
npm run typecheck --workspace @optics/site
npm run build --workspace @optics/site
```

Preview the production build on port 5310 (`vite.config.ts` allows Cloudflare
tunnel hostnames):

```bash
npm run build --workspace @optics/site
npx vite preview --workspace @optics/site
```

## Routes

| Path | What it is |
| --- | --- |
| `/` | Front page — masthead, credentials, featured work |
| `/phd` | PhD visualized: photon budget, MEMS mask lab, QPMS modes, VideoPIMAE |
| `/work` | Full catalog |
| `/work/<slug>` | One catalog entry (and its live board, if any) |
| `/about` | CV — education, experience, publications, skills |
| `/defense/` | Neutral-atom walkthrough (embedded snapshot) |
| `/studio/` | Optics Studio (embedded snapshot) |
| `/orders/` | Orders of magnitude (embedded snapshot) |
| `/wine/` | Dad's Wine Journeys (embedded snapshot) |

Client-side routing is in `src/lib/router.ts`. SPA paths have no trailing
slash; embedded apps do, so they load as real pages.

## Adding work

A new piece is a row in `src/data/works.ts`. If it runs on this site, give it
a `live` kind and handle that kind in `src/viz/Live.tsx`. CV facts live in
`src/data/cv.ts`; thesis numbers in `src/data/thesis.ts`.

## Embedded snapshots

`public/defense`, `public/studio`, `public/orders`, and `public/wine` are
production builds of other apps, copied in with a Vite `--base` matching the
subpath. They are not the source of truth.

```bash
# example: refresh the defense walkthrough
npm run build --workspace @optics/defense -- --base=/defense/
rm -rf packages/site/public/defense
cp -R packages/defense/dist packages/site/public/defense
```

`orders` and `wine` live outside this repo (`~/Develop/Code/scale` and
`~/Develop/Code/WineTracker`). Rebuild there with `--base=/orders/` or
`--base=/wine/` and copy `dist/` into the matching `public/` folder.

Apps that need a backend (Language Globe, typewriter, Usage, Travel Timeline,
elder-law) stay catalog-only.

## Thesis figures

`public/thesis/` holds downscaled copies of figures from the dissertation
working tree. The resume PDF is `public/Luke-McEvoy-Resume.pdf`.
