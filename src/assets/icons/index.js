/**
 * Каталог SVG-иконок (Lucide-based).
 *
 * Все иконки: viewBox="0 0 24 24", stroke-based, fill="none".
 * Источник: https://lucide.dev/ (MIT License).
 *
 * Формат: ключ — имя иконки, значение — innerHTML для <svg>.
 * Добавление новой иконки: скопируй содержимое <svg> с lucide.dev
 * и добавь новый ключ в этот объект.
 */
export const ICONS = {
  // --- Navigation ---
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',

  'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',

  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',

  // --- BottomNav ---
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',

  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',

  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',

  // --- Quiz Actions ---
  'comment': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',

  'translate': '<g transform="translate(2, 2)"><path d="M9.96875 0.625C5.90625 0.625 2.4375 3.25 1.15625 6.875H18.8437C17.5312 3.25 14.0625 0.625 9.96875 0.625Z" fill="#F9F9F9" stroke="none"/><path d="M9.96875 19.375C14.0625 19.375 17.5313 16.75 18.8125 13.125H1.15625C2.4375 16.7812 5.90625 19.375 9.96875 19.375Z" fill="#ED4C5C" stroke="none"/><path d="M1.15625 6.875C0.8125 7.84375 0.625 8.90625 0.625 10C0.625 11.0938 0.8125 12.1563 1.15625 13.125H18.8437C19.1875 12.1563 19.375 11.0938 19.375 10C19.375 8.90625 19.1875 7.84375 18.8437 6.875H1.15625Z" fill="#428BC1" stroke="none"/></g><circle cx="12" cy="12" r="10" stroke="#d1d5db" stroke-width="0.8" fill="none" />',

  // --- Status ---
  check: '<path d="M20 6 9 17l-5-5"/>',

  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',

  'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',

  'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',

  // --- Quiz Pagination / Results ---
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',

  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',

  rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
};
