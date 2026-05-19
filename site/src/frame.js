// ============================================================================
// FRAME MODAL - Add/edit frame dialog, validation, and form flows
// ============================================================================

// APPLICATION STATE
let appState = {
  mode: null, // 'add' or 'edit'
  currentRowId: null,
};

// ============================================================================
// MODAL DIALOG MANAGEMENT
// ============================================================================

const FrameModal = {
  element: null,
  bodyElement: null,
  titleElement: null,

  init() {
    this.element = document.getElementById("frameModal");
    this.bodyElement = this.element.querySelector("#frameModalBody");
    this.titleElement = document.getElementById("frameModalTitle");

    // Save button
    this.element
      .querySelector("form")
      .addEventListener("submit", (e) => ModalFlows.submitForm(e));

    // Cancel button
    this.element
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this.close());
  },

  // Render form fields based on schema
  renderFormFields(rowData = null, isEditMode = false) {
    let html = "";
    const camera = SessionManager.getSelectedCamera();

    FRAME_SCHEMA.fields.forEach((field) => {
      // Skip hideable fields that are hidden for this camera
      if (field.hideable && CameraManager.isFieldHidden(field.name, camera)) {
        return;
      }

      const inputId = `field-${safeInputId(field.name)}`;
      const required = field.required ? "required" : "";

      if (field.type === "select") {
        // Pass current camera to OptionsManager if field is camera-specific
        const camera =
          field.entity_specific === "camera"
            ? SessionManager.getSelectedCamera()
            : null;
        const dynamicOptions = OptionsManager.getOptions(field.name, camera);

        // Use schema default if it's in the options list, otherwise fall back to first option
        const effectiveDefault =
          dynamicOptions.length > 0 &&
          !dynamicOptions.includes(field.defaultValue)
            ? dynamicOptions[0]
            : field.defaultValue;
        const currentValue = rowData
          ? rowData[field.name] || effectiveDefault
          : effectiveDefault;
        const isCustom =
          field.custom_value &&
          currentValue &&
          !dynamicOptions.includes(currentValue);

        html += `
          <div class="form-group">
            <label for="${inputId}">${field.label}${field.required ? " *" : ""}</label>
            <div class="custom-select-wrap">
              <select
                id="${inputId}"
                name="${safeInputId(field.name)}"
                ${required}
                ${isCustom ? 'style="display:none"' : ""}
              >
        `;

        dynamicOptions.forEach((option) => {
          const selected =
            !isCustom && option === currentValue ? "selected" : "";
          html += `<option value="${escapeHtml(option)}" ${selected}>${escapeHtml(option)}</option>`;
        });

        if (field.custom_value) {
          html += `<option value="__custom__" ${isCustom ? "selected" : ""}>Custom\u2026</option>`;
        }

        html += `</select>`;

        if (field.custom_value) {
          html += `
              <div class="custom-input-wrap" ${isCustom ? "" : 'style="display:none"'}>
                <input type="text"
                  class="custom-value-input"
                  value="${isCustom ? escapeHtml(currentValue) : ""}"
                  placeholder="Enter value"
                />
                <button type="button" class="secondary custom-cancel-btn" title="Back to list"><svg class="icon"><use href="icons.svg#icon-close"></use></svg></button>
              </div>
          `;
        }

        html += `</div></div>`;
      } else if (field.name === "location") {
        // Special handling for location field
        const value = isEditMode ? rowData[field.name] || "" : "";
        const mapsUrl = value ? LocationManager.getMapsUrl(value) : null;

        if (isEditMode) {
          // In edit mode: show field with refresh button and optional maps link
          html += `
                            <div class="form-group">
                                <label for="${inputId}">${field.label}${field.required ? " *" : ""}</label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <input 
                                        type="text"
                                        id="${inputId}"
                                        name="${safeInputId(field.name)}"
                                        value="${escapeHtml(String(value))}"
                                        ${required}
                                        ${field.readonly ? "readonly" : ""}
                                        style="flex: 1;"
                                    />
                                    <button type="button" id="refresh-location-btn" class="secondary" style="flex: 0 0 auto; padding: 0.5rem 0.75rem;">
                                        <svg class="icon"><use href="icons.svg#icon-pin"></use></svg>
                                    </button>
                                    ${mapsUrl ? `<button type="button" id="maps-location-btn" class="secondary" style="flex: 0 0 auto; padding: 0.5rem 0.75rem;" title="Open in Google Maps"><svg class="icon"><use href="icons.svg#icon-map"></use></svg></button>` : ""}
                                </div>
                                <div class="accuracy-hint"></div>
                            </div>
                        `;
        } else {
          // In add mode: just show field (location will be fetched by openAddModal)
          html += `
                            <div class="form-group">
                                <label for="${inputId}">${field.label}${field.required ? " *" : ""}</label>
                                <input 
                                    type="text"
                                    id="${inputId}"
                                    name="${safeInputId(field.name)}"
                                    value="${escapeHtml(String(value))}"
                                    ${required}
                                    ${field.readonly ? "readonly" : ""}
                                    placeholder="Auto-capturing via GPS..."
                                />
                                <div/><div class="accuracy-hint"></div>
                            </div>
                        `;
        }
      } else if (field.name === "date") {
        // Special handling for date field
        const value = isEditMode
          ? (rowData[field.name] || "").substring(0, 16)
          : "";

        html += `
                            <div class="form-group">
                                <label for="${inputId}">${field.label}${field.required ? " *" : ""}</label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <input 
                                        type="datetime-local"
                                        id="${inputId}"
                                        name="${safeInputId(field.name)}"
                                        value="${escapeHtml(String(value))}"
                                        ${required}
                                        ${field.readonly ? "readonly" : ""}
                                        style="flex: 1;"
                                    />
                                    <button type="button" id="refresh-date-btn" class="secondary" style="flex: 0 0 auto; padding: 0.5rem 0.75rem;">
                                        <svg class="icon"><use href="icons.svg#icon-refresh"></use></svg>
                                    </button>
                                </div>
                            </div>
                        `;
      } else if (field.type === "checkbox") {
        const checked = rowData
          ? rowData[field.name] === true
          : !!field.defaultValue;
        html += `
                            <div class="form-group">
                                <label for="${inputId}">${field.label}</label>
                                <input 
                                    type="checkbox"
                                    id="${inputId}"
                                    name="${safeInputId(field.name)}"
                                    ${checked ? "checked" : ""}
                                />
                            </div>
                        `;
      } else if (field.name === "notes") {
        const value = rowData ? rowData[field.name] || "" : "";
        html += `
                            <div class="form-group">
                                <label for="${inputId}">${field.label}${field.required ? " *" : ""}</label>
                                <div class="notes-field-wrap">
                                    <input
                                        type="text"
                                        id="${inputId}"
                                        name="${safeInputId(field.name)}"
                                        value="${escapeHtml(String(value))}"
                                        ${required}
                                        ${field.readonly ? "readonly" : ""}
                                    />
                                    <button type="button" class="secondary notes-clear-btn" title="Clear"><svg class="icon"><use href="icons.svg#icon-close"></use></svg></button>
                                </div>
                            </div>
                        `;
      } else {
        // Render text or number input
        const value = rowData ? rowData[field.name] || "" : "";
        html += `
                            <div class="form-group">
                                <label for="${inputId}">${field.label}${field.required ? " *" : ""}</label>
                                <input 
                                    type="${field.type === "number" ? "number" : "text"}"
                                    id="${inputId}"
                                    name="${safeInputId(field.name)}"
                                    value="${escapeHtml(String(value))}"
                                    ${required}
                                    ${field.readonly ? "readonly" : ""}
                                />
                            </div>
                        `;
      }
    });

    this.bodyElement.innerHTML = html;

    // Wire up notes clear button
    const notesClearBtn = this.bodyElement.querySelector(".notes-clear-btn");
    if (notesClearBtn) {
      notesClearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        notesClearBtn.closest("div").querySelector("input, textarea").value =
          "";
      });
    }

    // Wire up custom value select/input toggles
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

    const refreshDateBtn = document.getElementById("refresh-date-btn");
    if (refreshDateBtn) {
      refreshDateBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await ModalFlows.fetchAndSetDate();
      });
    }

    // Attach refresh button listener in edit mode
    if (isEditMode) {
      const refreshBtn = document.getElementById("refresh-location-btn");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          ModalFlows.fetchAndSetLocation();
        });
      }

      // Attach maps button listener if location is valid
      const mapsBtn = document.getElementById("maps-location-btn");
      if (mapsBtn) {
        mapsBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const locationInput = document.getElementById("field-location");
          if (locationInput && locationInput.value) {
            const url = LocationManager.getMapsUrl(locationInput.value);
            if (url) {
              window.open(url, "_blank");
            }
          }
        });
      }
    }

    // Delete button
    const deleteBtn = this.element.querySelector(".delete-btn");
    if (isEditMode) {
      deleteBtn.onclick = () => {
        if (confirm("Are you sure you want to delete this frame?")) {
          RollManager.deleteFrame(rowData.id);
          this.close();
          TableRenderer.render();
        }
      };
      deleteBtn.style.display = "";
    } else {
      deleteBtn.style.display = "none";
    }

    // Auto-focus first input (text/number/select)
    const firstInput = this.bodyElement.querySelector("input, select");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  },

  open(mode = "add", rowId = null) {
    appState.mode = mode;
    appState.currentRowId = mode === "add" ? null : rowId;

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
};

