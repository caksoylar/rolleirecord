// ============================================================================
// OPTIONS DIALOG - Edit field options (shutter speeds, apertures, etc.)
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
    this.dialogElement
      .querySelector("#addOptionBtn")
      .addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.addOption();
      });

    // Cancel button
    this.dialogElement
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this.close());

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
    const field = FRAME_SCHEMA.fields.find((f) => f.name === fieldName);

    // If field is camera-specific, show camera selector
    if (field && field.entity_specific === "camera") {
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
    // Create camera selector container once
    if (!this.cameraSelectContainer) {
      this.cameraSelectContainer = document.createElement("div");
      this.cameraSelectContainer.style.marginBottom = "1rem";
      this.cameraSelectContainer.classList.add("option-camera-selector-bar");
      this.cameraSelectContainer.innerHTML = `
        <label for="cameraForOptionsSelect" title="Select camera"><svg class="icon"><use href="#icon-camera"></use></svg></label>
        <select id="cameraForOptionsSelect" /></select>`;
      this.optionsContainerElement.parentNode.insertBefore(
        this.cameraSelectContainer,
        this.optionsContainerElement,
      );

      // Listen for camera changes
      document
        .getElementById("cameraForOptionsSelect")
        .addEventListener("change", (e) => {
          this.currentCamera = e.target.value;
          const options = OptionsManager.getOptions(
            this.currentField,
            this.currentCamera,
          );
          this.renderOptionsInputs(options);
        });
    }

    // Repopulate camera list each time (picks up newly added cameras)
    const cameraSelect = document.getElementById("cameraForOptionsSelect");
    cameraSelect.innerHTML = "";
    SessionManager.getAllCameras().forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.name;
      option.textContent = camera.name;
      cameraSelect.appendChild(option);
    });
    cameraSelect.value = SessionManager.getSelectedCamera();
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
                            <button type="button" class="move-option-btn up" data-index="${index}" ${!canMoveUp ? "disabled" : ""} title="Move up"><svg class="icon"><use href="#icon-up"></use></svg></button>
                            <button type="button" class="move-option-btn down" data-index="${index}" ${!canMoveDown ? "disabled" : ""} title="Move down"><svg class="icon"><use href="#icon-down"></use></svg></button>
                            <button type="button" class="remove-option-btn danger" data-index="${index}" title="Remove"><svg class="icon"><use href="#icon-delete"></use></svg></button>
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
    const currentOptions = this.collectOptions();
    const newOptions = currentOptions.filter((_, i) => i !== index);
    this.renderOptionsInputs(newOptions);
  },

  moveOptionUp(index) {
    if (index <= 0) return;
    const currentOptions = this.collectOptions();
    [currentOptions[index - 1], currentOptions[index]] = [
      currentOptions[index],
      currentOptions[index - 1],
    ];
    this.renderOptionsInputs(currentOptions);
  },

  moveOptionDown(index) {
    const currentOptions = this.collectOptions();
    if (index >= currentOptions.length - 1) return;
    [currentOptions[index], currentOptions[index + 1]] = [
      currentOptions[index + 1],
      currentOptions[index],
    ];
    this.renderOptionsInputs(currentOptions);
  },

  addOption() {
    const currentOptions = this.collectOptions();
    this.renderOptionsInputs([...currentOptions, ""]);

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
    return Array.from(inputs)
      .map((input) => input.value.trim())
      .filter((val) => val !== "");
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
    const field = FRAME_SCHEMA.fields.find((f) => f.name === this.currentField);
    const camera =
      field && field.entity_specific === "camera" ? this.currentCamera : null;

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
