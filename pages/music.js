(() => {
    const elements = {
        status: document.getElementById('music-library-status'),
        footerCount: document.getElementById('music-footer-count'),
        tabs: [...document.querySelectorAll('.music-tab')],
        search: document.getElementById('music-search'),
        trackList: document.getElementById('music-track-list'),
        playerArt: document.getElementById('music-player-art'),
        playerTitle: document.getElementById('music-player-title'),
        playerCategory: document.getElementById('music-player-category'),
        playerAudio: document.getElementById('music-player-audio'),
        pagination: document.getElementById('music-pagination'),
        previousPage: document.getElementById('music-page-previous'),
        nextPage: document.getElementById('music-page-next'),
        pageStatus: document.getElementById('music-page-status'),
        admin: document.getElementById('music-admin'),
        adminGate: document.getElementById('music-admin-gate'),
        gateStatus: document.getElementById('music-gate-status'),
        authStatus: document.getElementById('music-auth-status'),
        signIn: document.getElementById('music-sign-in'),
        signOut: document.getElementById('music-sign-out'),
        uploadForm: document.getElementById('music-upload-form'),
        titleInput: document.querySelector('#music-upload-form [name="title"]'),
        audioInput: document.querySelector('#music-upload-form [name="audio"]'),
        uploadButton: document.getElementById('music-upload-button'),
        uploadStatus: document.getElementById('music-upload-status')
    };

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
    let titleManuallyEdited = false;
    let currentPage = 1;
    let selectedTrackId = null;
    const pageSize = 8;

    function isAdmin() {
        return Boolean(currentUser && currentUser.uid === window.CORE_DRAWING_ADMIN_UID);
    }

    function extensionOf(file) {
        return file.name.split('.').pop().toLowerCase();
    }

    function updateTitleFromAudio() {
        const audioFile = elements.audioInput.files[0];
        if (!audioFile || titleManuallyEdited) return;
        elements.titleInput.value = audioFile.name.replace(/\.[^.]+$/, '');
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
        currentPage = 1;
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
        const pageCount = Math.max(1, Math.ceil(visibleTracks.length / pageSize));
        currentPage = Math.min(currentPage, pageCount);
        const startIndex = (currentPage - 1) * pageSize;
        const pageTracks = visibleTracks.slice(startIndex, startIndex + pageSize);
        elements.trackList.replaceChildren();
        elements.footerCount.textContent = `${tracks.length} TRACK${tracks.length === 1 ? '' : 'S'} INDEXED`;
        elements.pagination.hidden = visibleTracks.length <= pageSize;
        elements.previousPage.disabled = currentPage <= 1;
        elements.nextPage.disabled = currentPage >= pageCount;
        elements.pageStatus.textContent = `PAGE ${currentPage} OF ${pageCount}`;

        if (!visibleTracks.length) {
            const empty = document.createElement('p');
            empty.className = 'music-empty-state';
            empty.textContent = tracks.length
                ? 'No tracks match this view.'
                : 'The archive is empty. Sign in as the site admin to import or add tracks.';
            elements.trackList.append(empty);
            return;
        }

        pageTracks.forEach((track, index) => {
            const row = document.createElement('article');
            row.className = 'music-track';
            row.dataset.category = track.category === 'released' ? 'released' : 'unreleased';
            row.classList.toggle('is-selected', track.id === selectedTrackId);

            const number = document.createElement('span');
            number.className = 'music-track-number';
            number.textContent = String(startIndex + index + 1).padStart(2, '0');

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

            const selectButton = document.createElement('button');
            selectButton.className = 'music-track-select';
            selectButton.type = 'button';
            selectButton.textContent = track.id === selectedTrackId && !elements.playerAudio.paused ? 'Pause' : 'Play';
            selectButton.setAttribute('aria-label', `${selectButton.textContent} ${track.title || 'untitled track'}`);
            selectButton.addEventListener('click', () => playTrack(track));

            row.append(number, art, info, selectButton);
            if (isAdmin()) row.append(createAdminControls(track));
            elements.trackList.append(row);
        });
    }

    async function playTrack(track) {
        if (track.id === selectedTrackId && !elements.playerAudio.paused) {
            elements.playerAudio.pause();
            renderTracks();
            return;
        }
        if (track.id !== selectedTrackId) {
            selectedTrackId = track.id;
            elements.playerAudio.src = track.audioURL;
            elements.playerTitle.textContent = track.title || 'Untitled track';
            elements.playerCategory.textContent = track.category === 'released' ? 'Released' : 'Unreleased';
            elements.playerArt.replaceChildren();
            if (track.coverURL) {
                const image = document.createElement('img');
                image.src = track.coverURL;
                image.alt = '';
                elements.playerArt.append(image);
            } else {
                elements.playerArt.textContent = 'G.';
            }
        }
        renderTracks();
        try {
            await elements.playerAudio.play();
        } catch {
            elements.status.textContent = 'Could not play this track. Check the audio file and Storage URL.';
        }
        renderTracks();
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
        } else {
            elements.gateStatus.textContent = 'This Google account is not the configured site admin.';
            elements.authStatus.textContent = 'This account does not have music management access.';
        }
        renderTracks();
    }

    async function uploadObject(path, file, contentType) {
        const reference = storage.ref(path);
        await reference.put(file, { contentType });
        return reference.getDownloadURL();
    }

    async function uploadTrack({ title, category, audioFile, coverFile }) {
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
            titleManuallyEdited = false;
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
            if (track.id === selectedTrackId) {
                elements.playerTitle.textContent = track.title || 'Untitled track';
                elements.playerCategory.textContent = track.category === 'released' ? 'Released' : 'Unreleased';
            }
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
            if (track.id === selectedTrackId) {
                selectedTrackId = null;
                elements.playerAudio.pause();
                elements.playerAudio.removeAttribute('src');
                elements.playerTitle.textContent = 'Choose a track';
                elements.playerCategory.textContent = 'GREMLIN';
                elements.playerArt.textContent = 'G.';
            }
            elements.status.textContent = 'Track removed.';
            await loadTracks();
        } catch (error) {
            elements.status.textContent = errorMessage(error);
        }
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
    elements.search.addEventListener('input', () => {
        currentPage = 1;
        renderTracks();
    });
    elements.previousPage.addEventListener('click', () => {
        currentPage = Math.max(1, currentPage - 1);
        renderTracks();
    });
    elements.nextPage.addEventListener('click', () => {
        currentPage += 1;
        renderTracks();
    });
    elements.playerAudio.addEventListener('play', renderTracks);
    elements.playerAudio.addEventListener('pause', renderTracks);
    elements.audioInput.addEventListener('change', updateTitleFromAudio);
    elements.titleInput.addEventListener('input', () => {
        titleManuallyEdited = true;
    });
    elements.uploadForm.addEventListener('submit', handleUpload);
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