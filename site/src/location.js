// ============================================================================
// LOCATION MANAGER - Geolocation, maps, and reverse-geocoding utilities
// ============================================================================

// eslint-disable-next-line no-unused-vars
const LocationManager = {
  PROVIDER_KEY: "maps-provider",
  RGC_KEY: "rgc-enabled",
  RGC_CACHE_KEY: "reverse-geocode-cache-v1",
  RGC_CACHE_MAX_ENTRIES: 1000,
  PRECISION: 5,

  /**
   * Serializes cache-miss reverse-geocoding work and waits one second after
   * each task settles before allowing the next one to start. The lock is
   * released after failures as well as successful tasks.
   *
   * @param {() => Promise<string | null>} task
   * @returns {Promise<string | null>}
   */
  _queueReverseGeocode: (() => {
    let lock = Promise.resolve();
    const delayMs = 1000;

    return async (task) => {
      const previousLock = lock;
      let release;

      lock = new Promise((resolve) => {
        release = resolve;
      });

      await previousLock;

      try {
        return await task();
      } finally {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        release();
      }
    };
  })(),

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
    return `${lat.toFixed(this.PRECISION)},${lng.toFixed(this.PRECISION)}`;
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
    const provider = localStorage.getItem(this.PROVIDER_KEY) ?? "google";

    if (!this.isValidCoordinates(coordString)) {
      return null;
    }
    const cleaned = coordString.replace(/\s+/g, "");
    return (
      {
        google: `https://www.google.com/maps?q=${cleaned}`,
        apple: `https://maps.apple.com/place?coordinate=${cleaned}`,
        osm: `https://www.openstreetmap.org/?mlat=${cleaned.replace(",", "&mlon=")}`,
      }[provider] ?? null
    );
  },

  _getReverseGeocodeCache() {
    const stored = localStorage.getItem(this.RGC_CACHE_KEY);
    if (!stored) return {};

    const cache = JSON.parse(stored);
    return cache && typeof cache === "object" && !Array.isArray(cache)
      ? cache
      : {};
  },

  _saveReverseGeocodeCache(cache) {
    const keys = Object.keys(cache);
    const excess = keys.length - this.RGC_CACHE_MAX_ENTRIES;
    if (excess > 0) {
      keys.slice(0, excess).forEach((key) => delete cache[key]);
    }
    localStorage.setItem(this.RGC_CACHE_KEY, JSON.stringify(cache));
  },

  getReverseGeocode(coordString) {
    if (!this.isValidCoordinates(coordString)) {
      return null;
    }
    const { lat, lng } = this.parseCoordinates(coordString);
    const key = this.formatCoordinates(lat, lng);
    const cache = this._getReverseGeocodeCache();
    if (cache[key]) {
      return cache[key];
    }
    if (localStorage.getItem(this.RGC_KEY) !== "true" || !navigator.onLine) {
      return null;
    }

    const apiUrl = `https://nominatim.openstreetmap.org/reverse?lat=${key.replace(",", "&lon=")}&format=json&addressdetails=0&zoom=16`;
    return this._queueReverseGeocode(async () => {
      const latestCache = this._getReverseGeocodeCache();
      if (latestCache[key]) {
        return latestCache[key];
      }

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Reverse geocode request failed: ${response.status}`);
      }

      const data = await response.json();
      const displayName = data?.display_name;
      if (!displayName) return null;

      latestCache[key] = displayName;
      this._saveReverseGeocodeCache(latestCache);
      return displayName;
    });
  },

  getLocationLabel(location, onResolved) {
    if (!location) return "Location unavailable";

    const lookup = this.getReverseGeocode(location);
    if (lookup && typeof lookup.then === "function") {
      void lookup.then(
        (label) => {
          if (label) onResolved?.(label);
        },
        (error) => console.error("Reverse geocode lookup failed:", error),
      );
      return location;
    }

    return lookup || location;
  },

  buildUmapUrl(frames) {
    const located = (frames || [])
      .filter(
        (frame) => frame.location && this.isValidCoordinates(frame.location),
      )
      .sort((frameA, frameB) => Number(frameA.id) - Number(frameB.id));
    if (located.length === 0) return null;
    const rows = located.map((frame) => {
      const { lat, lng } = this.parseCoordinates(frame.location);
      return `Frame ${frame.id},${this.formatCoordinates(lat, lng)}`;
    });
    const csv = ["name,latitude,longitude", ...rows].join("\n");
    const params = new URLSearchParams({
      data: csv,
      dataFormat: "csv",
      showLabel: "true",
    });
    return `https://umap.openstreetmap.fr/en/map/?${params.toString()}`;
  },
};
