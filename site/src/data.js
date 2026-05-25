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
