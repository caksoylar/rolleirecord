// ============================================================================
// SELECTORS - Roll selector + roll create/edit modal
// ============================================================================

// Sentinel value used by the roll dropdown's "+ Create new roll" entry
const CREATE_NEW_ROLL = "__create_new_roll__";

// ============================================================================
// ROLL SELECTOR - Header dropdown + caption for the active roll
// ============================================================================

const RollSelector = {
  _container: null,
  _select: null,
  _caption: null,

  init() {
    this._container = document.querySelector("#rollContainer");
    this._container.innerHTML = `
      <label title="Select roll">
        <svg class="icon"><use href="icons.svg#icon-roll"></use></svg>
      </label>
      <select id="rollSelect"></select>`;

    this._select = this._container.querySelector("#rollSelect");

    this._select.addEventListener("change", (e) => {
      const value = e.target.value;
      if (value === CREATE_NEW_ROLL) {
        this._restoreSelection();
        NewRollModal.open();
      } else {
        RollManager.setCurrentRoll(value);
        refreshAllUI();
      }
    });

    this._caption = document.createElement("div");
    this._caption.className = "roll-caption";
    this._container.appendChild(this._caption);

    this.render();

    if (!RollManager.getCurrentRoll()) {
      NewRollModal.open({ mandatory: true });
    }
  },

  render() {
    if (!this._select) return;
    const rolls = RollManager.getRolls();
    const currentRoll = RollManager.getCurrentRoll();

    let html = rolls
      .map((roll) => {
        const selected =
          currentRoll && roll.id === currentRoll.id ? "selected" : "";
        return `<option value="${roll.id}" ${selected}>${escapeHtml(this._formatRollLabel(roll))}</option>`;
      })
      .join("");
    html += `<option value="${CREATE_NEW_ROLL}">+ Create new roll</option>`;
    this._select.innerHTML = html;

    this._renderCaption();

    if (!RollManager.getCurrentRoll()) {
      NewRollModal.open({ mandatory: true });
    }
  },

  _formatRollLabel(roll) {
    const statusStr =
      roll.status && roll.status !== "Loaded" ? ` (${roll.status})` : "";
    return `${roll.name}${statusStr}`;
  },

  _restoreSelection() {
    const currentRoll = RollManager.getCurrentRoll();
    if (currentRoll) this._select.value = currentRoll.id;
  },

  _renderCaption() {
    if (!this._caption) return;
    const roll = RollManager.getCurrentRoll();
    if (!roll) {
      this._caption.innerHTML = "";
      return;
    }
    const group = (icon, text) =>
      `<span class="roll-caption-group"><svg class="icon"><use href="icons.svg#icon-${icon}"></use></svg>${escapeHtml(text)}</span>`;

    const groups = [];
    if (roll.frameCount) {
      const maxId = RollManager.getMaxFrameId(roll);
      groups.push(group("hash", `${maxId ?? 0} / ${roll.frameCount}`));
    }
    groups.push(group("camera", roll.camera || "—"));
    groups.push(group("film", roll.film || "—"));

    this._caption.innerHTML = groups.join("<span>·</span>");
  },
};

// Re-render every roll-dependent UI surface (selector + table). Lives here
// because it orchestrates RollSelector and TableRenderer, both defined by now.
function refreshAllUI() {
  RollSelector.render();
  TableRenderer.render();
}

// ============================================================================
// ROLL ACTIONS MODAL - Bottom-sheet with roll properties, map, export, delete
// ============================================================================