// ============================================================================
// FORM VALIDATION
// ============================================================================

const FormValidator = {
  getFormData() {
    const formData = {};
    const camera = SessionManager.getSelectedCamera();

    FRAME_SCHEMA.fields.forEach((field) => {
      // Hidden fields save as null
      if (field.hideable && CameraManager.isFieldHidden(field.name, camera)) {
        formData[field.name] = null;
        return;
      }

      const input = document.getElementById(`field-${safeInputId(field.name)}`);
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
          "Date must be a valid date string (e.g., 2026-01-12T12:35:02-07:00)",
        );
      }
      // Add timezone information and convert to ISO8601
      const pad = (n) => String(n).padStart(2, "0");

      const seconds = "00";
      const tzOffset = -new Date().getTimezoneOffset();
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
// MODAL FLOWS AND FORM SUBMISSION
// ============================================================================

const ModalFlows = {
  // Handle add new row
  async openAddModal() {
    const lastId = RollManager.getLastFrameId();
    FrameModal.open("add", lastId);
    const suggestedId = RollManager.getNextSuggestedFrameId();
    document.getElementById("field-id").value = suggestedId;

    // Fetch location and date automatically
    ModalFlows.fetchAndSetLocation();
    ModalFlows.fetchAndSetDate();
  },

  // Handle edit existing row
  openEditModal(rowId) {
    FrameModal.open("edit", rowId);
  },

  // Fetch location and set to form field
  async fetchAndSetLocation() {
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
        ? ` (Accuracy: ±${Math.round(location.accuracy)}m)`
        : "";
      const helperEl =
        locationField.parentElement?.querySelector(".accuracy-hint") ||
        locationField.parentElement?.parentElement?.querySelector(
          ".accuracy-hint",
        );
      if (helperEl) {
        helperEl.textContent = accuracyText;
      }

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

  fetchAndSetDate() {
    const dateField = document.getElementById("field-date");
    if (!dateField) return;

    const now = new Date();

    const pad = (n) => String(n).padStart(2, "0");

    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());

    dateField.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  },

  // Handle form submission
  submitForm(event) {
    event.preventDefault();

    const formData = FormValidator.getFormData();
    const excludeId = appState.mode === "edit" ? appState.currentRowId : null;
    const validation = FormValidator.validate(formData, excludeId);

    if (!validation.valid) {
      alert("Validation errors:\n" + validation.errors.join("\n"));
      return;
    }

    if (appState.mode === "add") {
      RollManager.addFrame(formData);
    } else {
      RollManager.updateFrame(appState.currentRowId, formData);
    }

    FrameModal.close();
    TableRenderer.render();
    RollSelector.render();
  },

  closeModal() {
    FrameModal.close();
  },
};

// ============================================================================
// USER INTERFACE HANDLERS (called from onclick in HTML)
// ============================================================================
// eslint-disable-next-line no-unused-vars
const UI = {
  openAddModal() {
    ModalFlows.openAddModal();
  },

  openEditModal(rowId) {
    ModalFlows.openEditModal(rowId);
  },
};
