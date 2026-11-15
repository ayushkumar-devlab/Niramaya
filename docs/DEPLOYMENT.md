# Deployment to Vercel

Niramaya is a static Vite PWA. It has no backend, serverless functions,
external APIs, or environment variables.

## Prerequisites

- Node.js compatible with the installed Vite and Vitest versions.
- npm.
- A GitHub repository containing the `main` branch.
- A Vercel account for a dashboard deployment, or the Vercel CLI.

Verify locally before deployment:

```bash
npm install
npm test
npm run build
```

Windows PowerShell equivalents:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
```

The build command is `npm run build` and the output directory is `dist/`.
`vite.config.js` does not override the base, so Vite uses `/`. The app uses
History API routes, and `vercel.json` rewrites application paths to
`/index.html` while excluding real assets and files.

## Option A: Vercel dashboard

1. Push the `main` branch to GitHub.
2. In Vercel, choose **Add New Project** and import the GitHub repository.
3. Use the **Vite** framework preset.
4. Set **Build Command** to `npm run build`.
5. Set **Output Directory** to `dist`.
6. Leave the root directory at the repository root.
7. Do not add environment variables; this app has no required `.env` values.
8. Deploy the project.

No deployment was performed for this repository task. Add the real URL to the
root README only after the deployment has been completed and verified.

## Option B: Vercel CLI

From the repository root, after installing or invoking the Vercel CLI:

```bash
npx vercel
npx vercel --prod
```

When prompted, use the repository root and the existing Vite build settings.
Confirm that the generated project uses `dist` as its output directory.

## Production paths and service worker

The production HTML references `/manifest.json`, `/icons/icon-192.svg`,
`/icons/icon-512.svg`, and `/sw.js`. `main.js` registers `/sw.js` with `/`
scope. The manifest start URL is `/`. These root-relative paths match the
configured Vite base and Vercel root deployment.

The service worker cache is currently `niramaya-v12`. It precaches `/` and
`/index.html` plus declared static assets, serves cached `/` for known
History API navigation paths when offline, caches same-origin GET responses at
runtime, and cleans older cache versions during activation. After publishing a
new build, users may need to refresh once so the updated service worker
activates.

Do not configure a long-lived CDN cache for `sw.js`; it must be revalidated so
cache-version changes can reach clients. Vercel's default static asset
handling is sufficient for the hashed Vite assets.

## Post-deploy verification checklist

- Open the deployment root URL and confirm the Senior Mode view loads.
- Confirm `/manifest.json`, both icon paths, and `/sw.js` return successfully.
- Navigate through `/`, `/missed-dose`, `/caregiver`, `/emergency`, `/safety`,
  `/how-to-use`, and `/settings`.
- Open each clean route directly and refresh it to verify the SPA rewrite.
- Open an old `/#/senior` link and verify it redirects to `/`.
- Switch between English, Hindi, and Kannada and confirm the document language
  and visible labels update.
- Add fictional sample medication data only; do not use real patient data.
- In browser DevTools, enable Offline and reload after the service worker has
  installed. Confirm the shell and previously cached application assets load.
- Test PWA installation on a supported browser/device.
- Run Lighthouse for installability, performance, accessibility, and best
  practices, recording findings rather than inventing scores.
- Test the Emergency Snapshot and CareCircle print flows.

## Updating the service worker

When the offline asset strategy changes, update `CACHE_NAME` in `public/sw.js`,
run `npm run build`, and verify the resulting `dist/sw.js`. A changed cache
version causes old caches to be deleted on activation. Test an update with an
existing installed service worker, not only a first install.

## Troubleshooting

- **Old UI after deployment:** reload once, then inspect Application >
  Service Workers and Cache Storage for `niramaya-v5` or the current version.
- **Missing asset:** confirm the asset exists under `dist/` and that the Vercel
  project root and output directory are correct.
- **Offline shell unavailable:** first load the site online, wait for the
  service worker to install, then test Offline in DevTools.
- **Unexpected route behavior:** confirm `vercel.json` is deployed and that
  the requested path is an application route rather than a real asset.
- **Build failure:** run `npm.cmd test` and `npm.cmd run build` locally and
  inspect the first reported error.

## Rollback

Use Vercel's deployment history to promote the last known-good deployment.
After rollback, reload an installed client and verify the service-worker
version and application shell. If the rollback changes the service-worker
script, allow it to revalidate and activate before testing offline behavior.
