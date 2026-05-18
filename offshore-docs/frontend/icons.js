/**
 * Built-in SVG icon library for offshore equipment nodes.
 * All icons use currentColor and a 64×64 viewBox so they inherit
 * the parent element's color and scale cleanly at any size.
 */
export const ICON_DEFS = {
  generator: {
    label: "Generator",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="14" width="52" height="36" rx="5" stroke="currentColor" stroke-width="2.5"/>
      <path d="M14 32 Q18 22 22 32 Q26 42 30 32 Q34 22 38 32 Q42 42 46 32 Q48 27 50 32"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`,
  },
  motor: {
    label: "Motor",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="22" stroke="currentColor" stroke-width="2.5"/>
      <path d="M20 40 L20 24 L30 24 L38 32 L30 40 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M38 24 L38 40" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  },
  pump: {
    label: "Pump",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="20" stroke="currentColor" stroke-width="2.5"/>
      <path d="M32 14 L32 32 L46 40" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="32" cy="32" r="4" fill="currentColor"/>
    </svg>`,
  },
  mcc: {
    label: "MCC",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="6" width="48" height="52" rx="3" stroke="currentColor" stroke-width="2.5"/>
      <line x1="8" y1="22" x2="56" y2="22" stroke="currentColor" stroke-width="1.5"/>
      <line x1="8" y1="38" x2="56" y2="38" stroke="currentColor" stroke-width="1.5"/>
      <rect x="16" y="12" width="10" height="6" rx="1.5" fill="currentColor"/>
      <rect x="30" y="12" width="10" height="6" rx="1.5" fill="currentColor"/>
      <rect x="16" y="28" width="10" height="6" rx="1.5" fill="currentColor"/>
      <rect x="30" y="28" width="10" height="6" rx="1.5" fill="currentColor"/>
      <rect x="16" y="44" width="10" height="6" rx="1.5" fill="currentColor"/>
      <rect x="30" y="44" width="10" height="6" rx="1.5" fill="currentColor"/>
    </svg>`,
  },
  switchboard: {
    label: "Switchboard",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="52" height="44" rx="4" stroke="currentColor" stroke-width="2.5"/>
      <line x1="32" y1="10" x2="32" y2="54" stroke="currentColor" stroke-width="1.5"/>
      <line x1="6"  y1="32" x2="58" y2="32" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="19" cy="21" r="5" stroke="currentColor" stroke-width="2"/>
      <circle cx="45" cy="21" r="5" stroke="currentColor" stroke-width="2"/>
      <circle cx="19" cy="43" r="5" stroke="currentColor" stroke-width="2"/>
      <circle cx="45" cy="43" r="5" stroke="currentColor" stroke-width="2"/>
    </svg>`,
  },
  transformer: {
    label: "Transformer",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="21" cy="32" r="13" stroke="currentColor" stroke-width="2.5"/>
      <circle cx="43" cy="32" r="13" stroke="currentColor" stroke-width="2.5"/>
      <line x1="6"  y1="32" x2="8"  y2="32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="6"  y1="22" x2="6"  y2="32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="58" y1="32" x2="56" y2="32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="58" y1="22" x2="58" y2="32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  },
  valve: {
    label: "Valve",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="4"  y1="32" x2="60" y2="32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M32 10 L16 32 L32 54 L48 32 Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="32" y1="10" x2="32" y2="4"  stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="24" y1="4"  x2="40" y2="4"  stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="3.5" fill="currentColor"/>
    </svg>`,
  },
  vfd: {
    label: "VFD / Drive",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="48" height="48" rx="5" stroke="currentColor" stroke-width="2.5"/>
      <path d="M16 42 L24 22 L32 36 L40 26 L48 36"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  panel: {
    label: "Panel / DB",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="8" width="44" height="48" rx="3" stroke="currentColor" stroke-width="2.5"/>
      <rect x="18" y="16" width="28" height="32" rx="2" stroke="currentColor" stroke-width="1.5"/>
      <line x1="18" y1="26" x2="46" y2="26" stroke="currentColor" stroke-width="1.5"/>
      <line x1="18" y1="36" x2="46" y2="36" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="32" cy="21" r="2.5" fill="currentColor"/>
    </svg>`,
  },
  cable: {
    label: "Cable / Wire",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 32 C14 16 22 48 30 32 C38 16 46 48 58 32"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <circle cx="6"  cy="32" r="3.5" fill="currentColor"/>
      <circle cx="58" cy="32" r="3.5" fill="currentColor"/>
    </svg>`,
  },
  sensor: {
    label: "Sensor / Instrument",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="20" stroke="currentColor" stroke-width="2.5"/>
      <path d="M22 42 Q22 32 32 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M22 42 Q32 42 42 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
      <line x1="32" y1="32" x2="40" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="3" fill="currentColor"/>
    </svg>`,
  },
  generic: {
    label: "Generic Equipment",
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="16" width="48" height="32" rx="5" stroke="currentColor" stroke-width="2.5"/>
      <line x1="24" y1="16" x2="24" y2="48" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
      <line x1="40" y1="16" x2="40" y2="48" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
      <line x1="8"  y1="32" x2="56" y2="32" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
    </svg>`,
  },
};

/**
 * Return the SVG string for a built-in icon key, or null if not found.
 * @param {string} key
 * @returns {string|null}
 */
export function getBuiltinSvg(key) {
  return ICON_DEFS[key]?.svg ?? ICON_DEFS.generic.svg;
}
