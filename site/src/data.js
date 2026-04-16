// ============================================================================
// DATA LAYER - Session management, options management, and data persistence
// ============================================================================

// SESSION MANAGER - manage camera and film selection (now delegates to current roll)
// ============================================================================

const SessionManager = {
  getSelectedCamera() {
    const currentRoll = RollManager.getCurrentRoll();
    return currentRoll
      ? currentRoll.camera
      : CameraManager.getAll()[0]?.name || "";
  },

  setSelectedCamera(cameraName) {
    const currentRoll = RollManager.getCurrentRoll();
    if (currentRoll) {
      currentRoll.camera = cameraName;
      RollManager.updateRoll(currentRoll.id, currentRoll);
    }
  },

  getAllCameras() {
    return CameraManager.getAll();
  },

  getSelectedFilm() {
    const currentRoll = RollManager.getCurrentRoll();
    return currentRoll ? currentRoll.film : FilmManager.getAll()[0]?.name || "";
  },

  setSelectedFilm(filmName) {
    const currentRoll = RollManager.getCurrentRoll();
    if (currentRoll) {
      currentRoll.film = filmName;
      RollManager.updateRoll(currentRoll.id, currentRoll);
    }
  },

  getAllFilms() {
    return FilmManager.getAll();
  },
};

// ============================================================================
// OPTIONS MANAGER - localStorage for dynamic select field options
// ============================================================================
// eslint-disable-next-line no-unused-vars
const OptionsManager = {
  OPTIONS_KEY_PREFIX: "fieldOptions_",
  CAMERAS_PREFIX: "cameras",

  // Build storage key for a field, incorporating camera name if camera-specific
  _getStorageKey(fieldName, camera = null) {
    const field = FRAME_SCHEMA.fields.find((f) => f.name === fieldName);
    const cameraName =
      camera ||
      (field && field.entity_specific === "camera"
        ? SessionManager.getSelectedCamera()
        : null);

    let storageKey = this.OPTIONS_KEY_PREFIX + fieldName;
    if (field && field.entity_specific === "camera" && cameraName) {
      storageKey += "_" + cameraName;
    }
    return storageKey;
  },

  // Get all select fields from schema
  getSelectFields() {
    return FRAME_SCHEMA.fields.filter((f) => f.type === "select");
  },

  // Get options for a specific field from localStorage or defaults
  getOptions(fieldName, camera = null) {
    const field = FRAME_SCHEMA.fields.find((f) => f.name === fieldName);
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
    const field = FRAME_SCHEMA.fields.find((f) => f.name === fieldName);
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
    const field = FRAME_SCHEMA.fields.find((f) => f.name === fieldName);
    return field && field.type === "select" ? field.options : [];
  },

  // Reset options to defaults
  resetOptions(fieldName, camera = null) {
    const field = FRAME_SCHEMA.fields.find((f) => f.name === fieldName);
    if (!field) return;

    localStorage.removeItem(this._getStorageKey(fieldName, camera));
  },

  // Rename camera in all option storage keys
  renameCameraKeys(oldName, newName) {
    const cameraFields = FRAME_SCHEMA.fields.filter(
      (f) => f.entity_specific === "camera",
    );
    cameraFields.forEach((field) => {
      const oldKey = this.OPTIONS_KEY_PREFIX + field.name + "_" + oldName;
      const stored = localStorage.getItem(oldKey);
      if (stored !== null) {
        const newKey = this.OPTIONS_KEY_PREFIX + field.name + "_" + newName;
        localStorage.setItem(newKey, stored);
        localStorage.removeItem(oldKey);
      }
    });
  },
};

// LOCATION MANAGER - Geolocation API wrapper
// ============================================================================
// eslint-disable-next-line no-unused-vars
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
