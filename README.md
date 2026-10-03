# OFFICIAL-WEBSITE
The official website of Jack Kaylie

## Firebase setup

The typing test works immediately with browser-local storage. To enable Google sign-in and cross-device sync, configure the Firebase web app in `pages/firebase-config.js`, enable Google under Authentication, create a Firestore database, and add your hosted domain (and `localhost` when developing) to the authorized domains.

Serve this folder through a local web server or its HTTPS hosted URL. Firebase authentication and uploads will not work reliably from a `file://` URL.

## Drawing reference library

Drawing References has its own page at [pages/drawing-references.html](pages/drawing-references.html), linked from Games.

Images are stored in Firebase Storage; source, license, and completion status are stored in Firestore. The public can browse the reference library and completed drawings, while only the configured admin can upload or remove images and update completion status.

1. In Firebase Console, enable Google sign-in, create Firestore, and enable Firebase Storage for this project.
2. Open the site through its hosted URL or a local web server, then go to Games > Drawing References and sign in with Google.
3. Copy your UID from the admin setup message or Firebase Authentication > Users. Set `window.CORE_DRAWING_ADMIN_UID` in `pages/firebase-config.js` to that UID.
4. Make sure the admin UID in both `firestore.rules` and `storage.rules` matches the config value.
5. Publish the contents of `firestore.rules` in Firebase Console > Firestore Database > Rules, and `storage.rules` in Firebase Console > Storage > Rules.
6. Reload the page. The admin upload form will be available for JPEG, PNG, or WebP images up to 10 MB each. Add a license/permission and source URL where applicable. Use the Library and Completed Drawings tabs to track finished drawings.

The rule files preserve per-user access for typing-test settings and runs, allow public reads of the reference library, and restrict reference writes/deletes to the one admin UID. Do not replace the admin checks with unrestricted authenticated or public writes.

## Habit tracker

Open Games > Habit Tracker or [pages/habit-tracker.html](pages/habit-tracker.html). Add named daily checklist compartments such as Morning Routine or Phone Apps, each with its own inner checklist, notes, item completion count, and streak. Use Add Checklist to create a compartment, and its inline Add item field to add child items. Edit a compartment to rename it, update notes, or change its items (one per line). Compartments can be collapsed or expanded, and that preference is saved.

Checking every child item completes its compartment; checking the parent checkbox completes every child item. Adding a new item makes the compartment incomplete again. The All, Due, and Done tabs filter today's compartments.

Checkmarks reset at midnight in the device's local timezone, including while the page is open and when returning after a missed day. Task titles, notes, and steps remain. Streaks count consecutive completed calendar days; a missed day breaks the streak.

The checklist editor's Streak (days) field lets you correct the displayed streak total. Today's completion is included in that total, and future daily completions continue increasing it normally. A checklist completed today has a minimum streak of 1; an incomplete checklist can be reset to 0.

Dailies are saved in this browser's local storage, not synced with Google or other devices. Clearing site data removes them. If storage is blocked or full, the page displays a warning and changes only survive in the current tab.

## Music library

Music files are stored in Firebase Storage under `music/`; track titles, release status, and file URLs are stored in the `musicTracks` Firestore collection. The music page is public-read, while uploads, edits, and deletes require the configured site admin Google account.

1. In Firebase Console, make sure Cloud Firestore and Firebase Storage are enabled for the project. Choose a Storage bucket location near your audience. Google may require the project to be on the Blaze billing plan to create or use a Storage bucket; check the Firebase Console for the current project requirements and pricing.
2. Enable Google sign-in in Firebase Authentication, and add your hosted website domain (and `localhost` for local development) to the authorized domains.
3. Publish `firestore.rules` in Firebase Console > Firestore Database > Rules and `storage.rules` in Firebase Console > Storage > Rules. These rules make music readable by visitors but keep writes limited to the existing admin UID.
4. Open `pages/music.html` through the hosted site or a local web server, sign in using the Google account whose UID matches `CORE_DRAWING_ADMIN_UID`, and use the admin panel to upload tracks. New tracks can be added from the upload form without editing the page or redeploying.

The music page accepts MP3, WAV, M4A, and OGG audio up to 100 MB, and JPEG, PNG, or WebP artwork up to 10 MB. MP3 is recommended for faster playback and lower bandwidth. Tracks marked “Unreleased” are still public and playable; do not upload anything that must remain private.
