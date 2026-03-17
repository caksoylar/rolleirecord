// ============================================================================
// DATA LAYER - Session management, options management, and data persistence
// ============================================================================

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

// ROLL MANAGER - Multi-roll management system
// ============================================================================
const RollManager = {
  ROLLS_KEY: "rolls",
  CURRENT_ROLL_KEY: "current-roll-id",
  ROLL_ID_COUNTER_KEY: "roll-counter",

  // Initialize rollmanager
  init() {
    const rolls = this.getRolls();

    // Ensure current roll is set if rolls exist, cleared if not
    const currentRollId = this.getCurrentRollId();
    if (rolls.length === 0) {
      localStorage.removeItem(this.CURRENT_ROLL_KEY);
    } else if (!currentRollId || !rolls.find((r) => r.id === currentRollId)) {
      this.setCurrentRollId(rolls[0].id);
    }
  },

  // Get all rolls
  getRolls() {
    const stored = localStorage.getItem(this.ROLLS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  // Save all rolls
  saveRolls(rolls) {
    localStorage.setItem(this.ROLLS_KEY, JSON.stringify(rolls));
  },

  // Get current roll ID
  getCurrentRollId() {
    return localStorage.getItem(this.CURRENT_ROLL_KEY);
  },

  // Set current roll ID
  setCurrentRollId(rollId) {
    localStorage.setItem(this.CURRENT_ROLL_KEY, rollId);
  },

  // Get next roll ID
  getNextRollId() {
    let counter = localStorage.getItem(this.ROLL_ID_COUNTER_KEY);
    counter = counter ? parseInt(counter) + 1 : 1;
    localStorage.setItem(this.ROLL_ID_COUNTER_KEY, counter.toString());
    return `roll-${counter}`;
  },

  // Get roll by ID
  getRollById(rollId) {
    const rolls = this.getRolls();
    return rolls.find((r) => r.id === rollId) || null;
  },

  // Get current roll
  getCurrentRoll() {
    const currentId = this.getCurrentRollId();
    if (!currentId) return null;
    return this.getRollById(currentId);
  },

  // Create new roll
  createRoll(name) {
    const rolls = this.getRolls();

    // Generate unique roll ID
    const rollId = this.getNextRollId();

    // Create roll with defaults
    const newRoll = {
      id: rollId,
      name: name,
      camera: CAMERAS[0]?.name || "",
      film: FILMS[0]?.name || "",
      frames: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    rolls.push(newRoll);
    this.saveRolls(rolls);

    // Set as current roll if it's the first one
    if (rolls.length === 1) {
      this.setCurrentRollId(rollId);
    }

    return newRoll;
  },

  // Delete roll
  deleteRoll(rollId) {
    const rolls = this.getRolls();

    const filtered = rolls.filter((r) => r.id !== rollId);
    this.saveRolls(filtered);

    // If deleted roll was current, switch to first remaining or clear
    if (this.getCurrentRollId() === rollId) {
      if (filtered.length > 0) {
        this.setCurrentRollId(filtered[0].id);
      } else {
        localStorage.removeItem(this.CURRENT_ROLL_KEY);
      }
    }

    return true;
  },

  // Rename roll
  renameRoll(rollId, newName) {
    const rolls = this.getRolls();
    const roll = rolls.find((r) => r.id === rollId);

    if (roll) {
      roll.name = newName;
      roll.updatedAt = new Date().toISOString();
      this.saveRolls(rolls);
    }

    return roll || null;
  },

  // Update entire roll
  updateRoll(rollId, rollData) {
    const rolls = this.getRolls();
    const roll = rolls.find((r) => r.id === rollId);

    if (roll) {
      Object.assign(roll, rollData);
      roll.updatedAt = new Date().toISOString();
      this.saveRolls(rolls);
    }

    return roll || null;
  },

  // Set current roll
  setCurrentRoll(rollId) {
    const roll = this.getRollById(rollId);
    if (roll) {
      this.setCurrentRollId(rollId);
    }
    return roll || null;
  },

  // Get frames from current roll
  getFrames() {
    const currentRoll = this.getCurrentRoll();
    return currentRoll ? currentRoll.frames : [];
  },

  // Get frame by ID from current roll
  getFrameById(frameId) {
    const frames = this.getFrames();
    return frames.find((f) => f.id === frameId) || null;
  },

  // Add frame to current roll
  addFrame(frameData) {
    const currentRoll = this.getCurrentRoll();
    if (!currentRoll) return null;

    currentRoll.frames.push(frameData);
    currentRoll.updatedAt = new Date().toISOString();
    this.updateRoll(currentRoll.id, currentRoll);

    return frameData;
  },

  // Update frame in current roll
  updateFrame(frameId, frameData) {
    const currentRoll = this.getCurrentRoll();
    if (!currentRoll) return null;

    const frameIndex = currentRoll.frames.findIndex((f) => f.id === frameId);
    if (frameIndex !== -1) {
      currentRoll.frames[frameIndex] = frameData;
      currentRoll.updatedAt = new Date().toISOString();
      this.updateRoll(currentRoll.id, currentRoll);
      return frameData;
    }

    return null;
  },

  // Delete frame from current roll
  deleteFrame(frameId) {
    const currentRoll = this.getCurrentRoll();
    if (!currentRoll) return false;

    const initialLength = currentRoll.frames.length;
    currentRoll.frames = currentRoll.frames.filter((f) => f.id !== frameId);

    if (currentRoll.frames.length < initialLength) {
      currentRoll.updatedAt = new Date().toISOString();
      this.updateRoll(currentRoll.id, currentRoll);
      return true;
    }

    return false;
  },

  // Check if frame ID is unique in current roll
  isFrameIdUnique(frameId, excludeId = null) {
    const frames = this.getFrames();
    return !frames.some((f) => f.id === frameId && f.id !== excludeId);
  },

  // Get next suggested frame ID
  getNextSuggestedFrameId() {
    const frames = this.getFrames();
    if (frames.length === 0) return 1;
    const ids = frames.map((f) => f.id).filter((id) => typeof id === "number");
    return ids.length === 0 ? 1 : Math.max(...ids) + 1;
  },
};

// ============================================================================
