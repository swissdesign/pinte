import { fetchEvents } from './api.js';
import { openBookingModal } from './booking.js';
import { formatEventDateRange, sortEvents, normaliseCategory } from './script.js';

let events = [];
let filtered = [];
let grid;
let filterGroup;
let searchInput;
let emptyState;
let resetButton;
let eventModal;
let modalTitle;
let modalDate;
let modalDescription;
let modalTicket;
let modalBookButton;

export function initializeEventsPage() {
  grid = document.getElementById('events-grid');
  filterGroup = document.getElementById('filters');
  searchInput = document.getElementById('searchBox');
  emptyState = document.getElementById('events-empty');
  resetButton = document.querySelector('[data-reset-filters]');
  eventModal = document.getElementById('eventModal');
  modalTitle = document.getElementById('eventModalTitle');
  modalDate = document.getElementById('eventModalDate');
  modalDescription = document.getElementById('eventModalDescription');
  modalTicket = document.getElementById('eventModalTicket');
  modalBookButton = eventModal?.querySelector('[data-modal-book]') || null;

  if (!grid) {
    return;
  }

  loadEvents();

  filterGroup?.addEventListener('click', handleFilterClick);
  searchInput?.addEventListener('input', handleSearchInput);
  resetButton?.addEventListener('click', resetFilters);

  const modalCloseButtons = eventModal?.querySelectorAll('[data-modal-close]') || [];
  modalCloseButtons.forEach(btn => btn.addEventListener('click', closeEventModal));
  eventModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeEventModal);
  modalBookButton?.addEventListener('click', handleModalBooking);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && eventModal?.classList.contains('is-open')) {
      closeEventModal();
    }
  });
}

async function loadEvents() {
  try {
    const fetched = await fetchEvents();
    events = sortEvents(fetched);
  } catch (error) {
    console.error('Failed to load events', error);
    events = [];
  }
  filtered = [...events];
  renderEvents();
}

function handleFilterClick(event) {
  const target = event.target.closest('button[data-filter]');
  if (!target) return;
  const { filter } = target.dataset;
  filterGroup.querySelectorAll('button[data-filter]').forEach(btn => {
    const isActive = btn === target;
    btn.setAttribute('aria-pressed', String(isActive));
  });
  applyFilters({ category: filter, search: searchInput?.value || '' });
}

function handleSearchInput() {
  const activeFilter = filterGroup?.querySelector('button[aria-pressed="true"]')?.dataset.filter || 'all';
  applyFilters({ category: activeFilter, search: searchInput.value });
}

function resetFilters() {
  filterGroup?.querySelectorAll('button[data-filter]').forEach((btn, index) => {
    btn.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
  });
  if (searchInput) {
    searchInput.value = '';
  }
  applyFilters({ category: 'all', search: '' });
}

function applyFilters({ category, search }) {
  const normalised = normaliseCategory(category);
  const term = search.toLowerCase();

  filtered = events.filter(event => {
    const matchesCategory = normalised === 'all' || normaliseCategory(event.category) === normalised;
    const matchesSearch = !term || `${event.title} ${event.description || ''} ${event.location || ''}`.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  renderEvents();
}

function renderEvents() {
  if (!grid) return;
  grid.innerHTML = '';
  grid.removeAttribute('data-loading');

  if (!filtered.length) {
    emptyState?.removeAttribute('hidden');
    return;
  }
  emptyState?.setAttribute('hidden', '');

  filtered.forEach(event => {
    const card = createEventCard(event);
    grid.appendChild(card);
  });
}

function createEventCard(event) {
  const card = document.createElement('article');
  card.className = 'event-card';

  if (event.image) {
    const thumb = document.createElement('div');
    thumb.className = 'event-thumb';
    thumb.style.backgroundImage = `url(${event.image})`;
    card.appendChild(thumb);
  }

  const title = document.createElement('h3');
  title.textContent = event.title;
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'event-meta';
  meta.textContent = formatEventDateRange(event.start, event.end);
  card.appendChild(meta);

  if (event.description) {
    const description = document.createElement('p');
    description.textContent = event.description;
    card.appendChild(description);
  }

  const actions = document.createElement('div');
  actions.className = 'door-actions';

  const detailsButton = document.createElement('button');
  detailsButton.className = 'btn btn-secondary';
  detailsButton.type = 'button';
  detailsButton.textContent = 'View details';
  detailsButton.addEventListener('click', () => openEventModal(event));
  actions.appendChild(detailsButton);

  const bookButton = document.createElement('button');
  bookButton.className = 'btn btn-primary';
  bookButton.type = 'button';
  bookButton.textContent = 'Book a table';
  bookButton.addEventListener('click', () => openBookingModal(`Table for event: ${event.title}`));
  actions.appendChild(bookButton);

  card.appendChild(actions);

  return card;
}

function openEventModal(event) {
  if (!eventModal) return;
  modalTitle.textContent = event.title;
  modalDate.textContent = formatEventDateRange(event.start, event.end);
  modalDescription.textContent = event.description || '';
  eventModal.dataset.bookingNote = `Table for event: ${event.title}`;
  if (event.ticketUrl) {
    modalTicket.href = event.ticketUrl;
    modalTicket.removeAttribute('hidden');
  } else {
    modalTicket.setAttribute('hidden', '');
  }
  eventModal.classList.add('is-open');
  eventModal.setAttribute('aria-hidden', 'false');
  modalTitle.focus();
}

function closeEventModal() {
  if (!eventModal) return;
  eventModal.classList.remove('is-open');
  eventModal.setAttribute('aria-hidden', 'true');
  delete eventModal.dataset.bookingNote;
}

function handleModalBooking() {
  const note = eventModal?.dataset.bookingNote || '';
  closeEventModal();
  openBookingModal(note);
}
