import { fetchNextEvents } from './api.js';
import { initializeBookingModal } from './booking.js';
import { initializeEventsPage } from './eventsPage.js';
import { formatEventDateRange, sortEvents } from './script.js';

document.addEventListener('DOMContentLoaded', () => {
  initializeNavigation();
  initializeBookingModal();
  initializeEventsPage();
  hydrateEventTeasers();
});

function initializeNavigation() {
  const nav = document.getElementById('primary-navigation');
  const toggle = document.querySelector('.nav-toggle');
  const links = nav ? Array.from(nav.querySelectorAll('a')) : [];
  const currentPath = window.location.pathname.replace(/index\.html$/, '');

  links.forEach(link => {
    const href = new URL(link.href).pathname.replace(/index\.html$/, '');
    if (href === currentPath || (href === '/' && currentPath === '')) {
      link.classList.add('is-current');
    } else {
      link.classList.remove('is-current');
    }
    // Add click listener to close nav on link click
    link.addEventListener('click', () => {
      if (nav?.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle?.setAttribute('aria-expanded', 'false');
        // Remove scroll-lock
        document.body.classList.remove('nav-is-open');
      }
    });
  });

  // Main toggle logic
  toggle?.addEventListener('click', () => {
    const isOpen = nav ? nav.classList.toggle('is-open') : false;
    toggle.setAttribute('aria-expanded', String(isOpen));
    // Add/remove scroll-lock
    document.body.classList.toggle('nav-is-open', isOpen);
  });
}

async function hydrateEventTeasers() {
  const container = document.getElementById('event-teaser-container');
  if (!container) return;
  const fallback = document.getElementById('event-fallback');

  try {
    const events = sortEvents(await fetchNextEvents(3));
    container.innerHTML = '';
    if (!events.length) {
      fallback?.removeAttribute('hidden');
      return;
    }
    events.slice(0, 3).forEach(event => {
      container.appendChild(createTeaserCard(event));
    });
  } catch (error) {
    console.error('Failed to load teaser events', error);
    container.innerHTML = '';
    fallback?.removeAttribute('hidden');
  }
}

function createTeaserCard(event) {
  const card = document.createElement('article');
  card.className = 'event-teaser-card';

  const title = document.createElement('h3');
  title.textContent = event.title;
  card.appendChild(title);

  const meta = document.createElement('p');
  meta.className = 'event-meta';
  meta.textContent = formatEventDateRange(event.start, event.end);
  card.appendChild(meta);

  if (event.category) {
    const badge = document.createElement('span');
    badge.className = 'tag';
    badge.textContent = event.category;
    card.appendChild(badge);
  }

  const cta = document.createElement('a');
  cta.href = '/events.html';
  cta.className = 'btn btn-secondary';
  cta.textContent = 'Event details';
  card.appendChild(cta);

  return card;
}
