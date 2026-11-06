const paths = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v6l4 2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  book: '<path d="M3 5c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2zM12 7v14"/>',
  gym: '<path d="m3 10 7-7m4 18 7-7M2 7l5-5m10 20 5-5M7 7l10 10m-7-13 2 2-6 6-2-2m10 8-2-2 6-6 2 2"/>',
  bag: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12q9 5 18 0m-9 0v3"/>',
  moon: '<path d="M19 16A8 8 0 0 1 9 5a8.5 8.5 0 1 0 10 11z"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  settings:
    '<path d="M4 6h8m4 0h4M4 12h2m4 0h10M4 18h10m4 0h2"/><circle cx="14" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  bolt: '<path d="m14 2-10 12h7l-1 8 10-13h-7z"/>',
  layers: '<path d="m2 8 10-5 10 5-10 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18"/>',
  leaf: '<path d="M4 19C0 8 11 4 21 3c0 10-5 19-14 15m-4 4L16 9"/>',
};
export function icon(n) {
  return (
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' +
    (paths[n] || paths.layers) +
    "</svg>"
  );
}
export const ai = (a) =>
  ({
    Studium: "book",
    Training: "gym",
    Karriere: "bag",
    "Schlaf & Energie": "moon",
    Dienst: "moon",
    "Haare & Kopfhaut": "leaf",
  })[a] || "layers";
