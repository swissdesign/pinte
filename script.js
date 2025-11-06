// Sample event data; replace with data fetched from Google Sheets API
const events = [
    {
        id: '1',
        title: 'Live Band: Alpine Rockers',
        date: '2025-11-08',
        type: 'live',
        size: 'large',
        description: 'Join us for a night of live music with the Alpine Rockers. Great food, drinks and vibes guaranteed.'
    },
    {
        id: '2',
        title: 'Pub Quiz Night',
        date: '2025-11-10',
        type: 'quiz',
        size: 'medium',
        description: 'Test your knowledge and win prizes at our weekly pub quiz!'
    },
    {
        id: '3',
        title: 'Regular Night',
        date: '2025-11-11',
        type: 'club',
        size: 'small',
        description: 'A regular night at the pub. Enjoy drinks and chat with friends.'
    },
    {
        id: '4',
        title: 'DJ Night: Electro Beats',
        date: '2025-11-12',
        type: 'club',
        size: 'large',
        description: 'Dance to the latest electro beats with our resident DJ. Doors open at 10pm.'
    },
    {
        id: '5',
        title: 'Open Mic',
        date: '2025-11-14',
        type: 'live',
        size: 'medium',
        description: 'Showcase your talents at our open mic night. All genres welcome.'
    },
    {
        id: '6',
        title: 'Regular Night',
        date: '2025-11-15',
        type: 'club',
        size: 'small',
        description: 'Another regular night with good drinks and good company.'
    }
];

// Render the event grid
function renderEvents(filter) {
    const grid = document.getElementById('event-grid');
    grid.innerHTML = '';

    events
        .filter(event => filter === 'all' || event.type === filter)
        .forEach(event => {
            const card = document.createElement('div');
            card.classList.add('event-card', event.size);
            card.dataset.eventId = event.id;
            card.dataset.eventType = event.type;

            const title = document.createElement('div');
            title.classList.add('event-title');
            title.textContent = event.title;

            const date = document.createElement('div');
            date.classList.add('event-date');
            date.textContent = new Date(event.date).toLocaleDateString();

            const desc = document.createElement('div');
            desc.classList.add('event-description');
            desc.textContent = event.description;

            card.appendChild(title);
            card.appendChild(date);
            card.appendChild(desc);

            card.addEventListener('click', () => openModal(event));

            grid.appendChild(card);
        });
}

// Filter button logic
const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        renderEvents(filter);
    });
});

// Modal logic
const modal = document.getElementById('event-modal');
const closeButton = document.querySelector('.close-button');
const modalTitle = document.getElementById('modal-title');
const modalDate = document.getElementById('modal-date');
const modalDescription = document.getElementById('modal-description');
const eventIdInput = document.getElementById('event-id');
const confirmationMessage = document.getElementById('confirmation-message');

function openModal(event) {
    modalTitle.textContent = event.title;
    modalDate.textContent = new Date(event.date).toLocaleDateString();
    modalDescription.textContent = event.description;
    eventIdInput.value = event.id;
    confirmationMessage.textContent = '';
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
}

closeButton.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Handle reservation form submission
const reservationForm = document.getElementById('reservation-form');
reservationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Gather form data
    const formData = {
        eventId: reservationForm['event-id'].value,
        name: reservationForm['name'].value,
        email: reservationForm['email'].value,
        partySize: reservationForm['party'].value,
        comments: reservationForm['comments'].value
    };

    // Placeholder: Send data to Google Apps Script endpoint
    // In production, replace the fetch URL with your Apps Script web app URL
    fetch('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    }).then(() => {
        // Show confirmation message
        confirmationMessage.textContent = 'Reservation submitted! We will confirm by email.';
        reservationForm.reset();
    }).catch(() => {
        confirmationMessage.textContent = 'Reservation failed. Please try again.';
    });
});

// Initial render
renderEvents('all');
