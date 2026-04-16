// ============================================================================
// CONFIGURATION - Default data seeds and Schema Definitions
// ============================================================================
// Edit this file to customize default cameras, films, and table fields

// Sanitize field names for HTML id/name attributes to prevent iOS Safari
// autofill from triggering on fields containing the word "name".
// eslint-disable-next-line no-unused-vars
function safeInputId(fieldName) {
  return fieldName.replace(/name/gi, "label");
}

// Default seed data (used to populate localStorage on first load)
// eslint-disable-next-line no-unused-vars
const DEFAULT_CAMERAS = [
  // 35mm SLRs
  {
    name: "Nikon FM",
    format: "35mm",
    size: "24×36mm",
    "hidden-fields": ["exposure_comp"],
  },
  { name: "Nikon FE2", format: "35mm", size: "24×36mm" },
  { name: "Nikon F3", format: "35mm", size: "24×36mm" },
  { name: "Canon AE-1", format: "35mm", size: "24×36mm" },
  {
    name: "Pentax K1000",
    format: "35mm",
    size: "24×36mm",
    "hidden-fields": ["exposure_comp"],
  },
  { name: "Minolta X-700", format: "35mm", size: "24×36mm" },
  {
    name: "Olympus OM-1",
    format: "35mm",
    size: "24×36mm",
    "hidden-fields": ["exposure_comp"],
  },
  // 35mm rangefinders & compacts
  {
    name: "Leica M6",
    format: "35mm",
    size: "24×36mm",
    "hidden-fields": ["exposure_comp"],
  },
  {
    name: "Contax T2",
    format: "35mm",
    size: "24×36mm",
    "hidden-fields": ["lens"],
  },
  {
    name: "Olympus Stylus Epic",
    format: "35mm",
    size: "24×36mm",
    "hidden-fields": ["exposure_comp", "lens"],
  },
  // 35mm point & shoot / half-frame
  {
    name: "Ektar H35n",
    format: "35mm",
    size: "24×18mm (half)",
    "hidden-fields": ["exposure_comp", "lens"],
  },
  // Medium format
  {
    name: "Hasselblad 500C/M",
    format: "120 (Medium)",
    size: "6×6",
    "hidden-fields": ["exposure_comp"],
  },
  {
    name: "Mamiya RB67",
    format: "120 (Medium)",
    size: "6×7",
    "hidden-fields": ["exposure_comp"],
  },
  {
    name: "Rolleiflex 2.8F",
    format: "120 (Medium)",
    size: "6×6",
    "hidden-fields": ["exposure_comp"],
  },
  {
    name: "Pentax 67",
    format: "120 (Medium)",
    size: "6×7",
    "hidden-fields": ["exposure_comp"],
  },
  {
    name: "Fuji GW690III",
    format: "120 (Medium)",
    size: "6×9",
    "hidden-fields": ["exposure_comp"],
  },
  { name: "Pentax 645", format: "120 (Medium)", size: "6×4.5" },
];

// eslint-disable-next-line no-unused-vars
const DEFAULT_FILMS = [
  // Kodak color
  { name: "Kodak Ektacolor Pro 160", iso: 160 },
  { name: "Kodak Ektacolor Pro 400", iso: 400 },
  { name: "Kodak Ektacolor Pro 800", iso: 800 },
  { name: "Kodak Ektar 100", iso: 100 },
  { name: "Kodak Gold 200", iso: 200 },
  { name: "Kodak Ultramax 400", iso: 400 },
  { name: "Kodacolor 100", iso: 100 },
  { name: "Kodacolor 200", iso: 200 },
  // Kodak slide
  { name: "Kodak Ektachrome E100", iso: 100 },
  // Kodak B&W
  { name: "Kodak Ektapan 100", iso: 100 },
  { name: "Kodak Ektapan 400", iso: 400 },
  { name: "Kodak Ektapan P3200", iso: 3200 },
  // Kodak cinema
  { name: "Kodak Vision3 50D", iso: 50 },
  { name: "Kodak Vision3 250D", iso: 250 },
  { name: "Kodak Vision3 200T", iso: 200 },
  { name: "Kodak Vision3 500T", iso: 500 },
  // Ilford B&W
  { name: "Ilford HP5 Plus", iso: 400 },
  { name: "Ilford Delta 100", iso: 100 },
  { name: "Ilford Delta 400", iso: 400 },
  { name: "Ilford Delta 3200", iso: 3200 },
  { name: "Ilford FP4 Plus", iso: 125 },
  { name: "Ilford XP2 Super", iso: 400 },
  { name: "Ilford Pan F Plus", iso: 50 },
  // Kentmere B&W
  { name: "Kentmere 100", iso: 100 },
  { name: "Kentmere 200", iso: 200 },
  { name: "Kentmere 400", iso: 400 },
  // Foma B&W
  { name: "Fomapan 100", iso: 100 },
  { name: "Fomapan 200", iso: 200 },
  { name: "Fomapan 400", iso: 400 },
  // CineStill
  { name: "CineStill 50D", iso: 50 },
  { name: "CineStill 400D", iso: 400 },
  { name: "CineStill 800T", iso: 800 },
  // Fujifilm color
  { name: "Fujifilm Superia 400", iso: 400 },
  { name: "Fujifilm C200", iso: 200 },
  { name: "Fujifilm Pro 400H", iso: 400 },
  // Fujifilm slide
  { name: "Fujifilm Velvia 50", iso: 50 },
  { name: "Fujifilm Velvia 100", iso: 100 },
  { name: "Fujifilm Provia 100F", iso: 100 },
  // Fujifilm B&W
  { name: "Fujifilm Neopan Acros 100 II", iso: 100 },
];

