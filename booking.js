import { submitBooking } from './api.js';

let modal;
let form;
let message;
let submitButton;
let notesField;
let lastFocused;
let closeButtons;
let backdrop;

export function initializeBookingModal() {
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
    message.textContent = 'We could not send your booking. Please try again or email hello@pinte.amatt.ch.';
  } finally {
    setSubmitting(false);
  }
}

function setSubmitting(isSubmitting) {
  if (!submitButton) return;
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? 'Sending…' : 'Send request';
}
