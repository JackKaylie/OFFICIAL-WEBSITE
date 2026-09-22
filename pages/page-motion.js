function initializeSubpage() {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<span class="cursor-aura"></span><span class="cursor-core"></span>';
    document.body.appendChild(cursor);

    const hideCursor = () => cursor.classList.remove('is-visible', 'is-clicking');
    window.addEventListener('pointermove', (event) => {
        cursor.style.setProperty('--cursor-x', `${event.clientX}px`);
        cursor.style.setProperty('--cursor-y', `${event.clientY}px`);
        cursor.classList.add('is-visible');
    });
    window.addEventListener('pointerdown', () => cursor.classList.add('is-clicking'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-clicking'));
    window.addEventListener('pointerleave', hideCursor);
    window.addEventListener('blur', hideCursor);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) hideCursor();
    });

    document.body.classList.add('page-entering');
    window.setTimeout(() => document.body.classList.remove('page-entering'), 900);

    document.querySelectorAll('a[href]').forEach((link) => {
        const destination = link.getAttribute('href');
        if (!destination || destination.startsWith('#') || link.target === '_blank' || destination.startsWith('http')) return;

        link.addEventListener('click', (event) => {
            event.preventDefault();
            document.body.classList.add('page-leaving');
            window.setTimeout(() => { window.location.href = destination; }, 300);
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSubpage, { once: true });
} else {
    initializeSubpage();
}