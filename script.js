/* ==========================================================================
   Configuration
   ========================================================================== */
const WEB_APP_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

/* ==========================================================================
   Application State
   ========================================================================== */
const state = {
    events: [],
    specialDates: {},
    currentFilter: 'all',
    currentSearch: '',
    lastFocusedElement: null,
};

/* ==========================================================================
   DOM References
   ========================================================================== */
const loadingSpinner = document.getElementById('loadingSpinner');
const eventsGrid = document.getElementById('events-grid');
const filtersContainer = document.getElementById('filters');
const searchInput = document.getElementById('searchBox');

// Event modal elements
const eventModal = document.getElementById('eventModal');
const eventModalContent = document.getElementById('eventModalContent');
const modalCloseButton = document.getElementById('modalClose');
const modalBookButton = document.getElementById('modalBook');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalDescription = document.getElementById('modalDescription');
const modalPhotos = document.getElementById('modalPhotos');

// Booking modal elements
const bookingModal = document.getElementById('bookingModal');
const bookingModalContent = document.getElementById('bookingModalContent');
const openBookingModalButton = document.getElementById('openBookingModal');
const bookingCloseButton = document.getElementById('bookingClose');
const bookingForm = document.getElementById('bookingForm');
const bookingSubmitButton = document.getElementById('bookingSubmit');
const bookingMessage = document.getElementById('bookingMessage');
const commentsField = document.getElementById('comments');

/* ==========================================================================
   Initialisation
   ========================================================================== */
document.addEventListener('DOMContentLoaded', initialiseApp);

function initialiseApp() {
    try {
        if (!eventsGrid) {
            console.error('Events grid element not found.');
            setLoading(false);
            return;
        }

        attachEventListeners();
        fetchEvents();

        // Hiding Navbar Logic
        let lastScrollY = window.scrollY;
        const header = document.querySelector('header');

        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 100) {
                    if (lastScrollY < window.scrollY) {
                        header.classList.add('-translate-y-full');
                    } else {
                        header.classList.remove('-translate-y-full');
                    }
                } else {
                    header.classList.remove('-translate-y-full');
                }
                lastScrollY = window.scrollY;
            });
        }
    } catch (error) {
        console.error('Application failed to initialise:', error);
        setLoading(false);
        prependBanner('Die Seite konnte nicht vollständig geladen werden. Bitte lade sie erneut.', 'text-red-300 text-center col-span-full', 'initialise-error');
    }
}

/* ==========================================================================
   Data Fetching
   ========================================================================== */
async function fetchEvents() {
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
        controller.abort();
    }, 10000);

    if (WEB_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        console.warn('WEB_APP_URL is not configured. Loading demo data.');
        state.events = getDummyData();
        state.specialDates = getDummySpecialDates();
        sortEvents();
        renderEvents();
        setLoading(false);
        prependBanner('Demo-Modus aktiv: Bitte hinterlege die Google Apps Script URL in script.js.', 'text-amber-300 text-center col-span-full', 'demo-banner');
        window.clearTimeout(timeoutId);
        return;
    }

    try {
        const response = await fetch(WEB_APP_URL, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        state.events = Array.isArray(data.events) ? data.events : [];
        state.specialDates = data.specialDates || {};
        sortEvents();
        renderEvents();
    } catch (error) {
        console.error('Error fetching events:', error);
        state.events = getDummyData();
        state.specialDates = getDummySpecialDates();
        sortEvents();
        renderEvents();
        const message = error.name === 'AbortError'
            ? 'Zeitüberschreitung beim Laden der Events. Es werden Demo-Daten angezeigt.'
            : 'Events konnten nicht geladen werden. Es werden Demo-Daten angezeigt.';
        prependBanner(message, 'text-red-300 text-center col-span-full', 'error-banner');
    } finally {
        window.clearTimeout(timeoutId);
        setLoading(false);
    }
}

function sortEvents() {
    state.events.sort((a, b) => new Date(a.date) - new Date(b.date));
}

/* ==========================================================================
   Rendering Helpers
   ========================================================================== */
function renderEvents() {
    eventsGrid.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filterKey = normaliseCategory(state.currentFilter);
    const search = state.currentSearch;

    const filteredEvents = state.events.filter(event => {
        const matchesFilter = state.currentFilter === 'all' || normaliseCategory(event.category) === filterKey;
        const matchesSearch = !search
            || (event.title || '').toLowerCase().includes(search)
            || (event.description || '').toLowerCase().includes(search)
            || (event.tags || '').toLowerCase().includes(search);

        return matchesFilter && matchesSearch;
    });

    if (filteredEvents.length === 0) {
        eventsGrid.innerHTML = '<p class="text-neutral-400 text-center col-span-full">Keine Events für diese Suche gefunden.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    filteredEvents.forEach(event => {
        const card = buildEventCard(event, today, state.specialDates);
        fragment.appendChild(card);
    });

    eventsGrid.appendChild(fragment);
}

