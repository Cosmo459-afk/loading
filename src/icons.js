// Local decorative icons: one 24px grid and one stroke weight, no font glyphs or downloads.
const paths={
 chests:'<path d="M4 10V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M3 10h18v10H3z"/><rect x="10" y="9" width="4" height="5" rx="1"/>',
 cards:'<rect x="7" y="6" width="13" height="15" rx="2"/><path d="M16 6V3H5a2 2 0 0 0-2 2v12h4m6.5-7 3 3.5-3 3.5-3-3.5z"/>',
 coupon:'<path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4zM9 5v2m0 3v4m0 3v2m4-4 4-6"/><circle cx="13" cy="9" r=".7"/><circle cx="17" cy="15" r=".7"/>',
 history:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>'
};
export function inventoryIcon(kind){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(paths[kind]||paths.cards)+'</svg>';}
