(() => {
    const elements = {
        status: document.getElementById('music-library-status'),
        footerCount: document.getElementById('music-footer-count'),
        tabs: [...document.querySelectorAll('.music-tab')],
        search: document.getElementById('music-search'),
        trackList: document.getElementById('music-track-list'),
        admin: document.getElementById('music-admin'),
        adminGate: document.getElementById('music-admin-gate'),
        gateStatus: document.getElementById('music-gate-status'),
        authStatus: document.getElementById('music-auth-status'),
        signIn: document.getElementById('music-sign-in'),
        signOut: document.getElementById('music-sign-out'),
        migration: document.getElementById('music-migration'),
        importButton: document.getElementById('music-import-legacy'),
        uploadForm: document.getElementById('music-upload-form'),
        uploadButton: document.getElementById('music-upload-button'),
        uploadStatus: document.getElementById('music-upload-status')
    };

    const legacyTracks = [
        { title: 'POTENTIAL', file: 'netanyahu.wav', category: 'released', cover: '../SONG COVER.png' },
        { title: 'HALCYON', file: 'RNADOM 1.mp3', category: 'released', cover: '../HALCYON ART.jpg' },
        { title: 'MALEFIC', file: 'MALEFIC.mp3' },
        { title: 'INTERCALATION', file: 'INTERCALATION_3.mp3' },
        { title: 'UNNAMED', file: 'SANDMAN A$AP ROCKY TYPE BEAT_2.mp3' },
        { title: 'HELL SHELL REMIX', file: 'HELL SHELL REMAKE.mp3' },
        { title: 'UNNAMED', file: 'SCP067.mp3' },
        { title: 'UNNAMED', file: 'PURPLEDEMON.mp3' },
        { title: 'UNNAMED', file: 'jessie won.mp3' },
        { title: 'UNNAMED', file: 'BLAH BLAH.mp3' },
        { title: 'UNNAMED', file: 'NEW BEAT 8-6-2025.mp3' },
        { title: 'HOMIXIDE GANG TYPE BEAT', file: 'HOMIXIDE GANG TYPE BEAT.mp3' },
        { title: 'NOSTALGIC SYNTHEWAVE', file: 'NOSTALGIC SYNTHEWAVE.mp3' },
        { title: 'UNNAMED', file: 'OFF THE YART.mp3' },
        { title: 'UNNAMED', file: 'B STUDENT ACTIVITIES.mp3' },
        { title: 'UNNAMED', file: 'D STUDENT ACTIVITIES.mp3' },
        { title: 'UNNAMED', file: 'F STUDENT ACTIVITIES.mp3' },
        { title: 'UNNAMED', file: 'MESSING WITH VITAL 2.mp3' },
        { title: 'UNNAMED', file: 'RANDOM NEW.wav' },
        { title: 'UNNAMED', file: 'new 2.mp3' },
        { title: 'FREDDIE DREDD TYPE BEAT', file: 'NEWSONG_FREDDIE.mp3' }
    ].map((track) => ({ category: 'unreleased', ...track }));

    const audioTypes = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        m4a: 'audio/mp4',
        ogg: 'audio/ogg'
    };
    const imageTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp'
    };

    let auth;
    let database;
    let storage;
    let currentUser = null;
    let tracks = [];
    let activeCategory = 'all';

    function isAdmin() {
        return Boolean(currentUser && currentUser.uid === window.CORE_DRAWING_ADMIN_UID);
    }

    function extensionOf(file) {
        return file.name.split('.').pop().toLowerCase();
    }

    function errorMessage(error) {
        if (error.code === 'storage/unauthorized') {
            return 'Firebase Storage denied the audio upload. Publish storage.rules and confirm its admin UID matches CORE_DRAWING_ADMIN_UID.';
        }
        if (error.code === 'permission-denied') {
            return 'Firestore denied saving track details. Publish firestore.rules and confirm its admin UID matches CORE_DRAWING_ADMIN_UID.';
        }
        if (error.code === 'storage/bucket-not-found') {
            return 'The Firebase Storage bucket is not enabled for this project yet.';
        }
        if (error.code === 'storage/quota-exceeded') {
            return 'Firebase Storage quota was exceeded. Check the project billing and storage limits.';
        }
        if (error.code === 'auth/unauthorized-domain') {
            return 'This website domain is not authorized for Firebase sign-in.';
        }
        return error.message || 'The request failed. Check Firebase setup and try again.';
    }

    function setActiveTab(category) {
        activeCategory = category;
        elements.tabs.forEach((tab) => {
            const active = tab.dataset.category === category;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', String(active));
        });
        renderTracks();
    }

    function filteredTracks() {
        const query = elements.search.value.trim().toLowerCase();
        return tracks.filter((track) => {
            const matchesCategory = activeCategory === 'all' || track.category === activeCategory;
            const matchesSearch = !query || String(track.title || '').toLowerCase().includes(query);
            return matchesCategory && matchesSearch;
        });
    }

    function renderTracks() {
        const visibleTracks = filteredTracks();
        elements.trackList.replaceChildren();
        elements.footerCount.textContent = `${tracks.length} TRACK${tracks.length === 1 ? '' : 'S'} INDEXED`;

        if (!visibleTracks.length) {
            const empty = document.createElement('p');
            empty.className = 'music-empty-state';
            empty.textContent = tracks.length
                ? 'No tracks match this view.'
                : 'The archive is empty. Sign in as the site admin to import or add tracks.';
            elements.trackList.append(empty);
            return;
        }

        visibleTracks.forEach((track, index) => {
            const row = document.createElement('article');
            row.className = 'music-track';
            row.dataset.category = track.category === 'released' ? 'released' : 'unreleased';

            const number = document.createElement('span');
            number.className = 'music-track-number';
            number.textContent = String(index + 1).padStart(2, '0');

            const art = document.createElement('div');
            art.className = 'music-track-art';
            art.setAttribute('aria-label', track.coverURL ? `${track.title} cover art` : 'No cover art');
            if (track.coverURL) {
                const image = document.createElement('img');
                image.src = track.coverURL;
                image.alt = '';
                image.loading = 'lazy';
                image.addEventListener('error', () => {
                    image.remove();
                    art.textContent = 'G.';
                }, { once: true });
                art.append(image);
            } else {
                art.textContent = 'G.';
            }

            const info = document.createElement('div');
            info.className = 'music-track-info';
            const title = document.createElement('h3');
            title.textContent = track.title || 'Untitled track';
            const category = document.createElement('span');
            category.className = 'music-track-category';
            category.textContent = track.category === 'released' ? 'Released' : 'Unreleased';
            info.append(title, category);

            const audio = document.createElement('audio');
            audio.controls = true;
            audio.preload = 'none';
            audio.src = track.audioURL;
            audio.setAttribute('aria-label', `Play ${track.title || 'untitled track'}`);

            row.append(number, art, info, audio);
            if (isAdmin()) row.append(createAdminControls(track));
            elements.trackList.append(row);
        });
    }

    function createAdminControls(track) {
        const controls = document.createElement('div');
        controls.className = 'music-track-admin';

        const details = document.createElement('details');
        details.className = 'music-track-edit';
        const summary = document.createElement('summary');
        summary.textContent = 'Edit';
        const form = document.createElement('form');
        form.className = 'music-edit-form';

        const titleInput = document.createElement('input');
        titleInput.name = 'title';
        titleInput.type = 'text';
        titleInput.maxLength = 100;
        titleInput.required = true;
        titleInput.value = track.title || '';
        titleInput.setAttribute('aria-label', 'Track title');

        const categorySelect = document.createElement('select');
        categorySelect.name = 'category';
        categorySelect.setAttribute('aria-label', 'Track section');
        [['released', 'Released'], ['unreleased', 'Unreleased']].forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            categorySelect.append(option);
        });
        categorySelect.value = track.category === 'released' ? 'released' : 'unreleased';

        const save = document.createElement('button');
        save.className = 'music-button';
        save.type = 'submit';
        save.textContent = 'Save details';
        form.append(titleInput, categorySelect, save);
        form.addEventListener('submit', (event) => saveTrackDetails(event, track, form, details));
        details.append(summary, form);

        const remove = document.createElement('button');
        remove.className = 'music-track-remove';
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove ${track.title || 'track'}`);
        remove.addEventListener('click', () => removeTrack(track));
        controls.append(details, remove);
        return controls;
    }

    async function loadTracks() {
        elements.status.textContent = 'Loading archive...';
        try {
            const snapshot = await database.collection('musicTracks').orderBy('createdAt', 'desc').get();
            tracks = snapshot.docs.map((documentSnapshot) => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            }));
            elements.status.textContent = `${tracks.length} track${tracks.length === 1 ? '' : 's'} in the archive`;
            renderTracks();
            if (isAdmin()) updateMigrationAvailability();
        } catch (error) {
            const message = error.code === 'permission-denied'
                ? 'Track access is blocked. Publish the provided Firestore rules.'
                : 'Could not load the archive. Check the Firebase setup and connection.';
            elements.status.textContent = message;
            const empty = document.createElement('p');
            empty.className = 'music-empty-state';
            empty.textContent = message;
            elements.trackList.replaceChildren(empty);
        }
    }

    function updateAuthControls(user) {
        currentUser = user;
        const admin = isAdmin();
        elements.signIn.hidden = Boolean(user);
        elements.signOut.hidden = !user;
        elements.admin.hidden = !admin;
        elements.adminGate.hidden = admin;

        if (!user) {
            elements.gateStatus.textContent = 'Admin? Sign in to add or manage tracks.';
            elements.authStatus.textContent = 'Sign in with the configured site admin account.';
            renderTracks();
            return;
        }

        if (admin) {
            elements.authStatus.textContent = `Signed in as ${user.displayName || user.email || 'site admin'}`;
            elements.uploadForm.hidden = false;
            elements.migration.hidden = false;
            updateMigrationAvailability();
        } else {
            elements.gateStatus.textContent = 'This Google account is not the configured site admin.';
            elements.authStatus.textContent = 'This account does not have music management access.';
        }
        renderTracks();
    }

    function updateMigrationAvailability() {
        const importedFiles = new Set(tracks.map((track) => track.legacySource).filter(Boolean));
        const remaining = legacyTracks.filter((track) => !importedFiles.has(track.file)).length;
        elements.importButton.disabled = remaining === 0;
        elements.importButton.textContent = remaining ? `Import ${remaining} existing tracks` : 'Existing tracks imported';
    }

    async function uploadObject(path, file, contentType) {
        const reference = storage.ref(path);
        await reference.put(file, { contentType });
        return reference.getDownloadURL();
    }

    async function uploadTrack({ title, category, audioFile, coverFile, legacySource }) {
        const documentReference = database.collection('musicTracks').doc();
        const audioExtension = extensionOf(audioFile);
        const audioPath = `music/${documentReference.id}/audio.${audioExtension}`;
        const uploadedPaths = [audioPath];
        let coverPath = null;

        try {
            const audioURL = await uploadObject(audioPath, audioFile, audioTypes[audioExtension]);
            let coverURL = null;
            if (coverFile) {
                const coverExtension = extensionOf(coverFile);
                coverPath = `music/${documentReference.id}/cover.${coverExtension}`;
                uploadedPaths.push(coverPath);
                coverURL = await uploadObject(coverPath, coverFile, imageTypes[coverExtension]);
            }

            const record = {
                title: title.trim(),
                category,
                audioPath,
                audioURL,
                coverPath,
                coverURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser.uid
            };
            if (legacySource) record.legacySource = legacySource;
            await documentReference.set(record);
        } catch (error) {
            await Promise.all(uploadedPaths.map((path) => storage.ref(path).delete().catch(() => {})));
            throw error;
        }
    }

    async function handleUpload(event) {
        event.preventDefault();
        if (!isAdmin()) return;

        const formData = new FormData(elements.uploadForm);
        const audioFile = formData.get('audio');
        const coverFile = formData.get('cover');
        const audioExtension = extensionOf(audioFile);
        const coverExtension = coverFile.size ? extensionOf(coverFile) : '';
        if (!audioTypes[audioExtension] || audioFile.size > 100 * 1024 * 1024) {
            elements.uploadStatus.textContent = 'Choose an MP3, WAV, M4A, or OGG file no larger than 100 MB.';
            return;
        }
        if (coverFile.size && (!imageTypes[coverExtension] || coverFile.size > 10 * 1024 * 1024)) {
            elements.uploadStatus.textContent = 'Artwork must be JPEG, PNG, or WebP and no larger than 10 MB.';
            return;
        }

        elements.uploadButton.disabled = true;
        elements.uploadStatus.textContent = 'Uploading audio and saving track details...';
        try {
            await uploadTrack({
                title: formData.get('title'),
                category: formData.get('category'),
                audioFile,
                coverFile: coverFile.size ? coverFile : null
            });
            elements.uploadForm.reset();
            elements.uploadStatus.textContent = 'Track added to the archive.';
            await loadTracks();
        } catch (error) {
            elements.uploadStatus.textContent = errorMessage(error);
        } finally {
            elements.uploadButton.disabled = false;
        }
    }

    async function saveTrackDetails(event, track, form, details) {
        event.preventDefault();
        if (!isAdmin()) return;
        const saveButton = form.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        try {
            const formData = new FormData(form);
            const updated = {
                title: String(formData.get('title')).trim(),
                category: formData.get('category')
            };
            await database.collection('musicTracks').doc(track.id).update(updated);
            Object.assign(track, updated);
            details.open = false;
            elements.status.textContent = 'Track details updated.';
            renderTracks();
        } catch (error) {
            elements.status.textContent = errorMessage(error);
        } finally {
            saveButton.disabled = false;
        }
    }

    async function removeTrack(track) {
        if (!isAdmin() || !window.confirm(`Remove "${track.title || 'this track'}" from the archive?`)) return;
        try {
            for (const path of [track.audioPath, track.coverPath].filter(Boolean)) {
                await storage.ref(path).delete().catch((error) => {
                    if (error.code !== 'storage/object-not-found') throw error;
                });
            }
            await database.collection('musicTracks').doc(track.id).delete();
            elements.status.textContent = 'Track removed.';
            await loadTracks();
        } catch (error) {
            elements.status.textContent = errorMessage(error);
        }
    }

    async function fetchLegacyFile(path, contentType) {
        const url = new URL(path, window.location.href);
        const response = await fetch(url.href);
        if (!response.ok) throw new Error(`Could not fetch ${url.pathname} (${response.status}).`);
        const blob = await response.blob();
        return new Blob([blob], { type: contentType });
    }

    async function importLegacyTracks() {
        if (!isAdmin()) return;
        elements.importButton.disabled = true;
        const importedFiles = new Set(tracks.map((track) => track.legacySource).filter(Boolean));
        const pending = legacyTracks.filter((track) => !importedFiles.has(track.file));
        let imported = 0;
        const failures = [];
        let accessError = null;

        for (let index = 0; index < pending.length; index += 1) {
            const legacy = pending[index];
            elements.uploadStatus.textContent = `Importing ${index + 1} of ${pending.length}: ${legacy.title}`;
            try {
                const audioExtension = legacy.file.split('.').pop().toLowerCase();
                const audioBlob = await fetchLegacyFile(`../SONGS/${encodeURIComponent(legacy.file)}`, audioTypes[audioExtension]);
                const audioFile = new File([audioBlob], legacy.file, { type: audioTypes[audioExtension] });
                let coverFile = null;
                if (legacy.cover) {
                    const coverExtension = legacy.cover.split('.').pop().toLowerCase();
                    const coverBlob = await fetchLegacyFile(legacy.cover, imageTypes[coverExtension]);
                    coverFile = new File([coverBlob], `cover.${coverExtension}`, { type: imageTypes[coverExtension] });
                }
                await uploadTrack({
                    title: legacy.title,
                    category: legacy.category,
                    audioFile,
                    coverFile,
                    legacySource: legacy.file
                });
                imported += 1;
            } catch (error) {
                if (['storage/unauthorized', 'storage/bucket-not-found', 'storage/quota-exceeded', 'permission-denied'].includes(error.code)) {
                    accessError = error;
                    break;
                }
                failures.push(`${legacy.file}: ${errorMessage(error)}`);
            }
        }

        if (accessError) {
            const progress = imported ? `${imported} imported before the import stopped.` : 'Import stopped before the first track.';
            elements.uploadStatus.textContent = `${progress} ${errorMessage(accessError)}`;
        } else if (failures.length) {
            const details = failures.slice(0, 3).join(' ');
            const remaining = failures.length > 3 ? ` ${failures.length - 3} more file${failures.length - 3 === 1 ? '' : 's'} failed.` : '';
            elements.uploadStatus.textContent = `${imported} imported; ${failures.length} failed. ${details}${remaining} Check that the old site files are still deployed, then retry.`;
        } else {
            elements.uploadStatus.textContent = `${imported} existing track${imported === 1 ? '' : 's'} imported.`;
        }
        await loadTracks();
        elements.importButton.disabled = false;
        updateMigrationAvailability();
    }

    async function connectFirebase() {
        if (!window.CORE_FIREBASE_CONFIG || !window.firebase?.auth || !window.firebase?.storage) {
            elements.status.textContent = 'Firebase is unavailable. Open this page through the hosted site or a local web server.';
            elements.gateStatus.textContent = 'Firebase must be configured before the archive can be managed.';
            return;
        }
        try {
            const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window.CORE_FIREBASE_CONFIG);
            auth = app.auth();
            database = app.firestore();
            storage = app.storage();
            auth.onAuthStateChanged(updateAuthControls);
            await loadTracks();
        } catch (error) {
            elements.status.textContent = 'Could not connect to Firebase. Check the project configuration.';
            elements.gateStatus.textContent = errorMessage(error);
        }
    }

    elements.tabs.forEach((tab) => tab.addEventListener('click', () => setActiveTab(tab.dataset.category)));
    elements.search.addEventListener('input', renderTracks);
    elements.uploadForm.addEventListener('submit', handleUpload);
    elements.importButton.addEventListener('click', importLegacyTracks);
    elements.signIn.addEventListener('click', async () => {
        try {
            await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        } catch (error) {
            elements.gateStatus.textContent = errorMessage(error);
        }
    });
    elements.signOut.addEventListener('click', () => auth.signOut());
    connectFirebase();
})();