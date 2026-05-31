// ============================================================================
// CONFIGURATION - Default data seeds and Schema Definitions
// ============================================================================
// Edit this file to customize default cameras, films, and table fields

// Default seed data (used to populate localStorage on first load)
// eslint-disable-next-line no-unused-vars
const DEFAULT_FRAME_COUNT = 36;

// Shared hidden-fields for fully manual cameras (no auto mode or exposure comp)
const MANUAL_CAMERA_HIDDEN = ["mode", "exposure_comp"];

// eslint-disable-next-line no-unused-vars
const DEFAULT_CAMERAS = [
  // 35mm SLRs
  {
    name: "Nikon FM",
    format: "35mm",
    size: "24×36mm",
    "hidden-fields": MANUAL_CAMERA_HIDDEN,
  },
  { name: "Nikon FE2", format: "35mm", size: "24×36mm" },
  { name: "Nikon F3", format: "35mm", size: "24×36mm" },
  { name: "Canon AE-1", format: "35mm", size: "24×36mm" },
  {
    name: "Pentax K1000",
    format: "35mm",
    size: "24×36mm",
    "hidden-fields": MANUAL_CAMERA_HIDDEN,
  },
  { name: "Minolta X-700", format: "35mm", size: "24×36mm" },
  {
    name: "Olympus OM-1",
    format: "35mm",
    size: "24×36mm",
    "hidden-fields": MANUAL_CAMERA_HIDDEN,
  },
  // 35mm rangefinders & compacts
  {
    name: "Leica M6",
    format: "35mm",
    size: "24×36mm",
    "hidden-fields": MANUAL_CAMERA_HIDDEN,
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
    "hidden-fields": [...MANUAL_CAMERA_HIDDEN, "lens"],
  },
  // 35mm point & shoot / half-frame
  {
    name: "Ektar H35n",
    format: "35mm",
    size: "24×18mm (half)",
    "hidden-fields": [...MANUAL_CAMERA_HIDDEN, "lens"],
  },
  {
    name: "Pentax 17",
    format: "35mm",
    size: "24×18mm (half)",
    "hidden-fields": ["shutter", "aperture", "lens"],
  },
  // Medium format
  {
    name: "Hasselblad 500C/M",
    format: "120 (Medium)",
    size: "6×6",
    "hidden-fields": MANUAL_CAMERA_HIDDEN,
  },
  {
    name: "Mamiya RB67",
    format: "120 (Medium)",
    size: "6×7",
    "hidden-fields": MANUAL_CAMERA_HIDDEN,
  },
  {
    name: "Rolleiflex 2.8F",
    format: "120 (Medium)",
    size: "6×6",
    "hidden-fields": MANUAL_CAMERA_HIDDEN,
  },
  {
    name: "Pentax 67",
    format: "120 (Medium)",
    size: "6×7",
    "hidden-fields": MANUAL_CAMERA_HIDDEN,
  },
  {
    name: "Fuji GW690III",
    format: "120 (Medium)",
    size: "6×9",
    "hidden-fields": MANUAL_CAMERA_HIDDEN,
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

// Roll status options
// eslint-disable-next-line no-unused-vars
const ROLL_STATUSES = ["Loaded", "Finished", "Developed", "Scanned"];

const FORMATS = {
  "35mm": ["24×36mm", "24×18mm (half)"],
  "120 (Medium)": ["6×4.5", "6×6", "6×7", "6×9", "6×12", "6×17"],
  "220 (Medium)": ["6×4.5", "6×6", "6×7", "6×9", "6×12", "6×17"],
  Sheet: ['4×5"', '8×10"'],
  APS: ["30×17mm"],
  "110 (Cartridge)": ["13×17mm"],
};

// eslint-disable-next-line no-unused-vars
const CAMERA_SCHEMA = {
  fields: [
    { name: "name", type: "text", label: "Camera Name", required: true },
    {
      name: "format",
      type: "select",
      label: "Format",
      options: Object.keys(FORMATS),
    },
    {
      name: "size",
      type: "select",
      label: "Size",
      dependent_on: "format",
      dependent_options: FORMATS,
    },
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
      required: true,
      column_width: "15%",
    },
    {
      name: "shutter",
      type: "select",
      label: "Shutter Speed",
      header: "S",
      entity_specific: "camera",
      column_width: "25%",
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
        "Auto",
      ],
      defaultValue: "1/60s",
    },
    {
      name: "aperture",
      type: "select",
      label: "Aperture",
      header: "A",
      entity_specific: "camera",
      column_width: "25%",
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
        "Auto",
      ],
      defaultValue: "ƒ/4",
    },
    {
      name: "focal_length",
      type: "select",
      label: "Focal Length",
      entity_specific: "camera",
      custom_value: true,
      // form-only: no column_width/header so it doesn't appear as a table column
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
      name: "mode",
      type: "select",
      label: "Shooting Mode",
      header: "M",
      entity_specific: "camera",
      column_width: "10%",
      // custom_value intentionally omitted (false): mode is a fixed enum
      options: ["P", "S", "A", "M"],
      defaultValue: "P",
    },
    {
      name: "exposure_comp",
      type: "select",
      label: "Exposure Comp.",
      entity_specific: "camera",
      custom_value: true,
      options: ["-2", "-1.5", "-1", "-0.5", "0", "+0.5", "+1", "+1.5", "+2"],
      defaultValue: "0",
    },
    {
      name: "lens",
      type: "select",
      label: "Lens",
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
      name: "filter",
      type: "select",
      label: "Filter",
      entity_specific: "camera",
      custom_value: true,
      options: [
        "None",
        "UV",
        "Skylight 1A",
        "Circular Polarizer",
        "Linear Polarizer",
        "Yellow (Y2)",
        "Orange (O56)",
        "Red (R25)",
        "Green (X1)",
        "ND4",
        "ND8",
        "ND64",
        "ND400",
        "Infrared (R72)",
        "Soft Focus",
      ],
    },
    {
      name: "notes",
      type: "text", // single-line by design for brief field notes; roll notes use textarea
      label: "Notes",
    },
    {
      name: "flash",
      type: "checkbox",
      label: "Flash",
      defaultValue: false,
    },
    {
      name: "date",
      type: "datetime",
      label: "Date",
      header: "◷",
      column_width: "35%",
    },
    {
      name: "location",
      type: "text",
      label: "Location",
    },
  ],
};
