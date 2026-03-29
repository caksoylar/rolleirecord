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

  // Build storage key for a field, incorporating camera name if camera-specific
  _getStorageKey(fieldName, camera = null) {
    const field = SCHEMA.fields.find((f) => f.name === fieldName);
    const cameraName =
      camera ||
      (field && field.camera_specific
        ? SessionManager.getSelectedCamera()
        : null);

    let storageKey = this.OPTIONS_KEY_PREFIX + fieldName;
    if (field && field.camera_specific && cameraName) {
      storageKey += "_" + cameraName;
    }
    return storageKey;
  },

  // Get all select fields from schema
  getSelectFields() {
    return SCHEMA.fields.filter((f) => f.type === "select");
  },

  // Get options for a specific field from localStorage or defaults
  getOptions(fieldName, camera = null) {
    const field = SCHEMA.fields.find((f) => f.name === fieldName);
    if (!field || field.type !== "select") {
      return [];
    }

    const stored = localStorage.getItem(this._getStorageKey(fieldName, camera));

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
  setOptions(fieldName, optionsArray, camera = null) {
    const field = SCHEMA.fields.find((f) => f.name === fieldName);
    if (!field || field.type !== "select") {
      return false;
    }

    try {
      localStorage.setItem(
        this._getStorageKey(fieldName, camera),
        JSON.stringify(optionsArray),
      );
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

    localStorage.removeItem(this._getStorageKey(fieldName, camera));
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