const RollActionsModal = {
  _modalEl: null,
  _propertiesListEl: null,

  init() {
    this._modalEl = document.getElementById("rollActionsModal");
    this._propertiesListEl = document.getElementById("rollPropertiesList");

    document
      .getElementById("rollActionsCloseBtn")
      .addEventListener("click", () => this.close());

    this._modalEl.addEventListener("click", (e) => {
      if (e.target === this._modalEl) this.close();
    });

    this._propertiesListEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-field]");
      if (!btn) return;
      const roll = RollManager.getCurrentRoll();
      if (!roll) return;
      RollPropertyEditModal.open(
        btn.dataset.field,
        { ...roll },
        (field, value) => {
          const current = RollManager.getCurrentRoll();
          if (
            field.name === "camera" &&
            value !== current.camera &&
            current.frames?.length > 0
          ) {
            if (
              !confirm(
                `This roll already has ${current.frames.length} frame(s) logged with "${current.camera}". ` +
                  `Changing the camera may affect hidden fields and per-camera options. Continue?`,
              )
            )
              return false;
          }
          RollManager.updateRoll(current.id, { [field.name]: value });
          RollActionsModal.renderProperties();
          refreshAllUI();
        },
      );
    });

    document
      .getElementById("rollActionsInterpolateBtn")
      .addEventListener("click", () => {
        const roll = RollManager.getCurrentRoll();
        if (!roll) return;

        const newFrames = FrameInterpolator.interpolateFramesInRoll(
          roll.frames,
        );
        if (newFrames.length === 0) {
          alert("No gaps found between logged frames.");
          return;
        }

        if (
          !confirm(
            `Fill in ${newFrames.length} missing frame(s) using the nearest logged frame's data?`,
          )
        )
          return;

        newFrames.forEach((frame) => RollManager.addFrame(frame));
        refreshAllUI();
        this.close();
      });

    document
      .getElementById("rollActionsMapBtn")
      .addEventListener("click", () => {
        const roll = RollManager.getCurrentRoll();
        const url = LocationManager.buildUmapUrl(roll?.frames);
        if (!url) {
          alert("No frames with coordinates to map.");
          return;
        }
        window.open(url, "_blank", "noopener");
      });

    document
      .getElementById("rollActionsExportJsonBtn")
      .addEventListener("click", () => Export.exportRoll());

    document
      .getElementById("rollActionsExportCsvBtn")
      .addEventListener("click", () => Export.exportToExiftoolCSV());

    document
      .getElementById("rollActionsDeleteBtn")
      .addEventListener("click", () => this._handleDelete());
  },

  open() {
    this.renderProperties();
    this._modalEl.classList.add("active");
  },

  close() {
    this._modalEl.classList.remove("active");
  },

  renderProperties() {
    const roll = RollManager.getCurrentRoll();
    if (!roll) return;
    this._propertiesListEl.innerHTML = ROLL_FIELDS.map((field) => {
      const value = roll[field.name];
      // eslint-disable-next-line eqeqeq
      const display = value === "" || value == null ? "—" : String(value);
      return `
        <button type="button" class="settings-row" data-field="${field.name}">
          <span class="row-label">
            <span class="row-title">${escapeHtml(field.label)}</span>
            <span class="row-sub">${escapeHtml(display)}</span>
          </span>
          <span class="row-chevron"><svg class="icon"><use href="icons.svg#icon-chevron"></use></svg></span>
        </button>`;
    }).join("");
  },

  _handleDelete() {
    const roll = RollManager.getCurrentRoll();
    if (!roll) return;
    if (
      !confirm(
        `Are you sure you want to delete the roll "${roll.name}"? This cannot be undone.`,
      )
    )
      return;
    RollManager.deleteRoll(roll.id);
    this.close();
    refreshAllUI();
  },
};

// ============================================================================
// NEW ROLL MODAL - Bottom-sheet for creating a roll, reuses RollPropertyEditModal
// ============================================================================

const NewRollModal = {
  _modalEl: null,
  _propertiesListEl: null,
  _cancelBtn: null,
  _mandatory: false,
  _stagingData: null,

  init() {
    this._modalEl = document.getElementById("newRollModal");
    this._propertiesListEl = document.getElementById("newRollPropertiesList");
    this._cancelBtn = document.getElementById("newRollCancelBtn");

    this._propertiesListEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-field]");
      if (!btn) return;
      RollPropertyEditModal.open(
        btn.dataset.field,
        { ...this._stagingData },
        (field, value) => {
          this._stagingData[field.name] = value;
          this.renderProperties();
        },
      );
    });

    document
      .getElementById("newRollCreateBtn")
      .addEventListener("click", () => this._handleCreate());

    this._cancelBtn.addEventListener("click", () => this.close());

    document
      .getElementById("newRollImportBtn")
      .addEventListener("click", () => {
        this._mandatory = false;
        this.close();
        Export.importRoll();
      });

    this._modalEl.addEventListener("click", (e) => {
      if (e.target === this._modalEl && !this._mandatory) this.close();
    });
  },

  open({ mandatory } = {}) {
    this._mandatory = mandatory || false;
    this._stagingData = {
      name: "",
      camera: RollManager.getCurrentCamera(),
      film: RollManager.getCurrentFilm(),
      frameCount: DEFAULT_FRAME_COUNT,
      status: ROLL_STATUSES[0],
      notes: "",
    };
    this._cancelBtn.style.display = this._mandatory ? "none" : "";
    this.renderProperties();
    this._modalEl.classList.add("active");
  },

  close() {
    this._modalEl.classList.remove("active");
  },

  renderProperties() {
    this._propertiesListEl.innerHTML = ROLL_FIELDS.map((field) => {
      const value = this._stagingData[field.name];
      // eslint-disable-next-line eqeqeq
      const display = value === "" || value == null ? "—" : String(value);
      return `
        <button type="button" class="settings-row" data-field="${field.name}">
          <span class="row-label">
            <span class="row-title">${escapeHtml(field.label)}</span>
            <span class="row-sub">${escapeHtml(display)}</span>
          </span>
          <span class="row-chevron"><svg class="icon"><use href="icons.svg#icon-chevron"></use></svg></span>
        </button>`;
    }).join("");
  },

  _handleCreate() {
    const data = this._stagingData;
    if (!data.name) {
      alert("Roll Name is required");
      return;
    }
    if (!data.camera) {
      alert("Camera is required");
      return;
    }
    if (!data.film) {
      alert("Film is required");
      return;
    }
    const created = RollManager.createRoll(data);
    RollManager.setCurrentRoll(created.id);
    this.close();
    refreshAllUI();
  },
};

