export function formatEventDateRange(startISO, endISO) {
  if (!startISO) return '';
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : null;
  const formatterDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const formatterTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
  const datePart = formatterDate.format(start);
  const timePart = formatterTime.format(start);
  if (!end) {
    return `${datePart} · ${timePart}`;
  }
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${datePart} · ${timePart} – ${formatterTime.format(end)}`;
  }
  return `${datePart} – ${formatterDate.format(end)}`;
}

export function sortEvents(events) {
  return [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
}

export function normaliseCategory(category) {
  return (category || '').toLowerCase();
}

export function getDemoEvents() {
  const today = new Date();
  const toISO = offset => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    date.setHours(20, 0, 0, 0);
    return date.toISOString();
  };
  return [
    {
      id: 'demo-1',
      title: 'Open Mic & Live Jam',
      category: 'Live Music',
      start: toISO(2),
      end: toISO(2) ,
      description: 'Local artists take the stage. Bring your instrument or just cheer them on.',
      location: 'Main Bar',
      image: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=800&q=80',
      ticketUrl: ''
    },
    {
      id: 'demo-2',
      title: 'Thursday Quiz Night',
      category: 'Quiz',
      start: toISO(4),
      end: toISO(4),
      description: 'Six rounds, picture puzzles and a mystery beer round. Teams up to six players.',
      location: 'Quiz Room',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
      ticketUrl: ''
    },
    {
      id: 'demo-3',
      title: 'Club Night: Basement Frequencies',
      category: 'Club Night',
      start: toISO(5),
      end: toISO(6),
      description: 'Guest DJ collective from London brings garage, breaks and house until late.',
      location: 'The Club',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
      ticketUrl: ''
    },
    {
      id: 'demo-4',
      title: 'Sunday Roast Club',
      category: 'Special',
      start: toISO(7),
      end: toISO(7),
      description: 'Slow roast beef, Yorkshire puddings and proper gravy. Bookings essential.',
      location: 'Dining Room',
      image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
      ticketUrl: ''
    }
  ];
}
