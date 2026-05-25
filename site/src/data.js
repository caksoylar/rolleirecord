// ============================================================================
// DATA LAYER - Session management, options management, and data persistence
// ============================================================================

// SESSION MANAGER - manage camera and film selection (now delegates to current roll)
// ============================================================================

// eslint-disable-next-line no-unused-vars
const SessionManager = {
  _setRollField(fieldName, value) {
    const currentRoll = RollManager.getCurrentRoll();
    if (currentRoll) {
      currentRoll[fieldName] = value;
      RollManager.updateRoll(currentRoll.id, currentRoll);
    }
  },

  getSelectedCamera() {
    const currentRoll = RollManager.getCurrentRoll();
    return currentRoll
      ? currentRoll.camera
      : CameraManager.getAll()[0]?.name || "";
  },

  setSelectedCamera(cameraName) {
    this._setRollField("camera", cameraName);
  },

  getAllCameras() {
    return CameraManager.getAll();
  },

  getSelectedFilm() {
    const currentRoll = RollManager.getCurrentRoll();
    return currentRoll ? currentRoll.film : FilmManager.getAll()[0]?.name || "";
  },

  setSelectedFilm(filmName) {
    this._setRollField("film", filmName);
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
  OPTIONS_KEY: "fieldOptions",

  _getField(fieldName) {
    return FRAME_SCHEMA.fields.find((f) => f.name === fieldName);
  },

  _readAll() {
    const raw = localStorage.getItem(this.OPTIONS_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      console.error("Failed to parse field options store", e);
      return {};
    }
  },

  _writeAll(obj) {
    try {
      localStorage.setItem(this.OPTIONS_KEY, JSON.stringify(obj));
      return true;
    } catch (e) {
      console.error("Failed to save field options store", e);
      return false;
    }
  },

  // Get options for a specific field from localStorage or defaults
  getOptions(fieldName, entityType = "", entityName = "") {
    const field = this._getField(fieldName);
    if (!field || field.type !== "select") {
      return [];
    }

    const stored = this._readAll()?.[entityType]?.[entityName]?.[fieldName];
    if (Array.isArray(stored)) {
      return stored;
    }

    // Return default options from schema
    return field.options || [];
  },

  // Set options for a specific field in localStorage
  setOptions(fieldName, optionsArray, entityType = "", entityName = "") {
    const field = this._getField(fieldName);
    if (!field || field.type !== "select") {
      return false;
    }

    const all = this._readAll();
    if (!all[entityType]) all[entityType] = {};
    if (!all[entityType][entityName]) all[entityType][entityName] = {};
    all[entityType][entityName][fieldName] = optionsArray;
    return this._writeAll(all);
  },

  // Get default options from schema
  getDefaultOptions(fieldName) {
    const field = this._getField(fieldName);
    return field && field.type === "select" ? field.options : [];
  },

  // Reset options to defaults
  resetOptions(fieldName, entityType = "", entityName = "") {
    const field = this._getField(fieldName);
    if (!field) return false;

    const all = this._readAll();
    const fields = all?.[entityType]?.[entityName];
    if (!fields || !(fieldName in fields)) return true;
    delete fields[fieldName];
    if (Object.keys(fields).length === 0) {
      delete all[entityType][entityName];
      if (Object.keys(all[entityType]).length === 0) {
        delete all[entityType];
      }
    }
    return this._writeAll(all);
  },

  // Rename an entity in the options store (e.g., camera renamed from oldName to newName)
  renameEntityKeys(entityType, oldName, newName) {
    const all = this._readAll();
    const bucket = all[entityType];
    if (!bucket || !(oldName in bucket)) return;
    bucket[newName] = bucket[oldName];
    delete bucket[oldName];
    this._writeAll(all);
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
    // eslint-disable-next-line eqeqeq
    if (accuracy == null) {
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