function buildEventCard(event, today, specialDates) {
    const card = document.createElement('article');
    card.className = getCardClasses(event);
    card.dataset.id = event.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${event.title} am ${formatEventDateLabel(event.date)}`);

    const isPast = isPastEvent(event.date, today);
    const isToday = isTodayEvent(event.date, today);

    const eventDateKey = extractISODate(event.date);
    const specialDate = specialDates[eventDateKey];
    if (specialDate && specialDate.type) {
        card.dataset.specialDate = specialDate.type;
    }

    if (isPast) {
        card.classList.add('opacity-60', 'grayscale', 'hover:opacity-80');
        card.classList.remove('hover:scale-105');
    } else {
        card.classList.add('hover:scale-105');
    }

    if (isToday) {
        card.classList.add('ring-4', 'ring-yellow-400', 'ring-offset-2', 'ring-offset-neutral-900');
    }

    const tagsHtml = (event.tags || '')
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .map(tag => `<span class="text-xs bg-neutral-600 text-neutral-200 px-2 py-0.5 rounded-full mr-1">${tag}</span>`)
        .join('');

    card.innerHTML = `
        <img src="${event.image}" alt="${event.title}" loading="lazy" class="w-full h-32 object-cover ${event.size === 'large' ? 'sm:h-64' : 'sm:h-32'}">
        <div class="p-4">
            <span class="text-xs font-semibold text-yellow-400 uppercase">${event.category}</span>
            <h3 class="text-xl font-bold font-chalk truncate mt-1">${event.title}</h3>
            <p class="text-sm text-neutral-400">${formatEventDate(event.date)}</p>
            <div class="mt-2 flex flex-wrap gap-1">${tagsHtml}</div>
        </div>
        ${isToday ? '<span class="today-badge">HEUTE</span>' : ''}
        ${isPast ? '<span class="past-badge">VORBEI</span>' : ''}
    `;

    card.addEventListener('click', () => openEventModal(event.id));
    card.addEventListener('keydown', eventKeydownHandler);

    return card;
}

function getCardClasses(event) {
    const classes = [
        'event-card',
        `event-card-${event.size}`,
        'bg-neutral-800',
        'rounded-lg',
        'shadow-lg',
        'overflow-hidden',
        'transition-transform',
        'duration-300',
        'transform',
        'relative',
        'cursor-pointer',
    ];

    if (event.size === 'large') {
        classes.push('lg:col-span-2', 'lg:row-span-2', 'sm:col-span-2', 'sm:row-span-2', 'col-span-2', 'row-span-2');
    } else {
        classes.push('lg:col-span-1', 'lg:row-span-1', 'sm:col-span-1', 'sm:row-span-1', 'col-span-1', 'row-span-1');
    }

    return classes.join(' ');
}

function formatEventDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function formatEventDateLabel(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

function isPastEvent(dateString, today) {
    const eventDate = new Date(dateString);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
}

function isTodayEvent(dateString, today) {
    const eventDate = new Date(dateString);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === today.getTime();
}

/* ==========================================================================
   Event & Booking Modals
   ========================================================================== */
function openEventModal(eventId) {
    const event = state.events.find(item => item.id === eventId);
    if (!event) {
        return;
    }

    state.lastFocusedElement = document.activeElement;

    modalImage.src = event.image;
    modalImage.alt = event.title;
    modalTitle.textContent = event.title;
    modalDate.textContent = new Date(event.date).toLocaleString('de-DE', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    modalDescription.textContent = event.description;
    modalBookButton.onclick = null;

    const eventDate = new Date(event.date);
    if (eventDate < new Date()) {
        modalBookButton.classList.add('hidden');
        modalPhotos.classList.remove('hidden');
        modalPhotos.href = event.galleryLink || '#';
    } else {
        modalBookButton.classList.remove('hidden');
        modalPhotos.classList.add('hidden');
        modalBookButton.onclick = () => {
            closeEventModal();
            openBookingModal(`Reservierung für: ${event.title} am ${formatEventDate(event.date)}`);
            const dateInput = document.getElementById('date');
            if (dateInput) {
                dateInput.value = extractISODate(event.date);
            }
        };
    }

    setModalVisibility(eventModal, eventModalContent, true);
}

function closeEventModal() {
    setModalVisibility(eventModal, eventModalContent, false);
    restoreFocus();
}

function openBookingModal(commentText = '') {
    state.lastFocusedElement = document.activeElement;

    bookingForm.reset();
    commentsField.value = commentText;
    bookingMessage.textContent = '';
    bookingMessage.classList.remove('success', 'error');

    setModalVisibility(bookingModal, bookingModalContent, true);
}

function closeBookingModal() {
    setModalVisibility(bookingModal, bookingModalContent, false);
    restoreFocus();
}

async function handleBookingSubmit(event) {
    event.preventDefault();

    bookingSubmitButton.disabled = true;
    bookingSubmitButton.textContent = 'Sende...';
    bookingMessage.textContent = '';
    bookingMessage.classList.remove('success', 'error');

    const formData = new FormData(bookingForm);
    const payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        date: formData.get('date'),
        time: formData.get('time'),
        guests: formData.get('guests'),
        comments: formData.get('comments'),
        consent: formData.get('consent') === 'on',
    };

    if (WEB_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        console.warn('Form submission skipped: WEB_APP_URL is not set.');
        await simulateBookingSuccess();
        return;
    }

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.status === 'success') {
            displayBookingMessage('Buchung erfolgreich! Prüfe deine E-Mails für die Bestätigung.', true);
            bookingForm.reset();
            setTimeout(closeBookingModal, 3000);
        } else {
            throw new Error(result.message || 'Unbekannter Fehler');
        }
    } catch (error) {
        console.error('Error submitting booking:', error);
        displayBookingMessage(`Buchung fehlgeschlagen: ${error.message}. Bitte erneut versuchen.`, false);
    } finally {
        bookingSubmitButton.disabled = false;
        bookingSubmitButton.textContent = 'Anfrage senden';
    }
}

function displayBookingMessage(message, isSuccess) {
    bookingMessage.textContent = message;
    bookingMessage.classList.toggle('success', isSuccess);
    bookingMessage.classList.toggle('error', !isSuccess);
}

async function simulateBookingSuccess() {
    await new Promise(resolve => setTimeout(resolve, 1000));
    displayBookingMessage('Buchung erfolgreich! (Demo)', true);
    bookingForm.reset();
    bookingSubmitButton.disabled = false;
    bookingSubmitButton.textContent = 'Anfrage senden';
    setTimeout(closeBookingModal, 2000);
}

function setModalVisibility(modalElement, modalContent, shouldOpen) {
    modalElement.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    document.body.classList.toggle('overflow-hidden', shouldOpen);

    if (shouldOpen) {
        modalContent.focus();
    } else {
        modalContent.blur();
    }
}

function restoreFocus() {
    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === 'function') {
        state.lastFocusedElement.focus();
        state.lastFocusedElement = null;
    }
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */
function attachEventListeners() {
    document.addEventListener('keydown', handleEscapeKey);

    if (filtersContainer) {
        filtersContainer.addEventListener('click', handleFilterClick);
        filtersContainer.addEventListener('keydown', filterKeydownHandler);
    } else {
        console.warn('Filters container element not found.');
    }

    if (searchInput) {
        searchInput.addEventListener('input', event => {
            const value = (event.target.value || '').toLowerCase();
            state.currentSearch = value.trim();
            renderEvents();
        });
    }

    if (modalCloseButton) {
        modalCloseButton.addEventListener('click', closeEventModal);
    } else {
        console.warn('Modal close button not found.');
    }

    if (eventModal) {
        eventModal.addEventListener('click', event => {
            if (event.target === eventModal) {
                closeEventModal();
            }
        });
    } else {
        console.warn('Event modal container not found.');
    }

    if (openBookingModalButton) {
        openBookingModalButton.addEventListener('click', () => openBookingModal());
    } else {
        console.warn('Booking trigger button not found.');
    }

    if (bookingCloseButton) {
        bookingCloseButton.addEventListener('click', closeBookingModal);
    } else {
        console.warn('Booking modal close button not found.');
    }

    if (bookingModal) {
        bookingModal.addEventListener('click', event => {
            if (event.target === bookingModal) {
                closeBookingModal();
            }
        });
    } else {
        console.warn('Booking modal container not found.');
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    } else {
        console.warn('Booking form element not found.');
    }
}

function handleFilterClick(event) {
    const targetButton = event.target.closest('button.filter-btn');
    if (!targetButton) {
        return;
    }

    state.currentFilter = targetButton.dataset.filter;

    document.querySelectorAll('.filter-btn').forEach(button => {
        const isActive = normaliseCategory(button.dataset.filter) === normaliseCategory(state.currentFilter);
        button.dataset.active = isActive.toString();
    });

    renderEvents();
}

function filterKeydownHandler(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const button = event.target.closest('button.filter-btn');
        if (button) {
            button.click();
        }
    }
}

function eventKeydownHandler(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const card = event.currentTarget;
        card.click();
    }
}

function handleEscapeKey(event) {
    if (event.key !== 'Escape') {
        return;
    }

    if (eventModal.getAttribute('aria-hidden') === 'false') {
        closeEventModal();
    }

    if (bookingModal.getAttribute('aria-hidden') === 'false') {
        closeBookingModal();
    }
}

/* ==========================================================================
   Utility Helpers
   ========================================================================== */
function setLoading(isLoading) {
    if (!loadingSpinner) {
        return;
    }

    if (isLoading) {
        loadingSpinner.removeAttribute('hidden');
        loadingSpinner.style.removeProperty('display');
        loadingSpinner.setAttribute('aria-hidden', 'false');
    } else {
        loadingSpinner.setAttribute('hidden', '');
        loadingSpinner.style.display = 'none';
        loadingSpinner.setAttribute('aria-hidden', 'true');
        if (!loadingSpinner.dataset.dismissed) {
            loadingSpinner.dataset.dismissed = 'true';
            requestAnimationFrame(() => {
                if (loadingSpinner && loadingSpinner.parentElement) {
                    loadingSpinner.parentElement.removeChild(loadingSpinner);
                }
            });
        }
    }
}

function extractISODate(dateValue) {
    if (typeof dateValue === 'string') {
        if (dateValue.includes('T')) {
            return dateValue.split('T')[0];
        }
        return dateValue;
    }

    return new Date(dateValue).toISOString().split('T')[0];
}

function normaliseCategory(value) {
    return (value || '')
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function prependBanner(message, className, id) {
    if (!eventsGrid) {
        return;
    }

    if (id && eventsGrid.querySelector(`[data-banner-id="${id}"]`)) {
        return;
    }

    const banner = document.createElement('p');
    banner.className = className;
    banner.textContent = message;

    if (id) {
        banner.dataset.bannerId = id;
    }

    eventsGrid.prepend(banner);
}

/* ==========================================================================
   Demo Data Generator
   ========================================================================== */
function getDummyData() {
    const today = new Date('2025-11-10T09:00:00');
    const events = [];
    const categories = ['Live Music', 'Quiz', 'Special', 'Club Night'];
    const sizes = ['small', 'medium', 'large'];
    const titles = ['Groove-Nacht', 'Trivia-Herausforderung', 'Burger-Börse', 'Hausparty', 'Akustik-Session', '80er-Rewind', 'Salsa-Nacht', 'Comedy Open Mic'];
    const tagsPool = ['DJ Set', '90s', 'Pub Quiz', 'Karaoke', 'Seasonal', 'Cocktails', 'Live Band'];

    for (let i = 7; i > 0; i -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - i * 3);
        const category = categories[i % categories.length];
        events.push({
            id: `${8 - i}`,
            title: `VORBEI: ${titles[i % titles.length]}`,
            description: 'Dieses Event hat bereits stattgefunden. Schau dir die Fotos an!',
            date: date.toISOString(),
            category,
            size: i % 3 === 0 ? 'medium' : 'small',
            image: `https://placehold.co/600x400/52525b/a1a1aa?text=${category.replace(' ', '+')}`,
            galleryLink: '#',
            tags: `${tagsPool[i % tagsPool.length]}, Archiv`,
        });
    }

    for (let i = 0; i < 30; i += 1) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        date.setHours(19 + (i % 5), (i % 2) * 30, 0);

        let category = categories[i % categories.length];
        let size = sizes[i % sizes.length];

        if (i === 0) {
            size = 'large';
            category = 'Live Music';
        }

        events.push({
            id: `${i + 8}`,
            title: titles[i % titles.length],
            description: 'Mach dich bereit für eine tolle Zeit. Alle Infos: [Details hier]. Sichere dir jetzt deinen Platz!',
            date: date.toISOString(),
            category,
            size,
            image: `https://placehold.co/600x400/334155/EAB308?text=${category.replace(' ', '+')}`,
            tags: `${tagsPool[i % tagsPool.length]}, Highlights`,
        });
    }

    return events;
}

function getDummySpecialDates() {
    return {
        '2025-12-24': { type: 'holiday', label: 'Heiligabend' },
        '2025-12-25': { type: 'holiday', label: 'Weihnachtstag' },
        '2026-02-27': { type: 'fasnacht', label: 'Fasnacht' },
    };
}
