// ============================================================================
// FRAME MODAL - Add/edit frame dialog, validation, and form flows
// ============================================================================

// ============================================================================
// LOCATION MANAGER - Geolocation API wrapper
// ============================================================================
const LocationManager = {
  PROVIDER_KEY: "maps-provider",
  RGC_KEY: "rgc-enabled",
  PRECISION: 5,

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

  getReverseGeocode(coordString) {
    if (localStorage.getItem(this.RGC_KEY) !== "true" || !navigator.onLine) {
      return null;
    }
    const cleaned = coordString.replace(/\s+/g, "");
    const apiUrl = `https://nominatim.openstreetmap.org/reverse?lat=${cleaned.replace(",", "&lon=")}&format=json&addressdetails=0&zoom=12`;
    return fetch(apiUrl).then((res) => res.json());
  },

  // Map a 0..1 fraction to a hex color along a white->blue ramp.
  colorForFraction(t) {
    const scaled = 0.5 * Math.sign(2 * t - 1) * (2 * t - 1) ** 2;
    const channel = Math.round(255 * (0.5 - scaled));
    const toHex = (v) => v.toString(16).padStart(2, "0");
    return `#${toHex(channel)}${toHex(channel)}ff`;
  },

  // Build an anonymous uMap URL that preloads a marker per frame with valid
  // coordinates and continuous color, named "Frame <id>". Returns null when
  // no frame has a location.
  buildUmapUrl(frames) {
    const located = (frames || [])
      .filter((f) => f.location && this.isValidCoordinates(f.location))
      .sort((a, b) => Number(a.id) - Number(b.id));
    if (located.length === 0) return null;
    const rows = located.map((f, i) => {
      const { lat, lng } = this.parseCoordinates(f.location);
      const fraction = located.length > 1 ? i / (located.length - 1) : 0;
      return `Frame ${f.id},${this.formatCoordinates(lat, lng)},${this.colorForFraction(fraction)}`;
    });
    const csv = ["name,latitude,longitude,color", ...rows].join("\n");
    const params = new URLSearchParams({
      data: csv,
      dataFormat: "csv",
      showLabel: "true",
    });
    return `https://umap.openstreetmap.fr/en/map/?${params.toString()}`;
  },
};

// ============================================================================
// MODAL DIALOG MANAGEMENT
// ============================================================================

