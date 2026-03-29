// ============================================================================
// CONFIGURATION - Camera & Film Lists and Schema Definition
// ============================================================================
// Edit this file to customize cameras, films, and table fields

const CAMERAS = [
  { name: "Nikon FM" },
  { name: "Ektar H35n" },
];

const FILMS = [
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

const SCHEMA = {
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
      camera_specific: true,
      width: "23%",
      options: ["B", "1", "1/2", "1/4", "1/8", "1/16", "1/30", "1/60", "1/125", "1/250", "1/500", "1/1000"],
      defaultValue: "1/60",
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
      options: ["ƒ/1.8", "ƒ/2.0", "ƒ/2.8", "ƒ/4.0", "ƒ/5.6", "ƒ/8", "ƒ/11", "ƒ/16", "ƒ/22"],
      defaultValue: "ƒ/4.0",
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
