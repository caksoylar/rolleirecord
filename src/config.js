// ============================================================================
// CONFIGURATION - Default data seeds and Schema Definitions
// ============================================================================
// Edit this file to customize default cameras, films, and table fields

/* eslint-disable no-unused-vars */

// Default seed data (used to populate localStorage on first load)
const DEFAULT_CAMERAS = [
  { name: "Nikon FM", format: "35mm", size: "24×36mm" },
  { name: "Ektar H35n", format: "35mm", size: "24×18mm (half)" },
];

const DEFAULT_FILMS = [
  { name: "Kodak Portra 160", iso: 160 },
  { name: "Kodak Portra 400", iso: 400 },
  { name: "Kodak Portra 800", iso: 800 },
  { name: "Kodacolor 100", iso: 100 },
  { name: "Kodacolor 200", iso: 200 },
  { name: "Kodak Ultramax 400", iso: 400 },
  { name: "Kodak Ektar 100", iso: 100 },
  { name: "Fujifilm Superia 400", iso: 400 },
  { name: "Ilford HP5 Plus", iso: 400 },
  { name: "Kodak Gold 200", iso: 200 },
  { name: "Kentmere 100", iso: 100 },
  { name: "Kentmere 200", iso: 200 },
  { name: "Kentmere 400", iso: 400 },
];

// Entity schemas
const ROLL_SCHEMA = {
  fields: [{ name: "name", type: "text", label: "Roll Name", required: true }],
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
    { name: "name", type: "text", label: "Camera Name", required: true },
    { name: "format", type: "film-format", label: "Format", required: true },
    { name: "size", type: "film-size", label: "Size", required: true },
  ],
};

const FILM_SCHEMA = {
  fields: [
    { name: "name", type: "text", label: "Film Name", required: true },
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
      width: "12%",
    },
    {
      name: "shutter",
      type: "select",
      label: "Shutter Speed",
      header: "S",
      visible: true,
      readonly: false,
      required: false,
      camera_specific: true,
      width: "23%",
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
      camera_specific: true,
      width: "23%",
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
      camera_specific: true,
      width: "23%",
      options: ["35mm", "85mm"],
      defaultValue: "35mm",
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
