# Five-minute demo script

This script uses fictional sample data only. It demonstrates the implemented
application without presenting it as medical advice.

## Pre-demo setup checklist

- Have the app built and served from the intended environment.
- Add a fictional patient and fictional medication records such as
  “Demo Medicine”, with dosage, scheduled times, and clinician notes clearly
  marked as fictional.
- Prepare one clean medication record and one record with an intentionally
  missing field for the Safety Check demonstration.
- Set browser zoom to a comfortable level and keep the browser viewport
  visible.
- Verify the language selector and service worker once while online.
- Prepare a backup plan: if offline installation or a browser permission
  fails, continue with the already loaded app and state that the offline
  check will be completed afterward.
- Total time budget: **5:00**.

## 1. Problem and motivation — 0:25

**Click sequence:** Start on `/`; show the header and today’s schedule.

**Say this:** “Older adults and caregivers often need one clear place to see
what is scheduled, what was recorded, and what still needs professional
verification. Niramaya is designed for that local, everyday workflow.”

## 2. Niramaya introduction — 0:25

**Click sequence:** Point to the header navigation: “Senior Mode”, “Missed
Dose”, “Caregiver”, “Emergency”, “Safety Check”, and “Settings”.

**Say this:** “Niramaya is an offline-first medication PWA. It keeps records
in the browser on this device and provides separate views for the patient,
caregiver, emergency information, and record checking.”

## 3. Senior Mode and medication schedule — 0:40

**Click sequence:** In “Senior Mode”, click “+ Add Medication”; show the
“Medication Name”, “Dosage / Strength”, “Scheduled Times”, and
“Save Medication” controls; return to “Today’s Medications”; click “Mark as
Taken” and confirm “Confirm Dose”.

**Say this:** “Senior Mode uses larger controls and shows today’s schedule.
Medication names and patient-entered details remain as entered. A dose is
recorded only after confirmation, and the storage layer prevents a duplicate
log for the same medication, date, and scheduled time.”

## 4. DoseDecision — 0:40

**Click sequence:** Open “Missed Dose”; choose the fictional medication, choose
its scheduled time, then click “Evaluate Missed Dose Guidance”. Show the
result card and its recorded instruction section.

**Say this:** “DoseDecision is rule-based and explainable. It reads the
clinician-provided instructions saved in the record and distinguishes verified,
partial, missing, conflicting, already-recorded, and unknown information. It
does not diagnose, prescribe, or act as an autonomous doctor; uncertain cases
are referred to a clinician or pharmacist.”

## 5. Caregiver Mode — 0:35

**Click sequence:** Open “Caregiver”; if configured, enter the fictional
four-digit PIN; show “7-Day Overview”, “Missed & Unconfirmed Doses”, and
“Caregiver Observations”; click “+ Add Observation” and then “Print Report”.

**Say this:** “CareCircle calculates a seven-day view from scheduled doses,
logs, and corrections. A caregiver can review missed or unconfirmed history,
add an observation, and print the report. The optional PIN is a local
convenience barrier, not high-security authentication.”

## 6. Emergency Snapshot — 0:30

**Click sequence:** Open “Emergency”; click “Edit Info”; show the patient,
allergy, emergency-contact, and primary-doctor fields; cancel or save only
fictional values; show the “Tap to Call Emergency Contact” action if
configured.

**Say this:** “The Emergency Snapshot, also called the Swasthya Card, keeps
patient-entered emergency information and current prescriptions together.
Phone fields are validated before saving. The card can be viewed offline and
can call the saved contact through the device’s phone handler.”

## 7. Safety Checker — 0:30

**Click sequence:** Open “Safety Check”; show the persistent disclaimer and
severity summary; show the intentionally incomplete fictional record; use
“Review record”.

**Say this:** “Safety Check looks for mistakes in the saved records: missing
fields, duplicates, explicit duplicate ingredients, and schedule problems.
It reports severity and certainty, but it does not check drug interactions,
decide which conflicting time is correct, or provide medical advice.”

## 8. English/Hindi/Kannada — 0:25

**Click sequence:** Use the header language selector to choose “हिन्दी”, then
“ಕನ್ನಡ”, then “English”.

**Say this:** “The interface supports English, Hindi, and Kannada. The selected
language persists locally, updates the document language, and uses the active
locale for dates and times. Medicine names and patient-entered information are
not translated.”

## 9. Offline capability — 0:25

**Click sequence:** With the app loaded, open DevTools, enable Offline, reload,
and revisit a previously loaded view. If the demo environment is not ready,
show the prepared offline checklist instead.

**Say this:** “The service worker caches the app shell and same-origin assets,
then caches later same-origin application responses. The offline fallback is
the cached root shell. A real device should be tested online first so the
service worker can install.”

## 10. Unique contribution and conclusion — 0:25

**Click sequence:** Return to “Senior Mode” and point to the Safety Check
summary and the local language selector.

**Say this:** “Niramaya combines a senior-friendly schedule, explainable
clinician-instruction presentation, caregiver visibility, emergency context,
and record-quality checking without sending health data to a hosted service.
It is not medical advice, is not a replacement for a doctor or pharmacist,
and its results depend on the accuracy and completeness of local records.”

**Total:** 0:25 + 0:25 + 0:40 + 0:40 + 0:35 + 0:30 + 0:30 + 0:25 +
0:25 + 0:25 = **5:00**.