// ============================================================================
// ROLL PROPERTY EDIT MODAL - Single-field editor (nested on roll actions modal)
// ============================================================================

const RollPropertyEditModal = {
  _modalEl: null,
  _formEl: null,
  _bodyEl: null,
  _titleEl: null,
  _currentField: null,
  _onSaved: null,

  init() {
    this._modalEl = document.getElementById("rollPropertyEditModal");
    this._formEl = document.getElementById("rollPropertyEditForm");
    this._bodyEl = document.getElementById("rollPropertyEditBody");
    this._titleEl = document.getElementById("rollPropertyEditTitle");

    this._formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      this._save();
    });

    this._modalEl
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this.close());

    this._modalEl.addEventListener("click", (e) => {
      if (e.target === this._modalEl) this.close();
    });
  },

  // data: plain object with current field values
  // onSaved(field, value): called on valid submit; return false to cancel close
  open(fieldName, data, onSaved) {
    const field = ROLL_FIELDS.find((f) => f.name === fieldName);
    if (!field) return;

    this._currentField = field;
    this._onSaved = onSaved;
    this._titleEl.textContent = `Edit ${field.label}`;
    this._bodyEl.innerHTML = this._renderInput(field, data);
    document
      .querySelectorAll(".modal.active .modal-content")
      .forEach((el) => el.classList.add("dimmed"));
    this._modalEl.classList.add("active");
    const input = this._bodyEl.querySelector("input, select, textarea");
    if (input) input.focus();
  },

  _getOptions(field) {
    if (field.optionsFrom === "cameras")
      return CameraManager.getAll().map((c) => c.name);
    if (field.optionsFrom === "films")
      return FilmManager.getAll().map((f) => f.name);
    return field.options || [];
  },

  _renderInput(field, data) {
    const id = "roll-property-edit-input";
    // eslint-disable-next-line eqeqeq
    const val = data[field.name] == null ? "" : data[field.name];
    const required = field.required ? "required" : "";
    if (field.type === "select") {
      const options = this._getOptions(field)
        .map(
          (o) =>
            `<option value="${escapeHtml(o)}" ${o === val ? "selected" : ""}>${escapeHtml(o)}</option>`,
        )
        .join("");
      return `
        <div class="form-group">
          <label for="${id}">${escapeHtml(field.label)}</label>
          <select id="${id}" ${required}>${options}</select>
        </div>`;
    }
    if (field.type === "textarea") {
      return `
        <div class="form-group">
          <label for="${id}">${escapeHtml(field.label)}</label>
          <textarea id="${id}" rows="4">${escapeHtml(String(val))}</textarea>
        </div>`;
    }
    const inputType = field.type === "number" ? "number" : "text";
    return `
      <div class="form-group">
        <label for="${id}">${escapeHtml(field.label)}</label>
        <input type="${inputType}" id="${id}" value="${escapeHtml(String(val))}" ${required} />
      </div>`;
  },

  _save() {
    if (!this._currentField || !this._onSaved) return;
    const field = this._currentField;
    const input = this._bodyEl.querySelector("#roll-property-edit-input");
    let value;
    if (field.type === "number") {
      value = input.value === "" ? null : Number(input.value);
    } else {
      value = input.value.trim();
    }
    // eslint-disable-next-line eqeqeq
    if (field.required && (value === "" || value == null)) {
      alert(`${field.label} is required`);
      return;
    }
    const result = this._onSaved(field, value);
    if (result !== false) this.close();
  },

  close() {
    this._modalEl.classList.remove("active");
    document
      .querySelectorAll(".modal-content.dimmed")
      .forEach((el) => el.classList.remove("dimmed"));
    this._currentField = null;
    this._onSaved = null;
  },
};
