(() => {
    const elements = {
        library: document.getElementById('drawing-library'),
        authStatus: document.getElementById('drawing-auth-status'),
        signIn: document.getElementById('drawing-sign-in'),
        signOut: document.getElementById('drawing-sign-out'),
        libraryStatus: document.getElementById('drawing-library-status'),
        libraryTab: document.getElementById('drawing-tab-library'),
        completedTab: document.getElementById('drawing-tab-completed'),
        random: document.getElementById('drawing-random'),
        grid: document.getElementById('drawing-reference-grid'),
        uploadSection: document.getElementById('drawing-upload-section'),
        adminNote: document.getElementById('drawing-admin-note'),
        uploadForm: document.getElementById('drawing-upload-form'),
        license: document.getElementById('drawing-license'),
        source: document.getElementById('drawing-source'),
        files: document.getElementById('drawing-files'),
        rights: document.getElementById('drawing-rights-confirmation'),
        uploadButton: document.getElementById('drawing-upload-button'),
        uploadStatus: document.getElementById('drawing-upload-status'),
        dialog: document.getElementById('drawing-dialog'),
        dialogImage: document.getElementById('drawing-dialog-image'),
        dialogCaption: document.getElementById('drawing-dialog-caption'),
        dialogClose: document.getElementById('drawing-dialog-close')
    };
    let auth;
    let database;
    let storage;
    let currentUser = null;
    let references = [];
    let activeView = 'library';

    function isAdmin() {
        return Boolean(currentUser && currentUser.uid === window.CORE_DRAWING_ADMIN_UID);
    }

    function showDialog(reference) {
        elements.dialogImage.src = reference.downloadURL;
        elements.dialogImage.alt = reference.title || 'Drawing reference';
        elements.dialogCaption.textContent = `${reference.title || 'Untitled reference'} · ${reference.license || 'License not specified'}`;
        document.body.classList.add('drawing-dialog-open');
        elements.dialog.showModal();
    }

    function addSourceLink(container, reference) {
        if (!reference.sourceURL) return;
        try {
            const source = new URL(reference.sourceURL);
            if (source.protocol !== 'https:' && source.protocol !== 'http:') return;
            const link = document.createElement('a');
            link.className = 'drawing-reference-source';
            link.href = source.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'View source';
            container.append(link);
        } catch {
            return;
        }
    }

    function renderReferences() {
        const visibleReferences = references.filter((reference) => (
            activeView === 'completed' ? reference.completed === true : reference.completed !== true
        ));
        elements.grid.replaceChildren();
        elements.random.disabled = visibleReferences.length === 0;
        elements.libraryTab.setAttribute('aria-selected', String(activeView === 'library'));
        elements.completedTab.setAttribute('aria-selected', String(activeView === 'completed'));

        if (visibleReferences.length === 0) {
            const emptyState = document.createElement('p');
            emptyState.className = 'drawing-status';
            emptyState.textContent = activeView === 'completed'
                ? 'No completed drawings yet. Mark a reference complete after you finish drawing it.'
                : references.length === 0
                    ? 'No references yet. Sign in as the site admin to add the first images.'
                    : 'All references are completed. Find them in Completed Drawings.';
            elements.grid.append(emptyState);
            return;
        }

        visibleReferences.forEach((reference) => {
            const card = document.createElement('article');
            card.className = 'drawing-reference-card';

            const openButton = document.createElement('button');
            openButton.className = 'drawing-reference-open';
            openButton.type = 'button';
            openButton.setAttribute('aria-label', `View ${reference.title || 'drawing reference'}`);
            openButton.addEventListener('click', () => showDialog(reference));

            const image = document.createElement('img');
            image.src = reference.downloadURL;
            image.alt = reference.title || 'Drawing reference';
            image.loading = 'lazy';
            openButton.append(image);
            card.append(openButton);

            const info = document.createElement('div');
            info.className = 'drawing-reference-info';
            const title = document.createElement('h3');
            title.textContent = reference.title || 'Untitled reference';
            const metadata = document.createElement('p');
            metadata.className = 'drawing-reference-meta';
            metadata.textContent = reference.license || 'License not specified';
            info.append(title, metadata);
            addSourceLink(info, reference);

            if (isAdmin()) {
                const completeLabel = document.createElement('label');
                completeLabel.className = 'drawing-complete';
                const completeCheckbox = document.createElement('input');
                completeCheckbox.type = 'checkbox';
                completeCheckbox.checked = reference.completed === true;
                completeCheckbox.setAttribute('aria-label', `Mark ${reference.title || 'drawing'} completed`);
                completeCheckbox.addEventListener('change', () => setReferenceCompleted(reference, completeCheckbox));
                const completeText = document.createElement('span');
                completeText.textContent = 'Completed';
                completeLabel.append(completeCheckbox, completeText);
                info.append(completeLabel);
            } else if (reference.completed === true) {
                const completedLabel = document.createElement('span');
                completedLabel.className = 'drawing-completion-status';
                completedLabel.textContent = 'Completed';
                info.append(completedLabel);
            }

            if (isAdmin()) {
                const removeButton = document.createElement('button');
                removeButton.className = 'drawing-delete';
                removeButton.type = 'button';
                removeButton.textContent = 'Remove';
                removeButton.setAttribute('aria-label', `Remove ${reference.title || 'drawing reference'}`);
                removeButton.addEventListener('click', () => removeReference(reference));
                info.append(removeButton);
            }

            card.append(info);
            elements.grid.append(card);
        });
    }

    async function loadReferences() {
        elements.libraryStatus.textContent = 'Loading references...';
        try {
            const snapshot = await database.collection('drawingReferences')
                .orderBy('createdAt', 'desc')
                .get();
            references = snapshot.docs.map((documentSnapshot) => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            }));
            const completedCount = references.filter((reference) => reference.completed === true).length;
            elements.libraryStatus.textContent = `${references.length - completedCount} in library · ${completedCount} completed`;
            renderReferences();
        } catch (error) {
            elements.libraryStatus.textContent = error.code === 'permission-denied'
                ? 'Reference access is blocked. Publish the provided Firestore rules.'
                : 'Could not load references. Check the Firebase setup and connection.';
            elements.grid.replaceChildren();
        }
    }

    function updateAuthControls(user) {
        currentUser = user;
        elements.signIn.hidden = Boolean(user);
        elements.signOut.hidden = !user;

        const configuredAdminUid = String(window.CORE_DRAWING_ADMIN_UID || '').trim();
        if (!user) {
            elements.authStatus.textContent = 'Sign in to upload references and track completed drawings.';
            elements.uploadSection.hidden = true;
            elements.uploadForm.hidden = true;
            renderReferences();
            return;
        }

        const displayName = user.displayName || user.email || 'Google account';
        elements.authStatus.textContent = `Signed in as ${displayName}`;
        if (!configuredAdminUid) {
            elements.uploadSection.hidden = false;
            elements.uploadForm.hidden = true;
            elements.adminNote.replaceChildren(document.createTextNode('Admin setup needed. Copy this UID into CORE_DRAWING_ADMIN_UID in firebase-config.js and the Firebase rules: '));
            const uid = document.createElement('code');
            uid.className = 'drawing-admin-uid';
            uid.textContent = user.uid;
            elements.adminNote.append(uid);
        } else if (isAdmin()) {
            elements.uploadSection.hidden = false;
            elements.uploadForm.hidden = false;
            elements.adminNote.textContent = 'Upload access and completion tracking are enabled for this admin account.';
        } else {
            elements.uploadSection.hidden = true;
            elements.uploadForm.hidden = true;
            elements.authStatus.textContent = 'Signed in. This account is not the configured site admin.';
        }
        renderReferences();
    }

    function readableUploadError(error) {
        if (error.code === 'storage/unauthorized' || error.code === 'permission-denied') {
            return 'Upload denied. Check that your UID matches the admin UID in the site config and Firebase rules.';
        }
        if (error.code === 'storage/bucket-not-found') {
            return 'Firebase Storage is not enabled for this project yet.';
        }
        return error.message || 'Upload failed. Check the Firebase setup and try again.';
    }

    async function setReferenceCompleted(reference, checkbox) {
        if (!isAdmin()) {
            elements.uploadStatus.textContent = 'Sign in with the site admin account to update completion status.';
            checkbox.checked = reference.completed === true;
            return;
        }

        const completed = checkbox.checked;
        checkbox.disabled = true;
        try {
            await database.collection('drawingReferences').doc(reference.id).update({
                completed,
                completedAt: completed ? firebase.firestore.FieldValue.serverTimestamp() : null,
                completedBy: completed ? currentUser.uid : null
            });
            reference.completed = completed;
            elements.uploadStatus.textContent = completed ? 'Drawing marked completed.' : 'Drawing moved back to the library.';
            const completedCount = references.filter((item) => item.completed === true).length;
            elements.libraryStatus.textContent = `${references.length - completedCount} in library · ${completedCount} completed`;
            renderReferences();
        } catch (error) {
            checkbox.checked = reference.completed === true;
            elements.uploadStatus.textContent = error.code === 'permission-denied'
                ? 'Could not update completion. Publish the admin-only Firestore rules.'
                : error.message || 'Could not update completion status.';
        } finally {
            checkbox.disabled = false;
        }
    }

    async function uploadReferences(event) {
        event.preventDefault();
        const files = [...elements.files.files];
        const license = elements.license.value;
        const sourceURL = elements.source.value.trim();
        const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

        if (!isAdmin()) {
            elements.uploadStatus.textContent = 'Sign in with the configured site admin account to upload.';
            return;
        }
        if (files.length === 0) {
            elements.uploadStatus.textContent = 'Choose at least one image.';
            return;
        }
        const invalidFile = files.find((file) => !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024);
        if (invalidFile) {
            elements.uploadStatus.textContent = `${invalidFile.name} must be JPEG, PNG, or WebP and no larger than 10 MB.`;
            return;
        }

        elements.uploadButton.disabled = true;
        let uploaded = 0;
        const failures = [];
        for (const file of files) {
            elements.uploadStatus.textContent = `Uploading ${uploaded + 1} of ${files.length}: ${file.name}`;
            const documentReference = database.collection('drawingReferences').doc();
            const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
            const storagePath = `drawing-references/${currentUser.uid}/${documentReference.id}.${extension}`;
            const storageReference = storage.ref(storagePath);

            try {
                await storageReference.put(file, { contentType: file.type });
                const downloadURL = await storageReference.getDownloadURL();
                await documentReference.set({
                    title: file.name.replace(/\.[^.]+$/, ''),
                    license,
                    sourceURL,
                    downloadURL,
                    storagePath,
                    completed: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: currentUser.uid
                });
                uploaded += 1;
            } catch (error) {
                await storageReference.delete().catch(() => {});
                failures.push(`${file.name}: ${readableUploadError(error)}`);
            }
        }

        elements.uploadButton.disabled = false;
        elements.uploadStatus.textContent = failures.length
            ? `${uploaded} uploaded. ${failures.join(' ')}`
            : `${uploaded} reference${uploaded === 1 ? '' : 's'} uploaded.`;
        if (uploaded > 0) {
            elements.files.value = '';
            elements.rights.checked = false;
            await loadReferences();
        }
    }

    async function removeReference(reference) {
        if (!isAdmin() || !window.confirm(`Remove "${reference.title || 'this reference'}" from the library?`)) return;
        try {
            if (reference.storagePath) await storage.ref(reference.storagePath).delete();
            await database.collection('drawingReferences').doc(reference.id).delete();
            elements.uploadStatus.textContent = 'Reference removed.';
            await loadReferences();
        } catch (error) {
            elements.uploadStatus.textContent = readableUploadError(error);
        }
    }

    function connectFirebase() {
        if (!window.CORE_FIREBASE_CONFIG || !window.firebase?.auth || !window.firebase?.storage) {
            elements.authStatus.textContent = 'Firebase is unavailable. Open the site through its hosted URL or a local web server.';
            elements.libraryStatus.textContent = 'The online reference library needs Firebase.';
            return;
        }

        try {
            const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window.CORE_FIREBASE_CONFIG);
            auth = app.auth();
            database = app.firestore();
            storage = app.storage();
            auth.onAuthStateChanged(updateAuthControls);
            loadReferences();
        } catch {
            elements.authStatus.textContent = 'Could not connect to Firebase. Check the project configuration.';
            elements.libraryStatus.textContent = 'The online reference library could not connect.';
        }
    }

    elements.libraryTab.addEventListener('click', () => {
        activeView = 'library';
        renderReferences();
    });
    elements.completedTab.addEventListener('click', () => {
        activeView = 'completed';
        renderReferences();
    });
    elements.random.addEventListener('click', () => {
        const visibleReferences = references.filter((reference) => (
            activeView === 'completed' ? reference.completed === true : reference.completed !== true
        ));
        if (visibleReferences.length > 0) {
            showDialog(visibleReferences[Math.floor(Math.random() * visibleReferences.length)]);
        }
    });
    elements.dialogClose.addEventListener('click', () => {
        document.body.classList.remove('drawing-dialog-open');
        elements.dialog.close();
    });
    elements.dialog.addEventListener('close', () => document.body.classList.remove('drawing-dialog-open'));
    elements.dialog.addEventListener('cancel', () => document.body.classList.remove('drawing-dialog-open'));
    elements.dialog.addEventListener('click', (event) => {
        if (event.target === elements.dialog) {
            document.body.classList.remove('drawing-dialog-open');
            elements.dialog.close();
        }
    });
    elements.signIn.addEventListener('click', async () => {
        try {
            await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        } catch (error) {
            elements.authStatus.textContent = error.code === 'auth/unauthorized-domain'
                ? 'This domain is not authorized for Firebase sign-in.'
                : error.message || 'Google sign-in failed.';
        }
    });
    elements.signOut.addEventListener('click', () => auth.signOut());
    elements.uploadForm.addEventListener('submit', uploadReferences);
    connectFirebase();
})();