// Entity schemas
// eslint-disable-next-line no-unused-vars
const ROLL_SCHEMA = {
  fields: [
    { name: "name", type: "text", label: "Roll Name", required: true },
    {
      name: "frameCount",
      type: "number",
      label: "Frame Count",
      required: false,
      defaultValue: 36,
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes",
      required: false,
    },
  ],
};

// eslint-disable-next-line no-unused-vars
const FORMATS = {
  "35mm": ["24×36mm", "24×18mm (half)"],
  "120 (Medium)": ["6×4.5", "6×6", "6×7", "6×9", "6×12", "6×17"],
  "220 (Medium)": ["6×4.5", "6×6", "6×7", "6×9", "6×12", "6×17"],
  Sheet: ['4×5"', '8×10"'],
  APS: ["30×17mm"],
  "110 (Cartridge)": ["13x17mm"],
};

// eslint-disable-next-line no-unused-vars
const CAMERA_SCHEMA = {
  fields: [
    { name: "name", type: "text", label: "Camera Name", required: true },
    { name: "format", type: "film-format", label: "Format", required: true },
    { name: "size", type: "film-size", label: "Size", required: true },
  ],
};

// eslint-disable-next-line no-unused-vars
const FILM_SCHEMA = {
  fields: [
    { name: "name", type: "text", label: "Film Name", required: true },
    { name: "iso", type: "number", label: "ISO", required: true },
  ],
};

// eslint-disable-next-line no-unused-vars
const FRAME_SCHEMA = {
  fields: [
    {
      name: "id",
      type: "number",
      label: "Frame #",
      header: "#",
      visible: true,
      readonly: false,
      required: true,
      width: "10%",
    },
    {
      name: "shutter",
      type: "select",
      label: "Shutter Speed",
      header: "S",
      visible: true,
      readonly: false,
      required: false,
      entity_specific: "camera",
      width: "20%",
      custom_value: true,
      options: [
        "B",
        "1s",
        "1/2s",
        "1/4s",
        "1/8s",
        "1/15s",
        "1/30s",
        "1/60s",
        "1/125s",
        "1/250s",
        "1/500s",
        "1/1000s",
      ],
      defaultValue: "1/60s",
    },
    {
      name: "aperture",
      type: "select",
      label: "Aperture",
      header: "A",
      visible: true,
      readonly: false,
      required: false,
      entity_specific: "camera",
      width: "20%",
      custom_value: true,
      options: [
        "ƒ/1.8",
        "ƒ/2",
        "ƒ/2.8",
        "ƒ/4",
        "ƒ/5.6",
        "ƒ/8",
        "ƒ/11",
        "ƒ/16",
        "ƒ/22",
      ],
      defaultValue: "ƒ/4",
    },
    {
      name: "focal_length",
      type: "select",
      label: "Focal Length",
      header: "ƒ",
      visible: true,
      readonly: false,
      required: false,
      entity_specific: "camera",
      width: "20%",
      custom_value: true,
      options: [
        "24mm",
        "28mm",
        "35mm",
        "40mm",
        "50mm",
        "55mm",
        "85mm",
        "105mm",
        "135mm",
        "200mm",
      ],
      defaultValue: "50mm",
    },
    {
      name: "exposure_comp",
      type: "select",
      label: "Exposure Comp.",
      header: "±",
      visible: true,
      readonly: false,
      required: false,
      hideable: true,
      entity_specific: "camera",
      width: "15%",
      custom_value: true,
      options: ["-2", "-1.5", "-1", "-0.5", "0", "+0.5", "+1", "+1.5", "+2"],
      defaultValue: "0",
    },
    {
      name: "lens",
      type: "select",
      label: "Lens",
      visible: false,
      readonly: false,
      required: false,
      hideable: true,
      entity_specific: "camera",
      options: [
        "50mm f/1.8",
        "50mm f/1.4",
        "35mm f/2",
        "28mm f/2.8",
        "85mm f/1.8",
        "105mm f/2.5",
        "135mm f/2.8",
      ],
      defaultValue: "50mm f/1.8",
    },
    {
      name: "notes",
      type: "text",
      label: "Notes",
      visible: false,
      readonly: false,
      required: false,
    },
    {
      name: "flash",
      type: "checkbox",
      label: "Flash",
      visible: false,
      readonly: false,
      required: false,
      defaultValue: false,
    },
    {
      name: "date",
      type: "datetime",
      label: "Date",
      visible: false,
      readonly: false,
      required: false,
    },
    {
      name: "location",
      type: "text",
      label: "Location",
      visible: false,
      readonly: false,
      required: false,
    },
  ],
};
