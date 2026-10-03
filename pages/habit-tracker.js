(() => {
    const storageKey = 'core-habit-tracker-v1';
    const list = document.getElementById('habit-list');
    const dialog = document.getElementById('habit-dialog');
    const form = document.getElementById('habit-form');
    const titleInput = document.getElementById('habit-title');
    const streakInput = document.getElementById('habit-streak');
    const notesInput = document.getElementById('habit-notes');
    const stepsInput = document.getElementById('habit-steps');
    const storageStatus = document.getElementById('habit-storage');
    let editingId = null;
    let initialStreak = 0;
    let filter = 'all';
    let resetTimer;
    let state;

    function dayKey(date = new Date()) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function yesterdayKey() {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return dayKey(date);
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(storageKey);
            if (!saved) return { day: dayKey(), habits: [] };
            const parsed = JSON.parse(saved);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.day) || !Array.isArray(parsed.habits)) throw new Error('Invalid saved data');
            for (const habit of parsed.habits) {
                if (typeof habit.id !== 'string' || typeof habit.title !== 'string' || typeof habit.notes !== 'string' ||
                    typeof habit.done !== 'boolean' || !Number.isSafeInteger(habit.streak) || habit.streak < 0 ||
                    !Array.isArray(habit.steps) || !habit.steps.every((step) => typeof step.title === 'string' && typeof step.done === 'boolean')) {
                    throw new Error('Invalid saved daily');
                }
            }
            return parsed;
        } catch {
            storageStatus.textContent = 'Saved data could not be loaded. Changes stay in this tab until they can be saved.';
            return { day: dayKey(), habits: [] };
        }
    }

    function saveState() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
            storageStatus.textContent = 'Saved on this browser';
        } catch {
            storageStatus.textContent = 'Browser storage is unavailable. Changes will be lost when this tab closes.';
        }
    }

    function refreshDay() {
        const today = dayKey();
        if (state.day === today) return false;
        const consecutive = state.day === yesterdayKey();
        state.habits.forEach((habit) => {
            habit.streak = consecutive && habit.done ? habit.streak + 1 : 0;
            habit.done = false;
            habit.steps.forEach((step) => { step.done = false; });
        });
        state.day = today;
        saveState();
        return true;
    }

    function icons() {
        window.lucide?.createIcons();
    }

    function icon(name) {
        const element = document.createElement('i');
        element.dataset.lucide = name;
        element.setAttribute('aria-hidden', 'true');
        return element;
    }

    function render() {
        document.getElementById('habit-date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        const completed = state.habits.filter((habit) => habit.done).length;
        document.getElementById('habit-progress-label').textContent = `${completed} / ${state.habits.length} completed`;
        const progress = document.getElementById('habit-progress');
        progress.max = state.habits.length || 1;
        progress.value = completed;
        list.replaceChildren();
        const visible = state.habits.filter((habit) => filter === 'all' || (filter === 'done' ? habit.done : !habit.done));
        if (!visible.length) {
            const empty = document.createElement('p');
            empty.className = 'habit-empty';
            empty.textContent = !state.habits.length ? 'No checklists yet.' : filter === 'due' ? 'All checklists complete for today.' : 'No completed checklists yet.';
            list.append(empty);
        }
        visible.forEach((habit) => {
            const row = document.createElement('article');
            row.className = `habit-row${habit.done ? ' is-done' : ''}`;
            row.setAttribute('aria-labelledby', `title-${habit.id}`);
            const main = document.createElement('div');
            main.className = 'habit-row-main';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'habit-check';
            checkbox.checked = habit.done;
            checkbox.id = `daily-${habit.id}`;
            checkbox.addEventListener('change', () => {
                refreshDay();
                habit.done = checkbox.checked;
                habit.steps.forEach((step) => { step.done = habit.done; });
                saveState();
                render();
                document.getElementById(checkbox.id)?.focus();
            });
            const copy = document.createElement('div');
            copy.className = 'habit-copy';
            const title = document.createElement('label');
            title.className = 'habit-title';
            title.id = `title-${habit.id}`;
            title.htmlFor = checkbox.id;
            title.textContent = habit.title;
            copy.append(title);
            if (habit.notes) {
                const note = document.createElement('p');
                note.className = 'habit-note';
                note.textContent = habit.notes;
                copy.append(note);
            }
            const count = document.createElement('span');
            count.className = 'habit-step-count';
            count.textContent = `${habit.steps.filter((step) => step.done).length} / ${habit.steps.length} items`;
            copy.append(count);
            const streak = document.createElement('span');
            streak.className = 'habit-streak';
            const streakCount = habit.streak + (habit.done ? 1 : 0);
            streak.append(icon('flame'), document.createTextNode(`${streakCount} ${streakCount === 1 ? 'day' : 'days'}`));
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'habit-icon';
            edit.title = `Edit ${habit.title}`;
            edit.setAttribute('aria-label', edit.title);
            edit.append(icon('pencil'));
            edit.addEventListener('click', () => openEditor(habit));
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'habit-icon habit-collapse';
            toggle.id = `toggle-${habit.id}`;
            toggle.title = `${habit.collapsed ? 'Expand' : 'Collapse'} ${habit.title}`;
            toggle.setAttribute('aria-label', toggle.title);
            toggle.setAttribute('aria-expanded', String(!habit.collapsed));
            toggle.setAttribute('aria-controls', `items-${habit.id}`);
            toggle.append(icon(habit.collapsed ? 'chevron-right' : 'chevron-down'));
            toggle.addEventListener('click', () => {
                refreshDay();
                habit.collapsed = !habit.collapsed;
                saveState();
                render();
                document.getElementById(toggle.id)?.focus();
            });
            main.append(checkbox, copy, streak, edit, toggle);
            row.append(main);
            {
                const steps = document.createElement('div');
                steps.className = 'habit-steps';
                steps.id = `items-${habit.id}`;
                steps.hidden = habit.collapsed === true;
                habit.steps.forEach((step, index) => {
                    const label = document.createElement('label');
                    label.className = 'habit-step';
                    const check = document.createElement('input');
                    check.type = 'checkbox';
                    check.checked = step.done;
                    check.id = `step-${habit.id}-${index}`;
                    check.addEventListener('change', () => {
                        refreshDay();
                        step.done = check.checked;
                        habit.done = habit.steps.every((item) => item.done);
                        saveState();
                        render();
                        document.getElementById(check.id)?.focus();
                    });
                    const text = document.createElement('span');
                    text.textContent = step.title;
                    label.append(check, text);
                    steps.append(label);
                });
                const addForm = document.createElement('form');
                addForm.className = 'habit-item-form';
                const itemInput = document.createElement('input');
                itemInput.type = 'text';
                itemInput.maxLength = 120;
                itemInput.required = true;
                itemInput.placeholder = 'Add an item';
                itemInput.id = `add-item-${habit.id}`;
                itemInput.setAttribute('aria-label', `New item for ${habit.title}`);
                const addItem = document.createElement('button');
                addItem.type = 'submit';
                addItem.className = 'habit-icon';
                addItem.title = `Add item to ${habit.title}`;
                addItem.setAttribute('aria-label', addItem.title);
                addItem.append(icon('plus'));
                addForm.append(itemInput, addItem);
                addForm.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const itemTitle = itemInput.value.trim();
                    if (!itemTitle) return;
                    refreshDay();
                    habit.steps.push({ title: itemTitle, done: false });
                    habit.done = false;
                    saveState();
                    render();
                    document.getElementById(itemInput.id)?.focus();
                });
                steps.append(addForm);
                row.append(steps);
            }
            list.append(row);
        });
        icons();
    }

    function openEditor(habit = null) {
        if (refreshDay()) render();
        editingId = habit?.id || null;
        form.reset();
        document.getElementById('habit-dialog-title').textContent = habit ? 'Edit Checklist' : 'New Checklist';
        document.getElementById('habit-delete').hidden = !habit;
        titleInput.value = habit?.title || '';
        initialStreak = (habit?.streak || 0) + (habit?.done ? 1 : 0);
        streakInput.value = String(initialStreak);
        streakInput.setCustomValidity('');
        notesInput.value = habit?.notes || '';
        stepsInput.value = habit?.steps.map((step) => step.title).join('\n') || '';
        document.body.classList.add('habit-dialog-open');
        dialog.showModal();
        titleInput.focus();
    }

    function scheduleReset() {
        clearTimeout(resetTimer);
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        resetTimer = setTimeout(() => {
            if (refreshDay()) render();
            scheduleReset();
        }, midnight - now + 50);
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        titleInput.setCustomValidity('');
        streakInput.setCustomValidity('');
        const title = titleInput.value.trim();
        if (!title) {
            titleInput.setCustomValidity('Enter a checklist name.');
            titleInput.reportValidity();
            return;
        }
        const enteredStreak = streakInput.valueAsNumber;
        if (!Number.isSafeInteger(enteredStreak) || enteredStreak < 0 || enteredStreak > 999999) {
            streakInput.setCustomValidity('Enter a whole-number streak from 0 to 999999.');
            streakInput.reportValidity();
            return;
        }
        refreshDay();
        const existing = state.habits.find((habit) => habit.id === editingId);
        const remainingSteps = [...(existing?.steps || [])];
        const steps = stepsInput.value.split('\n').map((step) => step.trim()).filter(Boolean).map((stepTitle) => {
            const match = remainingSteps.findIndex((step) => step.title === stepTitle);
            return { title: stepTitle, done: match >= 0 ? remainingSteps.splice(match, 1)[0].done : false };
        });
        const done = steps.length ? steps.every((step) => step.done) : existing?.done || false;
        const streakEdited = enteredStreak !== initialStreak;
        if (streakEdited && done && enteredStreak === 0) {
            streakInput.setCustomValidity('A checklist completed today has a streak of at least 1 day.');
            streakInput.reportValidity();
            return;
        }
        const habit = {
            id: existing?.id || crypto.randomUUID(), title, notes: notesInput.value.trim(), steps,
            done,
            streak: streakEdited ? enteredStreak - (done ? 1 : 0) : existing?.streak || 0,
            collapsed: existing?.collapsed === true
        };
        if (existing) state.habits[state.habits.indexOf(existing)] = habit;
        else state.habits.push(habit);
        saveState();
        render();
        dialog.close();
        document.getElementById(`daily-${habit.id}`)?.focus();
    });
    titleInput.addEventListener('input', () => titleInput.setCustomValidity(''));
    streakInput.addEventListener('input', () => streakInput.setCustomValidity(''));
    document.getElementById('habit-add').addEventListener('click', () => openEditor());
    document.getElementById('habit-cancel').addEventListener('click', () => dialog.close());
    document.getElementById('habit-delete').addEventListener('click', () => {
        if (!window.confirm('Delete this checklist, its items, and its streak?')) return;
        refreshDay();
        state.habits = state.habits.filter((habit) => habit.id !== editingId);
        saveState();
        render();
        dialog.close();
    });
    dialog.addEventListener('close', () => document.body.classList.remove('habit-dialog-open'));
    const tabs = [...document.querySelectorAll('[data-filter]')];
    function selectTab(tab) {
        refreshDay();
        filter = tab.dataset.filter;
        tabs.forEach((item) => {
            item.setAttribute('aria-selected', String(item === tab));
            item.tabIndex = item === tab ? 0 : -1;
        });
        render();
    }
    tabs.forEach((tab, index) => {
        tab.tabIndex = index ? -1 : 0;
        tab.addEventListener('click', () => selectTab(tab));
        tab.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            selectTab(tabs[nextIndex]);
            tabs[nextIndex].focus();
        });
    });
    function resume() {
        if (refreshDay()) render();
        scheduleReset();
    }
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });
    window.addEventListener('storage', (event) => {
        if (event.key !== storageKey && event.key !== null) return;
        state = loadState();
        refreshDay();
        render();
        scheduleReset();
    });
    state = loadState();
    refreshDay();
    render();
    scheduleReset();
})();