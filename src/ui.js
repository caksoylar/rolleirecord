// ============================================================================
// UI LAYER - All user interface components and utilities
// ============================================================================

// APPLICATION STATE
// ============================================================================
let appState = {
  mode: null, // 'add' or 'edit'
  currentRowId: null,
};

// ============================================================================
// UI VISIBILITY - Show/hide elements based on roll state
// ============================================================================
const UIVisibility = {
  update() {
    const hasRoll = RollManager.getCurrentRoll() !== null;
    const cameraBar = document.querySelector(".camera-selector-bar");
    const controls = document.querySelector(".controls");

    if (cameraBar) cameraBar.style.display = hasRoll ? "" : "none";
    if (controls) controls.style.display = hasRoll ? "" : "none";
  },
};

// ============================================================================
// TABLE RENDERING
// ============================================================================
const TableRenderer = {
  // Render table headers dynamically from visible fields
  renderHeaders() {
    const visibleFields = SCHEMA.fields.filter((f) => f.visible);
    let html = "<thead><tr>";

    visibleFields.forEach((field) => {
      const w = field.width ? ` style="width:${field.width}"` : "";
      html += `<th${w}>${field.header || field.label}</th>`;
    });

    html += '<th>⁝</th></tr></thead>';
    return html;
  },

  // Render table body with all rows
  renderTableBody() {
    const rows = DataModel.getAllRows();
    const visibleFields = SCHEMA.fields.filter((f) => f.visible);

    let html = "<tbody>";
    html += "<tr>";
    visibleFields.forEach((field) => {
      html += `<td></td>`;
    });
    html += `<td class="actions"><button onclick="UI.openAddModal()" title="Add new">✚</button></td>`
    html += "</tr>";

    rows.sort((r1, r2) => r2.id - r1.id).forEach((row) => {
      html += "<tr>";

      visibleFields.forEach((field) => {
        const value = row[field.name] === null ? "" : row[field.name];
        html += `<td>${escapeHtml(String(value))}</td>`;
      });

      html += `<td class="actions">
                        <button onclick="UI.openEditModal(${row.id})" title="Edit">✎</button>
                    </td></tr>`;
    });

    html += "</tbody>";
    return html;
  },

  // Full table render
  render() {
    const container = document.getElementById("tableContainer");
    const hasRoll = RollManager.getCurrentRoll() !== null;

    if (!hasRoll) {
      container.innerHTML =
        '<div class="empty-state"><p>No rolls yet</p><p>Create a new roll to get started</p></div>';
    } else {
      container.innerHTML = `<table>${this.renderHeaders()}${this.renderTableBody()}</table>`;
    }

    UIVisibility.update();
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

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
    this.element.querySelector("form").addEventListener("submit", (e) => ModalFlows.submitForm(e));

    // Cancel button
    this.element.querySelector(".cancel-btn").addEventListener("click", () => this.close());
  },

  // Render form fields based on schema
  renderFormFields(rowData = null, isEditMode = false) {
    let html = "";

    SCHEMA.fields.forEach((field) => {
      const inputId = `field-${field.name}`;
      const required = field.required ? "required" : "";

      if (field.type === "select") {
        // Render select dropdown
        const currentValue = rowData
          ? rowData[field.name] || field.defaultValue
          : field.defaultValue;
        // Pass current camera to OptionsManager if field is camera-specific
        const camera = field.camera_specific
          ? SessionManager.getSelectedCamera()
          : null;
        const dynamicOptions = OptionsManager.getOptions(field.name, camera);
        html += `
                            <div class="form-group">
                                <label for="${inputId}">${field.label}${field.required ? " *" : ""}</label>
                                <select 
                                    id="${inputId}"
                                    name="${field.name}"
                                    ${required}
                                >
                        `;

        dynamicOptions.forEach((option) => {
          const selected = option === currentValue ? "selected" : "";
          html += `<option value="${escapeHtml(option)}" ${selected}>${escapeHtml(option)}</option>`;
        });

        html += `
                                </select>
                            </div>
                        `;
      } else if (field.name === "location") {
        // Special handling for location field
        const value = isEditMode ? rowData[field.name] || "" : "";
        const mapsUrl = value ? LocationManager.getMapsUrl(value) : null;
        
        if (isEditMode) {
          // In edit mode: show field with refresh button and optional maps link
          html += `
                            <div class="form-group">
                                <label for="${inputId}">${field.label}${field.required ? " *" : ""}</label>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <input 
                                        type="text"
                                        id="${inputId}"
                                        name="${field.name}"
                                        value="${escapeHtml(String(value))}"
                                        ${required}
                                        ${field.readonly ? "readonly" : ""}
                                        style="flex: 1;"
                                    />
                                    <button type="button" id="refresh-location-btn" class="secondary" style="flex: 0 0 auto; padding: 0.5rem 0.75rem;">
                                        🔄
                                    </button>
                                    ${mapsUrl ? `<button type="button" id="maps-location-btn" class="secondary" style="flex: 0 0 auto; padding: 0.5rem 0.75rem;" title="Open in Google Maps">🗺️</button>` : ""}
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
                                    name="${field.name}"
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
        const value = isEditMode ? rowData[field.name].substring(0, 16) || "" : "";
        
        html += `
                            <div class="form-group">
                                <label for="${inputId}">${field.label}${field.required ? " *" : ""}</label>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <input 
                                        type="datetime-local"
                                        id="${inputId}"
                                        name="${field.name}"
                                        value="${escapeHtml(String(value))}"
                                        ${required}
                                        ${field.readonly ? "readonly" : ""}
                                        style="flex: 1;"
                                    />
                                    <button type="button" id="refresh-date-btn" class="secondary" style="flex: 0 0 auto; padding: 0.5rem 0.75rem;">
                                        🔄
                                    </button>
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
                                    name="${field.name}"
                                    value="${escapeHtml(String(value))}"
                                    ${required}
                                    ${field.readonly ? "readonly" : ""}
                                />
                            </div>
                        `;
      }
    });

    this.bodyElement.innerHTML = html;

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
      // deleteBtn.addEventListener("click", () => { UI.openDeleteConfirm(rowData.id); this.close(); });
      deleteBtn.onclick = (() => { UI.openDeleteConfirm(rowData.id); this.close(); });
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
      this.titleElement.textContent = "Add New Row";
      const refData = DataModel.getRowById(rowId);
      this.renderFormFields(refData, false);
    } else {
      this.titleElement.textContent = "Edit Row";
      const rowData = DataModel.getRowById(rowId);
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
    SCHEMA.fields.forEach((field) => {
      const input = document.getElementById(`field-${field.name}`);
      if (input) {
        let value = input.value;

        // Only trim for text/number inputs, not select
        if (field.type !== "select") {
          value = value.trim();
        }

        if (field.type === "number") {
          value = value === "" ? null : parseInt(value, 10);
        }

        formData[field.name] = value;
      }
    });
    return formData;
  },

  validate(formData, excludeId = null) {
    const errors = [];

    // Check required fields
    SCHEMA.fields.forEach((field) => {
      if (
        field.required &&
        (formData[field.name] === null || formData[field.name] === "")
      ) {
        errors.push(`${field.label} is required`);
      }
    });

    // Check ID uniqueness
    if (!DataModel.isIdUnique(formData.id, excludeId)) {
      errors.push("ID must be unique");
    }

    // Validate location coordinates if provided
    if (formData.location && formData.location.trim() !== "") {
      if (!LocationManager.isValidCoordinates(formData.location)) {
        errors.push(
          "Location must be in format: latitude,longitude (e.g., 40.7128,-74.0060)"
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
          "Date must be a valid date string (e.g., 2026-01-12T12:35:02-07:00)"
        );
      }
      // Add timezone information and convert to ISO8601
      const pad = (n) => String(n).padStart(2, '0');

      const seconds = '00';
      const tzOffset = -(new Date()).getTimezoneOffset();
      const sign = tzOffset >= 0 ? '+' : '-';
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
    const lastId = DataModel.getLastId();
    FrameModal.open("add", lastId);
    const suggestedId = DataModel.getNextSuggestedId();
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
        location.lng
      );
      locationField.value = formatted;
      
      // Show accuracy as a helper text if available
      const accuracyText = location.accuracy ? 
        ` (Accuracy: ±${Math.round(location.accuracy)}m)` : "";
      const helperEl = locationField.parentElement?.querySelector(".accuracy-hint") || locationField.parentElement?.parentElement?.querySelector(".accuracy-hint");
      if (helperEl) {
        helperEl.textContent = accuracyText;
      }
      
      locationField.disabled = false;
    } catch (error) {
      let errorMsg = "Location unavailable";
      if (error.code === error.PERMISSION_DENIED) {
        errorMsg = "Permission denied. Enable in Settings > Privacy > Location Services";
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
  
    const pad = (n) => String(n).padStart(2, '0');

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
      DataModel.addRow(formData);
    } else {
      DataModel.updateRow(appState.currentRowId, formData);
    }

    FrameModal.close();
    TableRenderer.render();
  },

  closeModal() {
    FrameModal.close();
  },
};

// ============================================================================
// USER INTERFACE HANDLERS
// ============================================================================
const UI = {
  openAddModal() {
    ModalFlows.openAddModal();
  },

  openEditModal(rowId) {
    ModalFlows.openEditModal(rowId);
  },

  openDeleteConfirm(rowId) {
    ConfirmDialog.openDelete(rowId);
  },
};

// ============================================================================
// CONFIRMATION DIALOG
// ============================================================================
const ConfirmDialog = {
  dialogElement: null,
  overlayElement: null,
  messageElement: null,

  init() {
    this.dialogElement = document.getElementById("confirmDialog");
    this.overlayElement = document.getElementById("confirmOverlay");
    this.messageElement = document.getElementById("confirmMessage");

    this.dialogElement.querySelector("#confirmYes").addEventListener("click", () => this.confirmDelete());
    this.dialogElement.querySelector("#confirmNo").addEventListener("click", () => this.cancel());
    this.overlayElement.addEventListener("click", () => this.cancel());
  },

  openDelete() {
    this.messageElement.textContent = `Are you sure you want to delete this frame?`;
    this.show();
  },

  confirmDelete() {
    const out = DataModel.deleteRow(appState.currentRowId);
    this.hide();
    TableRenderer.render();
  },

  cancel() {
    this.hide();
  },

  show() {
    this.dialogElement.classList.add("active");
    this.overlayElement.classList.add("active");
  },

  hide() {
    this.dialogElement.classList.remove("active");
    this.overlayElement.classList.remove("active");
  },
};

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================
const Export = {
  exportToJSON() {
    const rows = DataModel.getAllRows();
    rows.forEach(row => {row.aperture = row.aperture.replace("ƒ/", "")})

    const camera = CAMERAS.find(val => val.name == SessionManager.getSelectedCamera()).name;
    const film = FILMS.find(val => val.name == SessionManager.getSelectedFilm()).name;
    const iso = FILMS.find(val => val.name == SessionManager.getSelectedFilm()).iso;
    const currentRoll = RollManager.getCurrentRoll();

    // Add camera and film to each row
    const enrichedData = rows.map((row) => ({
      ...row,
      camera,
      film,
      iso,
    }));

    const jsonString = JSON.stringify(enrichedData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    
    // Use roll name in filename, replace special characters with underscores
    const rollName = currentRoll ? currentRoll.name.replace(/[^a-z0-9]/gi, "_") : "export";
    link.href = url;
    link.download = `${rollName}-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

// ============================================================================
// CAMERA SELECTOR
// ============================================================================
const CameraSelector = {
  element: null,

  init() {
    this.element = document.getElementById("cameraSelect");
    this.populateCameras();
    this.element.addEventListener("change", (e) =>
      this.onCameraSelected(e.target.value),
    );
  },

  populateCameras() {
    const cameras = SessionManager.getAllCameras();
    this.element.innerHTML = "";

    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.name;
      option.textContent = camera.name;
      this.element.appendChild(option);
    });

    // Set to currently selected camera
    this.element.value = SessionManager.getSelectedCamera();
  },

  render() {
    this.populateCameras();
  },

  onCameraSelected(cameraName) {
    SessionManager.setSelectedCamera(cameraName);
    // Re-render table to show updated options for camera-specific fields
    TableRenderer.render();
  },
};

// ============================================================================
// FILM SELECTOR
// ============================================================================
const FilmSelector = {
  element: null,

  init() {
    this.element = document.getElementById("filmSelect");
    this.populateFilms();
    this.element.addEventListener("change", (e) =>
      this.onFilmSelected(e.target.value),
    );
  },

  populateFilms() {
    const films = SessionManager.getAllFilms();
    this.element.innerHTML = "";

    films.forEach((film) => {
      const option = document.createElement("option");
      option.value = film.name;
      option.textContent = film.name;
      this.element.appendChild(option);
    });

    // Set to currently selected film
    this.element.value = SessionManager.getSelectedFilm();
  },

  render() {
    this.populateFilms();
  },

  onFilmSelected(filmName) {
    SessionManager.setSelectedFilm(filmName);
  },
};

// ============================================================================
// OPTIONS DIALOG
// ============================================================================
const OptionsDialog = {
  dialogElement: null,
  fieldSelectElement: null,
  optionsContainerElement: null,
  currentField: null,
  currentCamera: null,
  cameraSelectContainer: null,

  init() {
    this.dialogElement = document.getElementById("optionsDialog");
    this.fieldSelectElement = document.getElementById("fieldSelect");
    this.optionsContainerElement = document.getElementById("optionsContainer");

    // Populate field selector with select fields
    this.populateFieldSelector();

    // Listen for field selection changes
    this.fieldSelectElement.addEventListener("change", (e) =>
      this.onFieldSelected(e.target.value),
    );

    // Submit button
    this.dialogElement.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.save();
    });

    // Add button
    this.dialogElement.querySelector("#addOptionBtn").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.addOption();
    });

    // Cancel button
    this.dialogElement.querySelector(".cancel-btn").addEventListener("click", () => this.close());

    // Close dialog when clicking outside
    this.dialogElement.addEventListener("click", (e) => {
      if (e.target === this.dialogElement) {
        OptionsDialog.close();
      }
    });
  },

  populateFieldSelector() {
    const selectFields = OptionsManager.getSelectFields();
    this.fieldSelectElement.innerHTML = "";

    selectFields.forEach((field) => {
      const option = document.createElement("option");
      option.value = field.name;
      option.textContent = field.label;
      this.fieldSelectElement.appendChild(option);
    });

    // Select first field by default
    if (selectFields.length > 0) {
      this.fieldSelectElement.value = selectFields[0].name;
      this.onFieldSelected(selectFields[0].name);
    }
  },

  onFieldSelected(fieldName) {
    this.currentField = fieldName;
    const field = SCHEMA.fields.find((f) => f.name === fieldName);

    // If field is camera-specific, show camera selector
    if (field && field.camera_specific) {
      this.showCameraSelector();
      this.currentCamera = SessionManager.getSelectedCamera();
      const options = OptionsManager.getOptions(fieldName, this.currentCamera);
      this.renderOptionsInputs(options);
    } else {
      this.hideCameraSelector();
      const options = OptionsManager.getOptions(fieldName);
      this.renderOptionsInputs(options);
    }
  },

  showCameraSelector() {
    // Create camera selector if it doesn't exist
    if (!this.cameraSelectContainer) {
      this.cameraSelectContainer = document.createElement("div");
      this.cameraSelectContainer.style.marginBottom = "1rem";
      this.cameraSelectContainer.classList.add("option-camera-selector-bar");
      this.cameraSelectContainer.innerHTML = `
        <label for="cameraForOptionsSelect" title="Select camera">📷</label>
        <select id="cameraForOptionsSelect" /></select>`;
      this.optionsContainerElement.parentNode.insertBefore(
        this.cameraSelectContainer,
        this.optionsContainerElement,
      );

      // Populate and setup camera selector
      const cameraSelect = document.getElementById("cameraForOptionsSelect");
      SessionManager.getAllCameras().forEach((camera) => {
        const option = document.createElement("option");
        option.value = camera.name;
        option.textContent = camera.name;
        cameraSelect.appendChild(option);
      });
      cameraSelect.value = SessionManager.getSelectedCamera();

      // Listen for camera changes
      cameraSelect.addEventListener("change", (e) => {
        this.currentCamera = e.target.value;
        const options = OptionsManager.getOptions(
          this.currentField,
          this.currentCamera,
        );
        this.renderOptionsInputs(options);
      });
    }
  },

  hideCameraSelector() {
    if (this.cameraSelectContainer) {
      this.cameraSelectContainer.style.display = "none";
    }
  },

  renderOptionsInputs(options) {
    let html = "";

    options.forEach((option, index) => {
      const canMoveUp = index > 0;
      const canMoveDown = index < options.length - 1;

      html += `
                        <div class="option-input-group">
                            <input 
                                type="text" 
                                class="option-input" 
                                value="${escapeHtml(option)}"
                                data-index="${index}"
                            />
                            <button type="button" class="move-option-btn up" data-index="${index}" ${!canMoveUp ? 'disabled' : ''} title="Move up">▲</button>
                            <button type="button" class="move-option-btn down" data-index="${index}" ${!canMoveDown ? 'disabled' : ''} title="Move down">▼</button>
                            <button type="button" class="remove-option-btn danger" data-index="${index}" title="Remove">🗑️</button>
                        </div>
                    `;
    });

    this.optionsContainerElement.innerHTML = html;

    // Attach move up button listeners
    this.optionsContainerElement
      .querySelectorAll(".move-option-btn.up")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const index = parseInt(btn.dataset.index);
          this.moveOptionUp(index);
        });
      });

    // Attach move down button listeners
    this.optionsContainerElement
      .querySelectorAll(".move-option-btn.down")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const index = parseInt(btn.dataset.index);
          this.moveOptionDown(index);
        });
      });

    // Attach remove button listeners
    this.optionsContainerElement
      .querySelectorAll(".remove-option-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const index = parseInt(btn.dataset.index);
          this.removeOption(index);
        });
      });
  },

  removeOption(index) {
    const inputs =
      this.optionsContainerElement.querySelectorAll(".option-input");
    const newOptions = Array.from(inputs)
      .filter((_, i) => i !== index)
      .map((input) => input.value.trim())
      .filter((val) => val !== "");

    this.renderOptionsInputs(newOptions);
  },

  moveOptionUp(index) {
    if (index <= 0) return;
    
    const inputs =
      this.optionsContainerElement.querySelectorAll(".option-input");
    const currentOptions = Array.from(inputs)
      .map((input) => input.value.trim());
    
    // Swap elements
    [currentOptions[index - 1], currentOptions[index]] = [currentOptions[index], currentOptions[index - 1]];
    
    this.renderOptionsInputs(currentOptions);
  },

  moveOptionDown(index) {
    const inputs =
      this.optionsContainerElement.querySelectorAll(".option-input");
    const currentOptions = Array.from(inputs)
      .map((input) => input.value.trim());
    
    if (index >= currentOptions.length - 1) return;
    
    // Swap elements
    [currentOptions[index], currentOptions[index + 1]] = [currentOptions[index + 1], currentOptions[index]];
    
    this.renderOptionsInputs(currentOptions);
  },

  addOption() {
    const inputs =
      this.optionsContainerElement.querySelectorAll(".option-input");
    const currentOptions = Array.from(inputs)
      .map((input) => input.value.trim())
      .filter((val) => val !== "");

    // Add empty string for new option
    const newOptions = [...currentOptions, ""];
    this.renderOptionsInputs(newOptions);

    // Focus the newly added input
    setTimeout(() => {
      const newInput = this.optionsContainerElement.querySelector(
        ".option-input:last-child",
      );
      if (newInput) {
        newInput.focus();
      }
    }, 50);
  },

  collectOptions() {
    const inputs =
      this.optionsContainerElement.querySelectorAll(".option-input");
    const options = Array.from(inputs)
      .map((input) => input.value.trim())
      .filter((val) => val !== "");

    return options;
  },

  validateOptions(options) {
    const errors = [];

    if (options.length === 0) {
      errors.push("At least one option is required");
    }

    options.forEach((opt, index) => {
      if (typeof opt !== "string") {
        errors.push(`Option ${index + 1} must be text`);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  },

  save() {
    const options = this.collectOptions();
    const validation = this.validateOptions(options);

    if (!validation.valid) {
      alert("Validation errors:\n" + validation.errors.join("\n"));
      return false;
    }

    // Pass camera if field is camera-specific
    const field = SCHEMA.fields.find((f) => f.name === this.currentField);
    const camera = field && field.camera_specific ? this.currentCamera : null;

    const success = OptionsManager.setOptions(
      this.currentField,
      options,
      camera,
    );
    if (success) {
      this.close();
      TableRenderer.render();
      return true;
    } else {
      alert("Failed to save options");
      return false;
    }
  },


  open() {
    this.dialogElement.classList.add("active");
  },

  close() {
    this.dialogElement.classList.remove("active");
  },
};

// ============================================================================
// ROLL SELECTOR
// ============================================================================
const RollSelector = {
  selectElement: null,
  containerElement: null,

  init() {
    this.containerElement = document.getElementById("rollContainer");
    this.selectElement = document.getElementById("rollSelect");
    this.render();
    this.attachEventListeners();
  },

  attachEventListeners() {
    this.selectElement.addEventListener("change", (e) => {
      const value = e.target.value;
      
      if (value === "create-new") {
        CreateRollModal.open();
        // Reset select to current roll if one exists
        const currentRoll = RollManager.getCurrentRoll();
        if (currentRoll) {
          this.selectElement.value = currentRoll.id;
        }
      } else {
        // Switch to selected roll
        RollManager.setCurrentRoll(value);
        TableRenderer.render();
        CameraSelector.render();
        FilmSelector.render();
      }
    });
  },

  render() {
    const rolls = RollManager.getRolls();
    const currentRoll = RollManager.getCurrentRoll();

    let html = '<select id="rollSelect">';
    
    rolls.forEach((roll) => {
      const selected = currentRoll && roll.id === currentRoll.id ? "selected" : "";
      html += `<option value="${roll.id}" ${selected}>${escapeHtml(roll.name)}</option>`;
    });

    html += '<option value="create-new"';
    if (!currentRoll) html += ' selected';
    html += '>+ Create new roll</option>';
    html += '</select>';

    this.selectElement.innerHTML = '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const newSelect = temp.querySelector('select');
    this.selectElement.replaceWith(newSelect);
    this.selectElement = newSelect;
    this.attachEventListeners();

    // Auto-open create modal when no rolls exist
    if (!currentRoll) {
      CreateRollModal.open();
    }
  },
};

// ============================================================================
// CREATE ROLL MODAL
// ============================================================================
const CreateRollModal = {
  element: null,
  formElement: null,
  inputElement: null,

  init() {
    this.element = document.getElementById("createRollModal");
    this.formElement = document.getElementById("createRollForm");
    this.inputElement = document.getElementById("rollNameInput");

    if (this.formElement) {
      this.formElement.addEventListener("submit", (e) => this.submit(e));
    }

    const cancelBtn = this.element?.querySelector(".cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.close());
    }

    this.element?.addEventListener("click", (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });
  },

  open() {
    if (!this.element) return;
    this.element.classList.add("active");
    this.inputElement.value = "";
    this.inputElement.focus();
  },

  close() {
    if (!this.element) return;
    this.element.classList.remove("active");
  },

  submit(e) {
    e.preventDefault();
    
    const name = this.inputElement.value.trim();
    
    if (!name) {
      alert("Roll name cannot be empty");
      return;
    }

    // Create new roll and set as current
    const newRoll = RollManager.createRoll(name);
    RollManager.setCurrentRoll(newRoll.id);
    
    // Update UI
    RollSelector.render();
    TableRenderer.render();
    CameraSelector.render();
    FilmSelector.render();
    
    this.close();
  },
};

const RenameRollModal = {
  element: null,
  formElement: null,
  inputElement: null,

  init() {
    this.element = document.getElementById("renameRollModal");
    this.formElement = document.getElementById("renameRollForm");
    this.inputElement = document.getElementById("rollRenameInput");

    if (this.formElement) {
      this.formElement.addEventListener("submit", (e) => this.submit(e));
    }

    const cancelBtn = this.element?.querySelector(".cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.close());
    }

    this.element?.addEventListener("click", (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });
  },

  open() {
    if (!this.element) return;
    this.element.classList.add("active");
    this.inputElement.value = RollManager.getCurrentRoll().name;
    this.inputElement.focus();
  },

  close() {
    if (!this.element) return;
    this.element.classList.remove("active");
  },

  submit(e) {
    e.preventDefault();
    
    const name = this.inputElement.value.trim();
    
    if (!name) {
      alert("Roll name cannot be empty");
      return;
    }

    // Rename roll
    const newRoll = RollManager.renameRoll(RollManager.getCurrentRollId(), name);
    
    // Update UI
    RollSelector.render();
    
    this.close();
  },
};
