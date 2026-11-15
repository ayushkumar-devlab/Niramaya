# Niramaya

> **Your trusted companion for safer medication management.**

## Problem statement

Medication schedules, missed-dose questions, caregiver follow-up, and emergency
details can be difficult to manage consistently, especially for older adults
and their families. Niramaya keeps these records together in a simple,
device-local interface.

## Proposed solution

Niramaya is an offline-first medication PWA with a large-text Senior Mode,
local medication scheduling and dose history, an explainable DoseDecision
workflow, CareCircle monitoring, an Emergency Snapshot / Swasthya Card, and a
record-focused Safety Checker.

## Target users

- Elderly patients in India who need a clear daily medication schedule.
- Caregivers and family members who monitor adherence and record observations.

## Key features

- Add, edit, soft-delete, and schedule medications with dosage, times,
  instructions, and clinician-provided missed-dose notes.
- Show today’s schedule with upcoming, due, taken, and not-recorded states.
- Confirm dose recording and prevent duplicate dose logs.
- **DoseDecision Assistant:** a rule-based, explainable presentation of
  clinician-provided instructions. It does not diagnose, prescribe, or give
  autonomous advice.
- CareCircle PIN gate, seven-day adherence summary, missed-dose history,
  caregiver observations, and printable reports.
- Emergency Snapshot / Swasthya Card with patient-entered conditions, allergies,
  contacts, clinician details, and active prescriptions.
- Safety Checker for record mistakes such as missing fields, duplicate records,
  duplicate ingredients, and schedule conflicts. It does not check drug
  interactions.
- English, Hindi, and Kannada interface with locale-aware dates, times, and
  numbers.
- LocalStorage persistence and a same-origin service worker for offline use.

## What makes Niramaya different

The app is designed around local-first privacy and explainability. DoseDecision
only presents saved clinician instructions and explicitly surfaces missing or
conflicting information. The Safety Checker reviews record quality without
inventing interactions or automatically changing a medicine, dose, or schedule.
No AI or LLM is used in the application.

## Technology stack

- Vanilla JavaScript using ES modules.
- Vite `^8.3.6` for development and production bundling.
- Vitest `^5.1.0` for tests.
- Browser LocalStorage, native browser APIs, and a service worker.
- No runtime or translation-library dependencies.

## System architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the module map, data
flow, storage keys, safety workflows, and offline architecture.

## Installation

```bash
npm install
```

On Windows PowerShell, the equivalent is:

```powershell
npm.cmd install
```

## Local development

```bash
npm run dev
```

```powershell
npm.cmd run dev
```

Vite serves the application locally. The application uses hash navigation, so
the routes are `#/senior`, `#/dose-decision`, `#/caregiver`, `#/emergency`,
`#/safety`, and `#/settings`.

## Testing

```bash
npm test
```

```powershell
npm.cmd test
```

## Production build

```bash
npm run build
npm run preview
```

```powershell
npm.cmd run build
npm.cmd run preview
```

The production output directory is `dist/`. The Vite configuration does not
set a custom base, so the production base path is `/`.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Vercel dashboard and CLI
instructions, verification, service-worker updates, troubleshooting, and
rollback guidance. Niramaya is not deployed by this repository task; add the
real live URL here only after completing a deployment:

**Live URL:** _Add after deployment._

## Privacy and safety limitations

See [docs/PRIVACY-AND-SAFETY.md](docs/PRIVACY-AND-SAFETY.md) for the actual
stored fields and keys, data-flow limitations, offline behavior, and the
Safety Checker and DoseDecision boundaries.

## Future enhancements (not implemented)

- A hosted deployment URL and release automation.
- Encrypted or synchronised multi-device storage.
- A clinical interaction database from a verified medical source.
- Automated browser accessibility and visual regression coverage.

These are ideas only and are not implemented features.

## Documentation index

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Privacy and safety](docs/PRIVACY-AND-SAFETY.md)
- [Five-minute demo script](docs/DEMO-SCRIPT.md)

## Disclaimer

Niramaya is not medical advice and does not replace a doctor or pharmacist.
Follow verified instructions from a qualified healthcare professional. When
records are missing, incomplete, or conflicting, seek professional
verification.
