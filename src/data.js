// ============================================================================
// DATA LAYER - Session management, options management, and data persistence
// ============================================================================

// SESSION MANAGER - manage camera and film selection
// ============================================================================
const SessionManager = {
  CAMERA_KEY: "selectedCamera",
  FILM_KEY: "selectedFilm",

  // Get selected camera
  getSelectedCamera() {
    const stored = localStorage.getItem(this.CAMERA_KEY);
    if (stored) {
      return stored;
    }
    // Default to first camera
    return CAMERAS[0].name;
  },

  // Set selected camera
  setSelectedCamera(cameraName) {
    localStorage.setItem(this.CAMERA_KEY, cameraName);
  },

  // Get all available cameras
  getAllCameras() {
    return CAMERAS;
  },

  // Get selected film
  getSelectedFilm() {
    const stored = localStorage.getItem(this.FILM_KEY);
    if (stored) {
      return stored;
    }
    // Default to first film
    return FILMS[0].name;
  },

  // Set selected film
  setSelectedFilm(filmName) {
    localStorage.setItem(this.FILM_KEY, filmName);
  },

  // Get all available films
  getAllFilms() {
    return FILMS;
  },
};

// ============================================================================
// OPTIONS MANAGER - localStorage for dynamic select field options
// ============================================================================
const OptionsManager = {
  OPTIONS_KEY_PREFIX: "fieldOptions_",

  // Get all select fields from schema
  getSelectFields() {
    return SCHEMA.fields.filter((f) => f.type === "select");
  },

  // Get options for a specific field from localStorage or defaults
  // If field is camera_specific, use camera-specific storage key
  getOptions(fieldName, camera = null) {
    const field = SCHEMA.fields.find((f) => f.name === fieldName);
    if (!field || field.type !== "select") {
      return [];
    }

    // Determine which camera to use
    const cameraName =
      camera ||
      (field.camera_specific ? SessionManager.getSelectedCamera() : null);

    // Build storage key: camera-specific fields include camera name
    let storageKey = this.OPTIONS_KEY_PREFIX + fieldName;
    if (field.camera_specific && cameraName) {
      storageKey += "_" + cameraName;
    }

    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse options for", fieldName, e);
        return field.options || [];
      }
    }

    // Return default options from schema
    return field.options || [];
  },

  // Set options for a specific field in localStorage
  // If field is camera_specific, use camera-specific storage key
  setOptions(fieldName, optionsArray, camera = null) {
    const field = SCHEMA.fields.find((f) => f.name === fieldName);
    if (!field || field.type !== "select") {
      return false;
    }

    // Determine which camera to use
    const cameraName =
      camera ||
      (field.camera_specific ? SessionManager.getSelectedCamera() : null);

    // Build storage key: camera-specific fields include camera name
    let storageKey = this.OPTIONS_KEY_PREFIX + fieldName;
    if (field.camera_specific && cameraName) {
      storageKey += "_" + cameraName;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(optionsArray));
      return true;
    } catch (e) {
      console.error("Failed to save options for", fieldName, e);
      return false;
    }
  },

  // Get default options from schema
  getDefaultOptions(fieldName) {
    const field = SCHEMA.fields.find((f) => f.name === fieldName);
    return field && field.type === "select" ? field.options : [];
  },

  // Reset options to defaults
  resetOptions(fieldName, camera = null) {
    const field = SCHEMA.fields.find((f) => f.name === fieldName);
    if (!field) return;

    // Determine which camera to use
    const cameraName =
      camera ||
      (field.camera_specific ? SessionManager.getSelectedCamera() : null);

    // Build storage key: camera-specific fields include camera name
    let storageKey = this.OPTIONS_KEY_PREFIX + fieldName;
    if (field.camera_specific && cameraName) {
      storageKey += "_" + cameraName;
    }

    localStorage.removeItem(storageKey);
  },
};
const DataModel = {
  STORAGE_KEY: "tableData",

  // Load data from localStorage
  loadData() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  // Save data to localStorage
  saveData(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  // Clear all data
  clearData() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  // Get all rows
  getAllRows() {
    return this.loadData();
  },

  // Get a row by ID
  getRowById(id) {
    const rows = this.loadData();
    return rows.find((row) => row.id === id);
  },

  // Add new row
  addRow(rowData) {
    const rows = this.loadData();
    rows.push(rowData);
    this.saveData(rows);
    return rowData;
  },

  // Update existing row
  updateRow(id, rowData) {
    const rows = this.loadData();
    const index = rows.findIndex((row) => row.id === id);
    if (index !== -1) {
      rows[index] = rowData;
      this.saveData(rows);
    }
    return rows[index] || null;
  },

  // Delete row by ID
  deleteRow(id) {
    const rows = this.loadData();
    const filtered = rows.filter((row) => row.id !== id);
    this.saveData(filtered);
  },

  // Check if ID is unique (excluding current row if editing)
  isIdUnique(id, excludeId = null) {
    const rows = this.loadData();
    return !rows.some((row) => row.id === id && row.id !== excludeId);
  },

  // Get highest existing ID
  getLastId() {
    const rows = this.loadData();
    if (rows.length === 0) return null;
    const ids = rows.map((r) => r.id).filter((id) => typeof id === "number");
    return Math.max(...ids);
  },

  // Get next suggested ID
  getNextSuggestedId() {
    const lastId = this.getLastId();
    return lastId === null ? 0 : lastId + 1;
  },
};

// LOCATION MANAGER - Geolocation API wrapper
// ============================================================================
const LocationManager = {
  getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  },

  formatCoordinates(lat, lng) {
    return `${lat},${lng}`;
  },

  formatCoordinatesWithAccuracy(lat, lng, accuracy) {
    if (accuracy === undefined || accuracy === null) {
      return this.formatCoordinates(lat, lng);
    }
    const accuracyMeters = Math.round(accuracy);
    return `${lat},${lng} (±${accuracyMeters}m)`;
  },

  displayCoordinates(lat, lng) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  },

  parseCoordinates(coordString) {
    const [lat, lng] = coordString
      .split(",")
      .map((s) => parseFloat(s.trim()));
    return { lat, lng };
  },

  isValidCoordinates(coordString) {
    const regex = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
    return regex.test(coordString.trim());
  },

  getMapsUrl(coordString) {
    if (!this.isValidCoordinates(coordString)) {
      return null;
    }
    const cleaned = coordString.replace(/\s+/g, "");
    return `https://www.google.com/maps?q=${cleaned}`;
  },
};

// ============================================================================
