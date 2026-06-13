# Clean Setup Guide

Status: Persistence & Sync v0.

This project is currently a local-first adaptive math learning app. The problem
bank ships with the repository, while learner progress is stored in the
browser. Use the backup workflow below to move profiles and learning history
between Macs.

## Fresh Install On Another Mac

1. Clone the repository.

```bash
git clone https://github.com/fenmdc/adaptive-math-learning.git
cd adaptive-math-learning
```

2. Install dependencies.

```bash
npm install
```

3. Start the local app.

```bash
npm run dev
```

4. Open the app.

```text
http://localhost:3017
```

The app intentionally uses port `3017` to avoid common conflicts with other
local Next.js projects.

## Restore Learner Progress

On the original Mac:

1. Open `/login`.
2. Use `Export backup` in the `Persistence & Sync v0` panel.
3. Move the downloaded JSON file to the new Mac.

On the new Mac:

1. Open `/login`.
2. Use `Import backup`.
3. Select the exported JSON file.
4. Return to the student home or dashboard.

The backup includes:

- local student profiles
- active profile selection
- practice logs
- diagnostic logs
- student model
- latest diagnostic report
- learning plan

The backup does not include the problem bank or app code because those are
already versioned in GitHub.

## Reset Local Learning Data

Use `/login` and select `Clear current data` when a profile needs a fresh
student model without deleting the profile itself.

This clears only the active profile's learning data:

- practice logs
- diagnostic logs
- student model
- latest diagnostic report
- learning plan

It does not delete the profile name, level, goal, or color.

## Current Limits

- Sync is file-based, not automatic cloud sync.
- A backup restore replaces local profile and learning data on that browser.
- Browser private mode or cleared site data will remove local progress unless a
  backup has been exported.

## Next Upgrade Path

Persistence & Sync v1 should add a server-backed option such as Supabase or
PostgreSQL while keeping this local backup workflow as a privacy-preserving
fallback.