const FrameModal = {
  element: null,
  bodyElement: null,
  titleElement: null,
  mode: null,
  currentRowId: null,

  init() {
    this.element = document.getElementById("frameModal");
    this.bodyElement = this.element.querySelector("#frameModalBody");
    this.titleElement = document.getElementById("frameModalTitle");

    // Save button
    this.element
      .querySelector("form")
      .addEventListener("submit", (e) => this._submitForm(e));

    // Cancel button
    this.element
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this.close());

    // Close on click outside
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) this.close();
    });
  },

  // Render form fields based on schema
  renderFormFields(rowData = null, isEditMode = false) {
    const camera = RollManager.getCurrentCamera();
    let html = "";

    FRAME_SCHEMA.fields.forEach((field) => {
      if (CameraManager.isFieldHidden(field.name, camera)) return;

      const inputId = `field-${field.name}`;
      const required = field.required ? "required" : "";

      if (field.type === "select") {
        html += this._renderSelectField(field, inputId, required, rowData);
      } else if (field.name === "location") {
        html += this._renderLocationField(
          field,
          inputId,
          required,
          rowData,
          isEditMode,
        );
      } else if (field.type === "datetime") {
        html += this._renderDateField(
          field,
          inputId,
          required,
          rowData,
          isEditMode,
        );
      } else if (field.type === "checkbox") {
        html += this._renderCheckboxField(field, inputId, rowData);
      } else if (field.name === "notes") {
        html += this._renderNotesField(field, inputId, required, rowData);
      } else if (field.name === "id") {
        html += this._renderIdField(field, inputId, required, rowData);
      } else {
        html += this._renderTextField(field, inputId, required, rowData);
      }
    });

    this.bodyElement.innerHTML = html;
    this._wireFormEvents(isEditMode, rowData);
  },

  _renderSelectField(field, inputId, required, rowData) {
    const entityType = field.entity_specific || "";
    const entityName =
      entityType === "camera" ? RollManager.getCurrentCamera() : "";
    const dynamicOptions = OptionsManager.getOptions(
      field.name,
      entityType,
      entityName,
    );

    const effectiveDefault =
      dynamicOptions.length > 0 && !dynamicOptions.includes(field.defaultValue)
        ? dynamicOptions[0]
        : field.defaultValue;
    const currentValue = rowData
      ? rowData[field.name] || effectiveDefault
      : effectiveDefault;
    const isCustom =
      field.custom_value &&
      currentValue &&
      !dynamicOptions.includes(currentValue);

    let html = `
      <div class="settings-row form-group">
        <label for="${inputId}" class="row-label"><span class="row-title">${field.label}${field.required ? " *" : ""}</span></label>
        <div class="custom-select-wrap">
          <select id="${inputId}" name="${field.name}" class="row-select" ${required} ${isCustom ? 'style="display:none"' : ""}>
    `;

    dynamicOptions.forEach((option) => {
      const selected = !isCustom && option === currentValue ? "selected" : "";
      html += `<option value="${escapeHtml(option)}" ${selected}>${escapeHtml(option)}</option>`;
    });

    if (field.custom_value) {
      html += `<option value="__custom__" ${isCustom ? "selected" : ""}>Custom\u2026</option>`;
    }

    html += `</select>`;

    if (field.custom_value) {
      html += `
        <div class="custom-input-wrap" ${isCustom ? "" : 'style="display:none"'}>
          <input type="text" class="custom-value-input"
            value="${isCustom ? escapeHtml(currentValue) : ""}"
            placeholder="Enter value" />
          <button type="button" class="secondary custom-cancel-btn" title="Back to list">
            <svg class="icon"><use href="icons.svg#icon-close"></use></svg>
          </button>
        </div>
      `;
    }

    html += `</div></div>`;
    return html;
  },

  _renderLocationField(field, inputId, required, rowData, isEditMode) {
    const value = isEditMode ? (rowData[field.name] ?? "") : "";
    const mapsUrl = value ? LocationManager.getMapsUrl(value) : null;

    if (isEditMode) {
      return `
        <div class="settings-row form-group">
          <span class="row-label">
            <span class="row-title">${field.label}${field.required ? " *" : ""}</span>
          </span>
          <div class="row-control">
            <input type="text" id="${inputId}" name="${field.name}"
              value="${escapeHtml(String(value))}" ${required}
              ${field.readonly ? "readonly" : ""} />
            <button type="button" id="refresh-location-btn" class="secondary">
              <svg class="icon"><use href="icons.svg#icon-pin"></use></svg>
            </button>
            ${mapsUrl ? `<button type="button" id="maps-location-btn" class="secondary" title="Open in maps"><svg class="icon"><use href="icons.svg#icon-map"></use></svg></button>` : ""}
          </div>
          <div class="form-hint-row" style="display: none">
            <span class="accuracy-hint"></span>
          </div>
          <div class="form-hint-row" style="display: none">
            <span class="geocode-hint"></span>
          </div>
        </div>
      `;
    }

    return `
      <div class="settings-row form-group">
        <span class="row-label">
          <span class="row-title">${field.label}${field.required ? " *" : ""}</span>
        </span>
        <input type="text" id="${inputId}" name="${field.name}"
          value="${escapeHtml(String(value))}" ${required}
          ${field.readonly ? "readonly" : ""}
          placeholder="Auto-capturing via GPS..." />
        <div class="form-hint-row" style="display: none">
          <span class="accuracy-hint"></span>
        </div>
        <div class="form-hint-row" style="display: none">
          <span class="geocode-hint"></span>
        </div>
      </div>
    `;
  },

  _renderDateField(field, inputId, required, rowData, isEditMode) {
    const value = isEditMode
      ? (rowData[field.name] ?? "").substring(0, 16)
      : "";

    return `
      <div class="settings-row form-group">
        <label for="${inputId}" class="row-label"><span class="row-title">${field.label}${field.required ? " *" : ""}</span></label>
        <div class="row-control">
          <input type="datetime-local" id="${inputId}" name="${field.name}"
            value="${escapeHtml(String(value))}" ${required}
            ${field.readonly ? "readonly" : ""} />
          <button type="button" id="refresh-date-btn" class="secondary">
            <svg class="icon"><use href="icons.svg#icon-refresh"></use></svg>
          </button>
        </div>
      </div>
    `;
  },

  _renderCheckboxField(field, inputId, rowData) {
    const checked = rowData
      ? rowData[field.name] === true
      : !!field.defaultValue;
    return `
      <label for="${inputId}" class="settings-row form-group">
        <span class="row-label"><span class="row-title">${field.label}</span></span>
        <input type="checkbox" id="${inputId}" name="${field.name}"
          class="row-checkbox" ${checked ? "checked" : ""} />
      </label>
    `;
  },

  _renderNotesField(field, inputId, required, rowData) {
    const value = rowData ? (rowData[field.name] ?? "") : "";
    return `
      <div class="settings-row form-group">
        <label for="${inputId}" class="row-label"><span class="row-title">${field.label}${field.required ? " *" : ""}</span></label>
        <div class="row-control">
          <input type="text" id="${inputId}" name="${field.name}"
            value="${escapeHtml(String(value))}" ${required}
            ${field.readonly ? "readonly" : ""} />
          <button type="button" class="secondary notes-clear-btn" title="Clear">
            <svg class="icon"><use href="icons.svg#icon-close"></use></svg>
          </button>
        </div>
      </div>
    `;
  },

  _renderIdField(field, inputId, required, rowData) {
    const value = rowData ? (rowData[field.name] ?? "") : "";
    return `
      <div class="settings-row form-group">
        <span class="row-label">
          <span class="row-title">${field.label}${field.required ? " *" : ""}</span>
        </span>
        <div class="row-control">
          <input type="number" id="${inputId}" name="${field.name}"
            value="${escapeHtml(String(value))}" ${required}
            ${field.readonly ? "readonly" : ""} />
          <button type="button" class="secondary stepper-btn down" title="Decrease"><svg class="icon"><use href="icons.svg#icon-down"></use></svg></button>
          <button type="button" class="secondary stepper-btn up" title="Increase"><svg class="icon"><use href="icons.svg#icon-up"></use></svg></button>
        </div>
        <div class="form-hint-row" style="display: none">
          <span class="id-validation-hint"></span>
        </div>
      </div>
    `;
  },

  _renderTextField(field, inputId, required, rowData) {
    const value = rowData ? (rowData[field.name] ?? "") : "";
    return `
      <div class="settings-row form-group">
        <label for="${inputId}" class="row-label"><span class="row-title">${field.label}${field.required ? " *" : ""}</span></label>
        <input type="${field.type === "number" ? "number" : "text"}"
          id="${inputId}" name="${field.name}"
          value="${escapeHtml(String(value))}" ${required}
          ${field.readonly ? "readonly" : ""} />
      </div>
    `;
  },

  _wireFormEvents(isEditMode, rowData) {
    // Notes clear button
    const notesClearBtn = this.bodyElement.querySelector(".notes-clear-btn");
    if (notesClearBtn) {
      notesClearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        notesClearBtn.closest("div").querySelector("input, textarea").value =
          "";
      });
    }

    // Frame # stepper buttons
    const idInput = document.getElementById("field-id");
    this.bodyElement.querySelectorAll(".stepper-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!idInput) return;
        if (btn.classList.contains("up")) idInput.stepUp();
        else idInput.stepDown();
        idInput.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });

    // Frame # validation hint
    idInput.addEventListener("change", (e) => {
      const excludeId = isEditMode ? rowData.id : null;
      const hintText = RollManager.isFrameIdUnique(
        e.target.valueAsNumber,
        excludeId,
      )
        ? ""
        : "Frame ID already exists!";
      const hintEl = idInput
        .closest(".form-group")
        ?.querySelector(".id-validation-hint");
      if (hintEl) {
        this._setHintText(hintEl, hintText);
      }
    });

    // Custom value select/input toggles
    this.bodyElement.querySelectorAll(".custom-select-wrap").forEach((wrap) => {
      const select = wrap.querySelector("select");
      const customWrap = wrap.querySelector(".custom-input-wrap");
      if (!select || !customWrap) return;

      select.addEventListener("change", () => {
        if (select.value === "__custom__") {
          select.style.display = "none";
          customWrap.style.display = "";
          customWrap.querySelector("input").focus();
        }
      });

      const cancelBtn = customWrap.querySelector(".custom-cancel-btn");
      cancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        customWrap.style.display = "none";
        select.style.display = "";
        select.value = select.options[0].value;
      });
    });

    // Date refresh button
    const refreshDateBtn = document.getElementById("refresh-date-btn");
    if (refreshDateBtn) {
      refreshDateBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._fetchAndSetDate();
      });
    }

    // Location buttons (edit mode only)
    if (isEditMode) {
      const refreshBtn = document.getElementById("refresh-location-btn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => this._fetchAndSetLocation());
      }

      const mapsBtn = document.getElementById("maps-location-btn");
      if (mapsBtn) {
        mapsBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const locationInput = document.getElementById("field-location");
          if (locationInput && locationInput.value) {
            const url = LocationManager.getMapsUrl(locationInput.value);
            if (url) window.open(url, "_blank");
          }
        });
      }
    }

    // Reverse geocode hint (both add and edit modes)
    const locationInput = document.getElementById("field-location");
    if (locationInput) {
      locationInput.addEventListener("change", () =>
        this._updateReverseGeocode(locationInput),
      );
      this._updateReverseGeocode(locationInput);
    }

    // Delete button
    const deleteBtn = this.element.querySelector(".delete-btn");
    if (isEditMode) {
      deleteBtn.onclick = () => {
        if (confirm("Are you sure you want to delete this frame?")) {
          RollManager.deleteFrame(rowData.id);
          this.close();
          refreshAllUI();
        }
      };
      deleteBtn.style.display = "";
    } else {
      deleteBtn.style.display = "none";
    }

    // Auto-focus first input
    const firstInput = this.bodyElement.querySelector("input, select");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  },

  open(mode = "add", rowId = null) {
    this.mode = mode;
    this.currentRowId = mode === "add" ? null : rowId;

    if (mode === "add") {
      this.titleElement.textContent = "Add Frame";
      const refData = RollManager.getFrameById(rowId);
      this.renderFormFields(refData, false);
    } else {
      this.titleElement.textContent = "Edit Frame";
      const rowData = RollManager.getFrameById(rowId);
      this.renderFormFields(rowData, true);
    }

    this.element.classList.add("active");
  },

  close() {
    this.element.classList.remove("active");
  },

  // Public entry point: open the add modal and auto-populate id, location, date
  async openAddModal() {
    const lastId = RollManager.getLastFrameId();
    this.open("add", lastId);
    const suggestedId = RollManager.getNextSuggestedFrameId();
    document.getElementById("field-id").value = suggestedId;

    // Fetch location and date automatically
    this._fetchAndSetLocation();
    this._fetchAndSetDate();
  },

  // Public entry point: open the edit modal for given row id
  openEditModal(rowId) {
    FrameModal.open("edit", rowId);
  },

  // Set a hint span's text and show/hide its enclosing row based on emptiness
  _setHintText(hintEl, text) {
    hintEl.textContent = text;
    const row = hintEl.closest(".form-hint-row");
    if (row) row.style.display = text ? "" : "none";
  },

  // Reverse geocode the current location value and render it below the field
  async _updateReverseGeocode(locationField) {
    const hintEl = locationField
      .closest(".form-group")
      ?.querySelector(".geocode-hint");
    if (!hintEl) return;

    const value = locationField.value.trim();
    if (!value || !LocationManager.isValidCoordinates(value)) {
      this._setHintText(hintEl, "");
      return;
    }

    const lookup = LocationManager.getReverseGeocode(value);
    if (!lookup) {
      this._setHintText(hintEl, "");
      return;
    }

    this._setHintText(hintEl, "Looking up location\u2026");
    try {
      const data = await lookup;
      this._setHintText(hintEl, data?.display_name ?? "");
    } catch (error) {
      this._setHintText(hintEl, "");
      console.error("Reverse geocode error:", error);
    }
  },

  // Fetch location and set to form field
  async _fetchAndSetLocation() {
    const locationField = document.getElementById("field-location");
    if (!locationField) return;

    locationField.disabled = true;
    const originalValue = locationField.value;
    locationField.value = "Fetching location...";

    try {
      const location = await LocationManager.getLocation();
      const formatted = LocationManager.formatCoordinates(
        location.lat,
        location.lng,
      );
      locationField.value = formatted;

      // Show accuracy as a helper text if available
      const accuracyText = location.accuracy
        ? `Accuracy: ±${Math.round(location.accuracy)}m`
        : "";
      const helperEl = locationField
        .closest(".form-group")
        ?.querySelector(".accuracy-hint");
      if (helperEl) {
        this._setHintText(helperEl, accuracyText);
      }

      this._updateReverseGeocode(locationField);

      locationField.disabled = false;
    } catch (error) {
      let errorMsg = "Location unavailable";
      if (error.code === error.PERMISSION_DENIED) {
        errorMsg =
          "Permission denied. Enable in Settings > Privacy > Location Services";
      } else if (error.code === error.TIMEOUT) {
        errorMsg = "Location request timed out";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMsg = "Location unavailable";
      }
      locationField.value = originalValue;
      locationField.disabled = false;
      locationField.placeholder = errorMsg;
      console.error("Geolocation error:", error);
    }
  },

  _fetchAndSetDate() {
    const dateField = document.getElementById("field-date");
    if (!dateField) return;

    const now = new Date();
    dateField.value = formatDate(now);
  },

  // Handle form submission
  _submitForm(event) {
    event.preventDefault();

    const formData = FormValidator.getFormData();
    const excludeId = this.mode === "edit" ? this.currentRowId : null;
    const validation = FormValidator.validate(formData, excludeId);

    if (!validation.valid) {
      alert("Validation errors:\n" + validation.errors.join("\n"));
      return;
    }

    if (this.mode === "add") {
      RollManager.addFrame(formData);
    } else {
      RollManager.updateFrame(this.currentRowId, formData);
    }

    this.close();
    refreshAllUI();
  },
};

