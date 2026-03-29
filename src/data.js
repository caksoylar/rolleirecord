// ============================================================================
// DATA LAYER - Session management, options management, and data persistence
// ============================================================================

/* eslint-disable no-unused-vars */

// SESSION MANAGER - manage camera and film selection (now delegates to current roll)
// ============================================================================
const SessionManager = {
  // Get selected camera from current roll
  getSelectedCamera() {
    const currentRoll = RollManager.getCurrentRoll();
    return currentRoll ? currentRoll.camera : CAMERAS[0].name;
  },

  // Set selected camera in current roll
  setSelectedCamera(cameraName) {
    const currentRoll = RollManager.getCurrentRoll();
    if (currentRoll) {
      currentRoll.camera = cameraName;
      RollManager.updateRoll(currentRoll.id, currentRoll);
    }
  },

  // Get all available cameras
  getAllCameras() {
    return CAMERAS;
  },

  // Get selected film from current roll
  getSelectedFilm() {
    const currentRoll = RollManager.getCurrentRoll();
    return currentRoll ? currentRoll.film : FILMS[0].name;
  },

  // Set selected film in current roll
  setSelectedFilm(filmName) {
    const currentRoll = RollManager.getCurrentRoll();
    if (currentRoll) {
      currentRoll.film = filmName;
      RollManager.updateRoll(currentRoll.id, currentRoll);
    }
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
  CAMERAS_PREFIX: "cameras",

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
  // Delegate to RollManager for all operations

  // Get all rows from current roll
  getAllRows() {
    return RollManager.getFrames();
  },

  // Get a row by ID from current roll
  getRowById(id) {
    return RollManager.getFrameById(id);
  },

  // Add new row to current roll
  addRow(rowData) {
    return RollManager.addFrame(rowData);
  },

  // Update existing row in current roll
  updateRow(id, rowData) {
    return RollManager.updateFrame(id, rowData);
  },

  // Delete row by ID from current roll
  deleteRow(id) {
    return RollManager.deleteFrame(id);
  },

  // Check if ID is unique in current roll (excluding current row if editing)
  isIdUnique(id, excludeId = null) {
    return RollManager.isFrameIdUnique(id, excludeId);
  },

  // Get highest existing ID in current roll
  getLastId() {
    const frames = RollManager.getFrames();
    if (frames.length === 0) return null;
    const ids = frames.map((f) => f.id).filter((id) => typeof id === "number");
    return ids.length === 0 ? null : Math.max(...ids);
  },

  // Get next suggested ID for current roll
  getNextSuggestedId() {
    return RollManager.getNextSuggestedFrameId();
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
        },
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
    const [lat, lng] = coordString.split(",").map((s) => parseFloat(s.trim()));
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
