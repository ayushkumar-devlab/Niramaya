# Niramaya

Niramaya is an offline-first medication companion for older adults in India and
the people who help them. The primary persona is a senior user who needs a
large, simple medication schedule; CareCircle provides a compact monitoring
view for a trusted caregiver.

## What it does

- Senior Mode medication CRUD, schedules, dose history, confirmations, and
  read-aloud support.
- DoseDecision presents recorded clinician instructions without inventing
  missed-dose advice.
- CareCircle adherence summaries, history, observations, and print reports.
- Emergency Snapshot / Swasthya Card with local emergency information.
- Safety Checker finds record-quality problems such as missing fields,
  duplicate records, and conflicting schedules.
- English, Hindi, and Kannada interface with locale-aware dates, times, and
  numbers.
- LocalStorage persistence and a same-origin service worker for offline use.

## Safety design

The app checks the quality and consistency of records. It does not diagnose,
recommend treatment, check drug interactions, or replace a doctor or
pharmacist. It never automatically changes a medicine, dose, or schedule.
Medicine names, clinician names, contacts, and patient-entered notes are
displayed as entered.

## Accessibility

The interface uses semantic landmarks, a skip link, visible keyboard focus,
labelled controls, live status announcements, keyboard-safe dialogs, reduced
motion support, responsive layouts, and larger controls in Senior Mode.
Severity information is conveyed with text and icons, not colour alone.

## Privacy and offline behavior

Health and profile data stays in browser LocalStorage on the device. There are
no translation APIs, analytics, external requests, or account services.
The service worker caches the app shell and same-origin assets. Anyone with
access to an unlocked device can view its locally stored data.

## Setup

```bash
npm.cmd install
npm.cmd run dev
```

For a production build:

```bash
npm.cmd run build
npm.cmd test
```

The application is a Vite vanilla JavaScript PWA. No runtime dependencies are
required for translations or safety checking.

## Milestones

1. Medication records and local persistence
2. Scheduling and dose history
3. DoseDecision safety presentation
4. CareCircle and emergency information
5. Offline PWA foundation
6. Multilingual interface
7. Medication Safety Checker
8. Accessibility, responsive QA, privacy, and production-readiness polish

## Assumptions and limitations

- LocalStorage is a device-local privacy boundary, not high-security
  authentication or encrypted storage.
- The Safety Checker only evaluates fields available in the saved records and
  does not contain a drug interaction database.
- Voice output depends on voices installed by the operating system.
- Print and phone-call behavior depend on the browser and device.
- This application is not medical advice.