// ============================================================================
// FORM VALIDATION
// ============================================================================

const FormValidator = {
  getFormData() {
    const formData = {};
    const camera = RollManager.getCurrentCamera();

    FRAME_SCHEMA.fields.forEach((field) => {
      // Hidden fields save as null
      if (CameraManager.isFieldHidden(field.name, camera)) {
        formData[field.name] = null;
        return;
      }

      const input = document.getElementById(`field-${field.name}`);
      if (input) {
        let value = input.value;

        // For custom_value selects, read from the text input if active
        if (field.custom_value && value === "__custom__") {
          const wrap = input.closest(".custom-select-wrap");
          const customInput = wrap && wrap.querySelector(".custom-value-input");
          value = customInput ? customInput.value.trim() : "";
        }

        // Only trim for text/number inputs, not select
        if (field.type !== "select") {
          value = value.trim();
        }

        if (field.type === "number") {
          value = value === "" ? null : parseInt(value, 10);
        }

        if (field.type === "checkbox") {
          value = input.checked;
        }

        formData[field.name] = value;
      }
    });
    return formData;
  },

  validate(formData, excludeId = null) {
    const errors = [];

    // Check required fields
    FRAME_SCHEMA.fields.forEach((field) => {
      if (
        field.required &&
        (formData[field.name] === null || formData[field.name] === "")
      ) {
        errors.push(`${field.label} is required`);
      }
    });

    // Check ID uniqueness
    if (!RollManager.isFrameIdUnique(formData.id, excludeId)) {
      errors.push("ID must be unique");
    }

    // Validate location coordinates if provided
    if (formData.location && formData.location.trim() !== "") {
      if (!LocationManager.isValidCoordinates(formData.location)) {
        errors.push(
          "Location must be in format: latitude,longitude (e.g., 40.7128,-74.0060)",
        );
      }
    }

    // Validate and augment date coordinates if provided
    if (formData.date && formData.date.trim() !== "") {
      const dateStr = formData.date.trim();
      const dtLocal = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
      const date = new Date(dateStr);
      if (!dtLocal.test(dateStr) || isNaN(date.getTime())) {
        errors.push(
          "Date must be a valid date string (e.g., 2026-01-12T14:35)",
        );
      }
      // Add timezone information and convert to ISO8601.
      // Use the offset at the entered date (not now) to handle DST correctly.
      const pad = (n) => String(n).padStart(2, "0");

      const seconds = "00";
      const tzOffset = -new Date(dateStr).getTimezoneOffset();
      const sign = tzOffset >= 0 ? "+" : "-";
      const tzHours = pad(Math.floor(Math.abs(tzOffset) / 60));
      const tzMinutes = pad(Math.abs(tzOffset) % 60);

      formData.date += `:${seconds}${sign}${tzHours}:${tzMinutes}`;
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  },
};

// ============================================================================
// FRAME INTERPOLATION - Fill in missing frames between two logged frames
// ============================================================================

// eslint-disable-next-line no-unused-vars
const FrameInterpolator = {
  // Calculate distance between two points in km using a simple Euclidean approximation
  // https://medium.com/mapbox/fast-geodesic-approximations-with-cheap-ruler-106f229ad016
  _simpleDistance(loc1, loc2) {
    const dy = (20004 * (loc1.lat - loc2.lat)) / 180;
    const dx =
      ((40075 * (loc1.lng - loc2.lng)) / 360) *
      Math.cos((((loc1.lat + loc2.lat) / 2) * Math.PI) / 180);
    return Math.sqrt(dx ** 2 + dy ** 2);
  },

  // Interpolate the frame data at `index`, given the nearest logged frames
  // before (`prevFrame`) and after (`nextFrame`) it. `index` is strictly
  // between the indices of prevFrame and nextFrame.
  // Return null if date or location difference is too large.
  interpolateFrame(index, prevFrame, nextFrame) {
    const DURATION_LIMIT = 60 * 60 * 1000; // 1 hour, in ms
    const DISTANCE_LIMIT = 1; // 1 km
    const fraction = (index - prevFrame.id) / (nextFrame.id - prevFrame.id);

    const frame = {
      ...prevFrame,
      id: index,
      notes: `Interpolated from frames ${prevFrame.id} and ${nextFrame.id}`,
    };

    if (prevFrame.date && nextFrame.date) {
      const prevTime = new Date(prevFrame.date).getTime();
      const nextTime = new Date(nextFrame.date).getTime();
      if (prevTime > nextTime || nextTime - prevTime > DURATION_LIMIT) {
        return null;
      }
      frame.date = formatDate(
        new Date(prevTime + fraction * (nextTime - prevTime)),
      );
    }

    if (
      prevFrame.location &&
      nextFrame.location &&
      LocationManager.isValidCoordinates(prevFrame.location) &&
      LocationManager.isValidCoordinates(nextFrame.location)
    ) {
      const prevCoords = LocationManager.parseCoordinates(prevFrame.location);
      const nextCoords = LocationManager.parseCoordinates(nextFrame.location);
      if (this._simpleDistance(prevCoords, nextCoords) > DISTANCE_LIMIT) {
        return null;
      }
      frame.location = LocationManager.formatCoordinates(
        prevCoords.lat + fraction * (nextCoords.lat - prevCoords.lat),
        prevCoords.lng + fraction * (nextCoords.lng - prevCoords.lng),
      );
    }

    return frame;
  },

  // Find every gap in frame ids within a roll's frames and fill each one in
  // by calling interpolateFrame with the surrounding existing frames.
  // Return failed indices separately for reporting.
  interpolateFramesInRoll(frames) {
    const sorted = [...frames].sort((a, b) => a.id - b.id);
    const newFrames = [];
    const failedIds = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const prevFrame = sorted[i];
      const nextFrame = sorted[i + 1];

      for (let id = prevFrame.id + 1; id < nextFrame.id; id++) {
        const newFrame = this.interpolateFrame(id, prevFrame, nextFrame);
        if (newFrame !== null) {
          newFrames.push(newFrame);
        } else {
          failedIds.push(id);
        }
      }
    }

    return { newFrames, failedIds };
  },
};
