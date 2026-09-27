# OFFICIAL-WEBSITE
The official website of Jack Kaylie

## Firebase setup

The typing test works immediately with browser-local storage. To enable Google sign-in and cross-device sync, configure the Firebase web app in `pages/firebase-config.js`, enable Google under Authentication, create a Firestore database, and add your hosted domain (and `localhost` when developing) to the authorized domains.

Serve this folder through a local web server or its HTTPS hosted URL. Firebase authentication and uploads will not work reliably from a `file://` URL.

## Drawing reference library

Images are stored in Firebase Storage; source, license, and completion status are stored in Firestore. The public can browse the reference library and completed drawings, while only the configured admin can upload or remove images and update completion status.

1. In Firebase Console, enable Google sign-in, create Firestore, and enable Firebase Storage for this project.
2. Open the site through its hosted URL or a local web server, then go to Games > Drawing References and sign in with Google.
3. Copy your UID from the admin setup message or Firebase Authentication > Users. Set `window.CORE_DRAWING_ADMIN_UID` in `pages/firebase-config.js` to that UID.
4. Make sure the admin UID in both `firestore.rules` and `storage.rules` matches the config value.
5. Publish the contents of `firestore.rules` in Firebase Console > Firestore Database > Rules, and `storage.rules` in Firebase Console > Storage > Rules.
6. Reload the page. The admin upload form will be available for JPEG, PNG, or WebP images up to 10 MB each. Add a license/permission and source URL where applicable. Use the Library and Completed Drawings tabs to track finished drawings.

The rule files preserve per-user access for typing-test settings and runs, allow public reads of the reference library, and restrict reference writes/deletes to the one admin UID. Do not replace the admin checks with unrestricted authenticated or public writes.
