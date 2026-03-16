// ============================================================================
// CONFIGURATION - Camera & Film Lists and Schema Definition
// ============================================================================
// Edit this file to customize cameras, films, and table fields

const CAMERAS = [
  { name: "nikon_fm", label: "Nikon FM" },
  { name: "ektar_h35n", label: "Ektar H35n" },
];

const FILMS = [
  { name: "portra160", label: "Kodak Portra 160", iso: 160 },
  { name: "portra400", label: "Kodak Portra 400", iso: 400 },
  { name: "portra800", label: "Kodak Portra 800", iso: 800 },
  { name: "kodacolor100", label: "Kodacolor 100", iso: 100 },
  { name: "kodacolor200", label: "Kodacolor 200", iso: 200 },
  { name: "ultramax400", label: "Kodak Ultramax 400", iso: 400 },
  { name: "ektar100", label: "Kodak Ektar 100", iso: 100 },
  { name: "superia400", label: "Fujifilm Superia 400", iso: 400 },
  { name: "hp5plus", label: "Ilford HP5 Plus", iso: 400 },
  { name: "gold200", label: "Kodak Gold 200", iso: 200 },
  { name: "kentmere100", label: "Kentmere 100", iso: 100 },
  { name: "kentmere200", label: "Kentmere 200", iso: 200 },
  { name: "kentmere400", label: "Kentmere 400", iso: 400 },
];

const SCHEMA = {
  fields: [
    {
      name: "id",
      type: "number",
      label: "#",
      header: "#",
      visible: true,
      readonly: false,
      required: true,
      width: "8%",
    },
    {
      name: "shutter",
      type: "select",
      label: "Shutter Speed",
      header: "Shutter",
      visible: true,
      readonly: false,
      required: false,
      camera_specific: true,
      width: "25%",
      options: ["B", "1", "1/2", "1/4", "1/8", "1/16", "1/30", "1/60", "1/125", "1/250", "1/500", "1/1000"],
      defaultValue: "1/60",
    },
    {
      name: "aperture",
      type: "select",
      label: "Aperture",
      header: "Aperture",
      visible: true,
      readonly: false,
      required: false,
      camera_specific: false,
      width: "22%",
      options: ["ƒ1.8", "ƒ2.0", "ƒ2.8", "ƒ4.0", "ƒ5.6", "ƒ8", "ƒ11", "ƒ16", "ƒ22"],
      defaultValue: "ƒ4.0",
    },
    {
      name: "lens",
      type: "select",
      label: "Lens",
      header: "Lens",
      visible: true,
      readonly: false,
      required: false,
      camera_specific: true,
      width: "22%",
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
      name: "location",
      type: "text",
      label: "Location",
      visible: false,
      readonly: false,
      required: false,
    },
  ],
  visibleFields: ["id", "notes", "lens"],
};

const APP_CONFIG = {
  storageKey: "tableData",
  appName: "Dynamic Table",
};
