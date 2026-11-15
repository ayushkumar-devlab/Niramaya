# Privacy and Safety

## What is stored

Niramaya stores the following categories of data in browser LocalStorage:

- Medication names, dosage/strength, units, active ingredients, frequencies,
  scheduled times, ordinary instructions, clinician missed-dose notes, source
  names, verification dates, start/end dates, colors, and deletion metadata.
- Dose logs and dose-correction audit entries.
- Patient profile name and settings such as language and Senior Mode.
- Emergency Snapshot data: patient name, age, date of birth, blood type,
  allergy status and entries, medical conditions, emergency contact, primary
  doctor and clinic details, notes, and update time.
- Caregiver configuration and hash, plus caregiver observations and their
  timestamps.

## Where it is stored

The storage implementation is `src/modules/store.js`. Its real keys are:

`nm_schema_version`, `nm_medications`, `nm_dose_logs`, `nm_profile`,
`nm_emergency`, `nm_caregiver`, `nm_settings`, `nm_caregiver_notes`, and
`nm_dose_audit_logs`.

The schema version is currently `1`. Missing records are initialized from
defaults. Corrupted JSON is logged and reset to a default where one exists;
write and quota failures are logged and reported through the storage return
value. The optional caregiver PIN is a convenience barrier using a local hash,
not secure authentication.

## Does data leave the device?

The source was checked for `fetch`, `XMLHttpRequest`, `WebSocket`, analytics
libraries, and external scripts. The application has no analytics, external
scripts, external APIs, or application data upload. The only `fetch` calls are
the same-origin service-worker shell install and same-origin runtime cache
fallback in `public/sw.js`. The service worker does not send health data to a
third party.

The browser itself may still expose normal platform behavior such as browser
sync, extensions, backups, or developer tools; Niramaya does not configure
those systems.

## Offline operation

The app shell, manifest, and icons are precached by service-worker cache
`niramaya-v5`. Same-origin assets discovered from the built shell and later
same-origin GET responses are cached. If a same-origin request fails, the
service worker serves the cached `/` shell. A newly installed or updated
service worker may require one refresh after an update before the new cache is
active.

Offline availability depends on the service worker having installed while the
site was reachable and on the browser retaining its Cache Storage. Users
should verify their own installed PWA before relying on it.

## Browser-local storage limits

LocalStorage is not encrypted, is readable by anyone with access to the
device and browser profile, can be cleared by the user or browser, is not
automatically backed up, and is not synchronized between devices by Niramaya.
The repository provides JSON export/import, but it does not provide a hosted
backup or account sync service.

## Safety boundaries

DoseDecision is a rule-based, explainable presentation layer. It processes
saved clinician instructions, flags missing or conflicting records, and refers
the user to a doctor or pharmacist when the saved information is insufficient.
It does not diagnose, prescribe, infer clinical advice, or replace a
healthcare professional.

The Safety Checker checks medication records for mistakes and consistency only.
It does not check drug interactions, make a diagnosis, validate a prescription,
or decide which conflicting schedule is clinically correct. It never
automatically changes medication data.

No software can guarantee clinical accuracy from incomplete or incorrectly
entered records. Users must follow verified instructions from their clinician
and seek professional verification when a record is missing, incomplete, or
conflicting.

Niramaya is not medical advice and does not replace a doctor or pharmacist.
The project makes no claim of regulatory certification, clinical validation,
HIPAA/GDPR compliance, encryption, or secure authentication.
