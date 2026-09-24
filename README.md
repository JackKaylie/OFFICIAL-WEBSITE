# OFFICIAL-WEBSITE
The official website of Jack Kaylie

## Google sign-in and typing test sync

The typing test works immediately with browser-local storage. To enable Google sign-in and cross-device sync:

1. Create a Firebase project and add a Web app.
2. In Authentication, enable the Google provider.
3. Create a Firestore database.
4. Copy the Web app configuration into `pages/firebase-config.js`.
5. Add `localhost` to the Firebase Authentication authorized domains.
6. Serve this folder through a local web server. Google popup sign-in will not work reliably from a `file://` URL.

Use these Firestore rules so each signed-in user can access only their own settings and runs:

```text
rules_version = '2';
service cloud.firestore {
	match /databases/{database}/documents {
		match /users/{userId} {
			allow read, write: if request.auth != null && request.auth.uid == userId;

			match /typingRuns/{runId} {
				allow read, write: if request.auth != null && request.auth.uid == userId;
			}
		}
	}
}
```
