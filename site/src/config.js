// ============================================================================
// CONFIGURATION - Default data seeds and Schema Definitions
// ============================================================================
// Edit this file to customize default cameras, films, and table fields

/* eslint-disable no-unused-vars */

// Default seed data (used to populate localStorage on first load)
const DEFAULT_CAMERAS = [
  // 35mm SLRs
  { "camera-name": "Nikon FM", format: "35mm", size: "24×36mm", "hidden-fields": ["exposure_comp"] },
  { "camera-name": "Nikon FE2", format: "35mm", size: "24×36mm" },
  { "camera-name": "Nikon F3", format: "35mm", size: "24×36mm" },
  { "camera-name": "Canon AE-1", format: "35mm", size: "24×36mm" },
  { "camera-name": "Pentax K1000", format: "35mm", size: "24×36mm", "hidden-fields": ["exposure_comp"] },
  { "camera-name": "Minolta X-700", format: "35mm", size: "24×36mm" },
  { "camera-name": "Olympus OM-1", format: "35mm", size: "24×36mm", "hidden-fields": ["exposure_comp"] },
  // 35mm rangefinders & compacts
  { "camera-name": "Leica M6", format: "35mm", size: "24×36mm", "hidden-fields": ["exposure_comp"] },
  { "camera-name": "Contax T2", format: "35mm", size: "24×36mm" },
  { "camera-name": "Olympus Stylus Epic", format: "35mm", size: "24×36mm", "hidden-fields": ["exposure_comp"] },
  // 35mm point & shoot / half-frame
  { "camera-name": "Ektar H35n", format: "35mm", size: "24×18mm (half)", "hidden-fields": ["exposure_comp"] },
  // Medium format
  { "camera-name": "Hasselblad 500C/M", format: "120 (Medium)", size: "6×6", "hidden-fields": ["exposure_comp"] },
  { "camera-name": "Mamiya RB67", format: "120 (Medium)", size: "6×7", "hidden-fields": ["exposure_comp"] },
  { "camera-name": "Rolleiflex 2.8F", format: "120 (Medium)", size: "6×6", "hidden-fields": ["exposure_comp"] },
  { "camera-name": "Pentax 67", format: "120 (Medium)", size: "6×7", "hidden-fields": ["exposure_comp"] },
  { "camera-name": "Fuji GW690III", format: "120 (Medium)", size: "6×9", "hidden-fields": ["exposure_comp"] },
  { "camera-name": "Pentax 645", format: "120 (Medium)", size: "6×4.5" },
];

const DEFAULT_FILMS = [
  // Kodak color
  { "film-name": "Kodak Ektacolor Pro 160", iso: 160 },
  { "film-name": "Kodak Ektacolor Pro 400", iso: 400 },
  { "film-name": "Kodak Ektacolor Pro 800", iso: 800 },
  { "film-name": "Kodak Ektar 100", iso: 100 },
  { "film-name": "Kodak Gold 200", iso: 200 },
  { "film-name": "Kodak Ultramax 400", iso: 400 },
  { "film-name": "Kodacolor 100", iso: 100 },
  { "film-name": "Kodacolor 200", iso: 200 },
  // Kodak slide
  { "film-name": "Kodak Ektachrome E100", iso: 100 },
  // Kodak B&W
  { "film-name": "Kodak Ektapan 100", iso: 100 },
  { "film-name": "Kodak Ektapan 400", iso: 400 },
  { "film-name": "Kodak Ektapan P3200", iso: 3200 },
  // Kodak cinema
  { "film-name": "Kodak Vision3 50D", iso: 50 },
  { "film-name": "Kodak Vision3 250D", iso: 250 },
  { "film-name": "Kodak Vision3 200T", iso: 200 },
  { "film-name": "Kodak Vision3 500T", iso: 500 },
  // Ilford B&W
  { "film-name": "Ilford HP5 Plus", iso: 400 },
  { "film-name": "Ilford Delta 100", iso: 100 },
  { "film-name": "Ilford Delta 400", iso: 400 },
  { "film-name": "Ilford Delta 3200", iso: 3200 },
  { "film-name": "Ilford FP4 Plus", iso: 125 },
  { "film-name": "Ilford XP2 Super", iso: 400 },
  { "film-name": "Ilford Pan F Plus", iso: 50 },
  // Kentmere B&W
  { "film-name": "Kentmere 100", iso: 100 },
  { "film-name": "Kentmere 200", iso: 200 },
  { "film-name": "Kentmere 400", iso: 400 },
  // Foma B&W
  { "film-name": "Fomapan 100", iso: 100 },
  { "film-name": "Fomapan 200", iso: 200 },
  { "film-name": "Fomapan 400", iso: 400 },
  // CineStill
  { "film-name": "CineStill 50D", iso: 50 },
  { "film-name": "CineStill 400D", iso: 400 },
  { "film-name": "CineStill 800T", iso: 800 },
  // Fujifilm color
  { "film-name": "Fujifilm Superia 400", iso: 400 },
  { "film-name": "Fujifilm C200", iso: 200 },
  { "film-name": "Fujifilm Pro 400H", iso: 400 },
  // Fujifilm slide
  { "film-name": "Fujifilm Velvia 50", iso: 50 },
  { "film-name": "Fujifilm Velvia 100", iso: 100 },
  { "film-name": "Fujifilm Provia 100F", iso: 100 },
  // Fujifilm B&W
  { "film-name": "Fujifilm Neopan Acros 100 II", iso: 100 },
];

// Entity schemas
const ROLL_SCHEMA = {
  fields: [{ name: "roll-name", type: "text", label: "Roll Name", required: true }],
};

const FORMATS = {
  "35mm": ["24×36mm", "24×18mm (half)"],
  "120 (Medium)": ["6×4.5", "6×6", "6×7", "6×9", "6×12", "6×17"],
  "220 (Medium)": ["6×4.5", "6×6", "6×7", "6×9", "6×12", "6×17"],
  Sheet: ['4×5"', '8×10"'],
  APS: ["30×17mm"],
  "110 (Cartridge)": ["13x17mm"],
};

const CAMERA_SCHEMA = {
  fields: [
    { name: "camera-name", type: "text", label: "Camera Name", required: true },
    { name: "format", type: "film-format", label: "Format", required: true },
    { name: "size", type: "film-size", label: "Size", required: true },
  ],
};

const FILM_SCHEMA = {
  fields: [
    { name: "film-name", type: "text", label: "Film Name", required: true },
    { name: "iso", type: "number", label: "ISO", required: true },
  ],
};

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
      options: ["24mm", "28mm", "35mm", "40mm", "50mm", "55mm", "85mm", "105mm", "135mm", "200mm"],
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
      options: ["-2", "-1.5", "-1", "-0.5", "0", "+0.5", "+1", "+1.5", "+2"],
      defaultValue: "0",
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
