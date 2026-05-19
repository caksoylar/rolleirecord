// ============================================================================
// FIELD OPTIONS DIALOG - Edit field options (shutter speeds, apertures, etc.)
// ============================================================================

// eslint-disable-next-line no-unused-vars
const FieldOptionsDialog = {
  dialogElement: null,
  fieldSelectElement: null,
  optionsContainerElement: null,
  currentField: null,
  entityType: null,
  entityName: null,

  init() {
    this.dialogElement = document.getElementById("optionsDialog");
    this.fieldSelectElement = document.getElementById("fieldSelect");
    this.optionsContainerElement = document.getElementById("optionsContainer");

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
        this.close();
      }
    });
  },

  populateFieldSelector() {
    const selectFields = FRAME_SCHEMA.fields.filter(
      (f) => f.type === "select" && f.entity_specific === this.entityType,
    );
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
    const options = OptionsManager.getOptions(fieldName, this.entityName);
    this.renderOptionsInputs(options);
    this.renderVisibilityToggle(fieldName);
  },

  renderVisibilityToggle(fieldName) {
    const container = document.getElementById("visibilityToggle");
    if (!container) return;

    const field = FRAME_SCHEMA.fields.find((f) => f.name === fieldName);
    if (!field || !field.hideable) {
      container.style.display = "none";
      this._setOptionsEnabled(true);
      return;
    }

    container.style.display = "";
    const isHidden = CameraManager.isFieldHidden(fieldName, this.entityName);
    container.innerHTML = `
      <label class="toggle-row">
        <input type="checkbox" id="fieldVisibleToggle" ${isHidden ? "" : "checked"} />
        <span>Enabled</span>
      </label>
    `;

    this._setOptionsEnabled(!isHidden);

    container
      .querySelector("#fieldVisibleToggle")
      .addEventListener("change", (e) => {
        CameraManager.toggleHiddenField(fieldName, this.entityName);
        this._setOptionsEnabled(e.target.checked);
        TableRenderer.render();
      });
  },

  _setOptionsEnabled(enabled) {
    const optionsList = this.dialogElement.querySelector(".options-list");
    if (!optionsList) return;
    optionsList.style.opacity = enabled ? "" : "0.4";
    optionsList.style.pointerEvents = enabled ? "" : "none";
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
                            <button type="button" class="move-option-btn secondary up" data-index="${index}" ${!canMoveUp ? "disabled" : ""} title="Move up"><svg class="icon"><use href="icons.svg#icon-up"></use></svg></button>
                            <button type="button" class="move-option-btn secondary down" data-index="${index}" ${!canMoveDown ? "disabled" : ""} title="Move down"><svg class="icon"><use href="icons.svg#icon-down"></use></svg></button>
                            <button type="button" class="remove-option-btn danger" data-index="${index}" title="Remove"><svg class="icon"><use href="icons.svg#icon-delete"></use></svg></button>
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
    const inputs =
      this.optionsContainerElement.querySelectorAll(".option-input");
    inputs[inputs.length - 1]?.focus();
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

    // Pass entity name for entity-specific fields
    const success = OptionsManager.setOptions(
      this.currentField,
      options,
      this.entityName,
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

  open({ entityType, entityName }) {
    this.entityType = entityType;
    this.entityName = entityName;
    this.populateFieldSelector();
    this.dialogElement.classList.add("active");
  },

  close() {
    this.dialogElement.classList.remove("active");
  },
};
