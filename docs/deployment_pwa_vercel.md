# PWA Deployment on Vercel

Status: PWA v0 deployment-ready.

## Local Verification

Run:

```bash
npm run build
```

Expected result:

- `/`
- `/practice`
- `/diagnostic`
- `/dashboard`
- `/manifest.webmanifest`

## Vercel Project Settings

Import the GitHub repository into Vercel:

`fenmdc/adaptive-math-learning`

Use the repository root as the project root.

The repo includes `vercel.json`, so Vercel should use:

- Install command: `npm install`
- Build command: `npm run build`
- Framework: Next.js
- Output directory: `apps/web/.next`

No environment variables are required for the current local-first MVP.

## PWA Checks After Deploy

Open the deployed URL and verify:

- `/manifest.webmanifest` returns JSON
- `/sw.js` returns JavaScript
- Browser install prompt is available
- Practice, Diagnostic, and Dashboard load
- Student model and practice logs persist locally in the browser

## Current Caveat

The student model is currently browser-local. Different Macs will not share
learning history until account sync or export/import is added.
