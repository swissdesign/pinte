import { submitBooking } from './api.js';

const CONTACT_EMAIL = 'hello@pinte.amatt.ch';

let modal;
let form;
let message;
let submitButton;
let notesField;
let lastFocused;
let closeButtons;
let backdrop;

export function initializeBookingModal() {
  ensureBookingModal();

  modal = document.getElementById('bookingModal');
  form = document.getElementById('bookingForm');
  message = document.getElementById('bookingMessage');
  submitButton = document.getElementById('bookingSubmit');
  notesField = document.getElementById('bookingNotes');
  closeButtons = modal ? modal.querySelectorAll('[data-modal-close]') : [];
  backdrop = modal ? modal.querySelector('.modal-backdrop') : null;

  if (!modal || !form) {
    return;
  }

  document.querySelectorAll('[data-booking-trigger]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const note = trigger.getAttribute('data-booking-note');
      openBookingModal(note);
    });
  });

  closeButtons.forEach(btn => btn.addEventListener('click', closeBookingModal));
  if (backdrop) {
    backdrop.addEventListener('click', closeBookingModal);
  }

  form.addEventListener('submit', handleSubmit);
  document.addEventListener('keydown', trapEscape);
}

function ensureBookingModal() {
  if (document.getElementById('bookingModal')) {
    return;
  }

  const template = document.createElement('template');
  template.innerHTML = `
    <div class="modal" id="bookingModal" aria-hidden="true" role="dialog" aria-labelledby="bookingModalTitle">
      <div class="modal-backdrop" data-modal-close></div>
      <div class="modal-dialog" role="document">
        <button class="modal-close" type="button" data-modal-close aria-label="Close booking form">×</button>
        <h2 id="bookingModalTitle" class="modal-title">Book a table</h2>
        <form id="bookingForm" novalidate>
          <div class="form-row">
            <label for="bookingName">Full name</label>
            <input id="bookingName" name="name" type="text" autocomplete="name" required>
          </div>
          <div class="form-row">
            <label for="bookingEmail">Email</label>
            <input id="bookingEmail" name="email" type="email" autocomplete="email" required>
          </div>
          <div class="form-row">
            <label for="bookingPhone">Phone</label>
            <input id="bookingPhone" name="phone" type="tel" autocomplete="tel" required>
          </div>
          <div class="form-row form-row-inline">
            <div>
              <label for="bookingDate">Date</label>
              <input id="bookingDate" name="date" type="date" required>
            </div>
            <div>
              <label for="bookingTime">Time</label>
              <input id="bookingTime" name="time" type="time" required>
            </div>
            <div>
              <label for="bookingSize">Guests</label>
              <input id="bookingSize" name="partySize" type="number" min="1" max="20" required>
            </div>
          </div>
          <div class="form-row">
            <label for="bookingNotes">Notes</label>
            <textarea id="bookingNotes" name="notes" rows="3" placeholder="Celebrating something special?"></textarea>
          </div>
          <div id="bookingMessage" class="form-message" role="status" aria-live="polite"></div>
          <button id="bookingSubmit" class="btn btn-primary" type="submit">Send request</button>
        </form>
      </div>
    </div>
  `;

  const modalElement = template.content.firstElementChild;
  document.body.appendChild(modalElement);
}

function trapEscape(event) {
  if (event.key === 'Escape' && modal?.classList.contains('is-open')) {
    closeBookingModal();
  }
}

export function openBookingModal(prefillNote = '') {
  if (!modal) return;
  lastFocused = document.activeElement;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  if (notesField) {
    notesField.value = prefillNote || '';
  }
  const firstField = form.querySelector('input, textarea, button');
  firstField?.focus();
}

function closeBookingModal() {
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  form.reset();
  message.textContent = '';
  if (lastFocused) {
    lastFocused.focus();
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  setSubmitting(true);
  message.textContent = 'Sending your booking…';

  try {
    const response = await submitBooking(payload);
    const isOk = response?.ok || response?.status === 'success';
    message.textContent = isOk ? 'Thanks! We will confirm by email shortly.' : 'Request sent. We will be in touch.';
    if (response?.demo) {
      message.textContent += ' (Demo mode)';
    }
    form.reset();
  } catch (error) {
    console.error('Booking failed', error);
    message.textContent = `We could not send your booking. Please try again or email ${CONTACT_EMAIL}.`;
  } finally {
    setSubmitting(false);
  }
}

function setSubmitting(isSubmitting) {
  if (!submitButton) return;
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? 'Sending…' : 'Send request';
}
