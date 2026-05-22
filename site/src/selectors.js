// ============================================================================
// SELECTORS - Camera, Film, and Roll selectors + entity modals
// ============================================================================

// Helper: cascade a field rename to all rolls referencing the old value
function cascadeRenameOnRolls(field, oldName, newName) {
  const rolls = RollManager.getRolls();
  rolls.forEach((roll) => {
    if (roll[field] === oldName) {
      roll[field] = newName;
      RollManager.updateRoll(roll.id, roll);
    }
  });
}

// Helper: reassign rolls referencing a deleted entity to the first remaining one
function reassignRollsOnDelete(field, manager, entity) {
  const remaining = manager.getAll().filter((e) => e.id !== entity.id);
  const fallback = remaining[0]?.name || "";
  const rolls = RollManager.getRolls();
  rolls.forEach((roll) => {
    if (roll[field] === entity.name) {
      roll[field] = fallback;
      RollManager.updateRoll(roll.id, roll);
    }
  });
}

// ============================================================================
// CAMERA SELECTOR - Modal for creating/editing cameras
// ============================================================================

const CameraSelector = {
  _modal: null,

  init() {
    this._modal = new EntityFormModal({
      entityType: "Camera",
      schema: CAMERA_SCHEMA,
      manager: CameraManager,
      onSave: (item, mode, oldName) => {
        if (mode === "update" && oldName && oldName !== item.name) {
          cascadeRenameOnRolls("camera", oldName, item.name);
          // Update OptionsManager storage keys
          OptionsManager.renameCameraKeys(oldName, item.name);
        }
        if (mode === "create") {
          // Set new camera as selected for current roll
          SessionManager.setSelectedCamera(item.name);
        }
      },
      onDelete: (entity) => {
        if (
          !confirm(
            `Are you sure you want to delete "${entity.name}"? This cannot be undone.`,
          )
        )
          return false;

        reassignRollsOnDelete("camera", CameraManager, entity);
        return true;
      },
      onAfterAction: () => refreshAllUI(),
    });
  },
};

// ============================================================================
// FILM SELECTOR - Modal for creating/editing films
// ============================================================================

const FilmSelector = {
  _modal: null,

  init() {
    this._modal = new EntityFormModal({
      entityType: "Film",
      schema: FILM_SCHEMA,
      manager: FilmManager,
      onSave: (item, mode, oldName) => {
        if (mode === "update" && oldName && oldName !== item.name) {
          cascadeRenameOnRolls("film", oldName, item.name);
        }
        if (mode === "create") {
          SessionManager.setSelectedFilm(item.name);
        }
      },
      onDelete: (entity) => {
        if (
          !confirm(
            `Are you sure you want to delete "${entity.name}"? This cannot be undone.`,
          )
        )
          return false;

        reassignRollsOnDelete("film", FilmManager, entity);
        return true;
      },
      onAfterAction: () => refreshAllUI(),
    });
  },
};

// ============================================================================
// ROLL FORM MODAL - Dedicated create/edit dialog for rolls
// ============================================================================

class RollFormModal {
  constructor({ onAfterAction } = {}) {
    this.onAfterAction = onAfterAction || (() => {});
    this._mandatory = false;
    this._editingId = null;
    this._mode = null;
    this.element = this._createDOM();
    document.body.appendChild(this.element);
    this._attachEvents();
  }

  _createDOM() {
    const statusOptions = ROLL_STATUSES.map(
      (s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`,
    ).join("");
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "RollModal";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title"></h2>
        </div>
        <form class="entity-form" autocomplete="off">
          <div class="modal-body">
            <div class="form-group">
              <label for="Roll-label">Roll Name</label>
              <input type="text" id="Roll-label" name="label" required />
            </div>
            <div class="form-group">
              <label for="Roll-camera">Camera</label>
              <div class="entity-select-wrap">
                <select id="Roll-camera" name="camera" required></select>
                <button type="button" class="secondary" id="roll-camera-edit-btn" title="Edit camera">
                  <svg class="icon"><use href="icons.svg#icon-edit"></use></svg>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="Roll-film">Film</label>
              <div class="entity-select-wrap">
                <select id="Roll-film" name="film" required></select>
                <button type="button" class="secondary" id="roll-film-edit-btn" title="Edit film">
                  <svg class="icon"><use href="icons.svg#icon-edit"></use></svg>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="Roll-frameCount">Frame Count</label>
              <input type="number" id="Roll-frameCount" name="frameCount" />
            </div>
            <div class="form-group">
              <label for="Roll-status">Status</label>
              <select id="Roll-status" name="status">${statusOptions}</select>
            </div>
            <div class="form-group">
              <label for="Roll-notes">Notes</label>
              <textarea id="Roll-notes" name="notes" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="save-btn"></button>
            <button type="button" class="secondary cancel-btn">Cancel</button>
            <button type="button" class="secondary import-btn" style="display:none">Import</button>
            <button type="button" class="danger delete-btn" style="display:none">Delete</button>
          </div>
        </form>
      </div>`;
    return modal;
  }

  _attachEvents() {
    this.element
      .querySelector(".entity-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this._handleSubmit();
      });

    this.element
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this.close());

    this.element.addEventListener("click", (e) => {
      if (e.target === this.element && !this._mandatory) this.close();
    });

    this.element
      .querySelector(".delete-btn")
      .addEventListener("click", () => this._handleDelete());

    this.element.querySelector(".import-btn").addEventListener("click", () => {
      this._mandatory = false;
      this.close();
      Export.importRoll();
    });

    const cameraSelect = this.element.querySelector("#Roll-camera");
    cameraSelect.addEventListener("change", () => {
      if (cameraSelect.value === CREATE_NEW_SENTINEL) {
        cameraSelect.value = cameraSelect.options[0]?.value ?? "";
        this._openSubModal(CameraSelector._modal, "create", {
          afterSave: () => this._populateCameraSelect(),
        });
      }
    });

    const filmSelect = this.element.querySelector("#Roll-film");
    filmSelect.addEventListener("change", () => {
      if (filmSelect.value === CREATE_NEW_SENTINEL) {
        filmSelect.value = filmSelect.options[0]?.value ?? "";
        this._openSubModal(FilmSelector._modal, "create", {
          afterSave: () => this._populateFilmSelect(),
        });
      }
    });

    this.element
      .querySelector("#roll-camera-edit-btn")
      .addEventListener("click", () => {
        const camera = CameraManager.getByName(cameraSelect.value);
        if (camera) {
          this._openSubModal(CameraSelector._modal, "edit", {
            id: camera.id,
            afterSave: () => this._populateCameraSelect(),
          });
        }
      });

    this.element
      .querySelector("#roll-film-edit-btn")
      .addEventListener("click", () => {
        const film = FilmManager.getByName(filmSelect.value);
        if (film) {
          this._openSubModal(FilmSelector._modal, "edit", {
            id: film.id,
            afterSave: () => this._populateFilmSelect(),
          });
        }
      });
  }

  _openSubModal(modal, mode, { id, afterSave } = {}) {
    this.element.classList.remove("active");
    const onClose = () => this.element.classList.add("active");
    if (mode === "create") {
      modal.openCreate({ afterSave, onClose });
    } else {
      modal.openEdit(id, { afterSave, onClose });
    }
  }

  _populateCameraSelect(currentValue) {
    const select = this.element.querySelector("#Roll-camera");
    const current = currentValue ?? select.value;
    const cameras = CameraManager.getAll();
    let html = cameras
      .map(
        (c) =>
          `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`,
      )
      .join("");
    html += `<option value="${CREATE_NEW_SENTINEL}">+ Add new camera</option>`;
    select.innerHTML = html;
    if (current && cameras.some((c) => c.name === current))
      select.value = current;
  }

  _populateFilmSelect(currentValue) {
    const select = this.element.querySelector("#Roll-film");
    const current = currentValue ?? select.value;
    const films = FilmManager.getAll();
    let html = films
      .map(
        (f) =>
          `<option value="${escapeHtml(f.name)}">${escapeHtml(f.name)}</option>`,
      )
      .join("");
    html += `<option value="${CREATE_NEW_SENTINEL}">+ Add new film</option>`;
    select.innerHTML = html;
    if (current && films.some((f) => f.name === current))
      select.value = current;
  }

  _collectFormData() {
    const q = (id) => this.element.querySelector(`#${id}`);
    const frameCountVal = q("Roll-frameCount").value;
    return {
      name: q("Roll-label").value.trim(),
      camera: q("Roll-camera").value,
      film: q("Roll-film").value,
      frameCount: frameCountVal === "" ? null : Number(frameCountVal),
      status: q("Roll-status").value,
      notes: q("Roll-notes").value.trim(),
    };
  }

  _populateForm(roll) {
    this._populateCameraSelect(roll.camera ?? "");
    this._populateFilmSelect(roll.film ?? "");
    this.element.querySelector("#Roll-label").value = roll.name ?? "";
    this.element.querySelector("#Roll-frameCount").value =
      roll.frameCount ?? "";
    this.element.querySelector("#Roll-status").value =
      roll.status ?? ROLL_STATUSES[0];
    this.element.querySelector("#Roll-notes").value = roll.notes ?? "";
  }

  _clearForm() {
    const defaultCamera =
      SessionManager.getSelectedCamera() ||
      CameraManager.getAll()[0]?.name ||
      "";
    const defaultFilm =
      SessionManager.getSelectedFilm() || FilmManager.getAll()[0]?.name || "";
    this._populateCameraSelect(defaultCamera);
    this._populateFilmSelect(defaultFilm);
    this.element.querySelector("#Roll-label").value = "";
    this.element.querySelector("#Roll-frameCount").value = DEFAULT_FRAME_COUNT;
    this.element.querySelector("#Roll-status").value = ROLL_STATUSES[0];
    this.element.querySelector("#Roll-notes").value = "";
  }

  _handleSubmit() {
    const data = this._collectFormData();
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

    if (this._mode === "create") {
      const created = RollManager.createRoll(data);
      RollManager.setCurrentRoll(created.id);
    } else {
      const existing = RollManager.getRollById(this._editingId);
      if (
        existing &&
        existing.camera !== data.camera &&
        existing.frames?.length > 0
      ) {
        if (
          !confirm(
            `This roll already has ${existing.frames.length} frame(s) logged with "${existing.camera}". ` +
              `Changing the camera may affect hidden fields and per-camera options. Continue?`,
          )
        )
          return;
      }
      RollManager.updateRoll(this._editingId, data);
    }

    this.close();
    this.onAfterAction();
  }

  _handleDelete() {
    if (!this._editingId) return;
    const roll = RollManager.getRollById(this._editingId);
    if (!roll) return;
    if (
      !confirm(
        `Are you sure you want to delete the roll "${roll.name}"? This cannot be undone.`,
      )
    )
      return;
    RollManager.deleteRoll(this._editingId);
    this.close();
    this.onAfterAction();
  }

  openCreate({ mandatory } = {}) {
    this._mode = "create";
    this._editingId = null;
    this._mandatory = mandatory || false;
    this._clearForm();

    this.element.querySelector(".modal-title").textContent = "New Roll";
    this.element.querySelector(".save-btn").textContent = "Create";
    this.element.querySelector(".delete-btn").style.display = "none";
    this.element.querySelector(".cancel-btn").style.display = this._mandatory
      ? "none"
      : "";
    this.element.querySelector(".import-btn").style.display = this._mandatory
      ? ""
      : "none";

    this.element.classList.add("active");
    this.element.querySelector("#Roll-label").focus();
  }

  openEdit(rollId) {
    const roll = RollManager.getRollById(rollId);
    if (!roll) return;

    this._mode = "edit";
    this._editingId = rollId;
    this._mandatory = false;
    this._populateForm(roll);

    this.element.querySelector(".modal-title").textContent = "Edit Roll";
    this.element.querySelector(".save-btn").textContent = "Save";
    this.element.querySelector(".delete-btn").style.display = "";
    this.element.querySelector(".cancel-btn").style.display = "";
    this.element.querySelector(".import-btn").style.display = "none";

    this.element.classList.add("active");
    this.element.querySelector("#Roll-label").focus();
  }

  close() {
    this.element.classList.remove("active");
  }
}

// ============================================================================
// ROLL SELECTOR - Uses EntitySelector + RollFormModal
// ============================================================================

// eslint-disable-next-line no-unused-vars
const RollSelector = {
  _modal: null,
  _selector: null,
  _caption: null,

  init() {
    this._modal = new RollFormModal({
      onAfterAction: () => refreshAllUI(),
    });

    const rollAdapter = {
      getAll: () => RollManager.getRolls(),
      getById: (id) => RollManager.getRollById(id),
      getByName: (name) =>
        RollManager.getRolls().find((r) => r.name === name) || null,
    };

    this._selector = new EntitySelector({
      containerSelector: "#rollContainer",
      selectId: "rollSelect",
      manager: rollAdapter,
      modal: this._modal,
      iconHref: "#icon-roll",
      label: "Select roll",
      addNewLabel: "+ Create new roll",
      onSelect: (rollId) => {
        RollManager.setCurrentRoll(rollId);
        refreshAllUI();
      },
      getSelectedValue: () => RollManager.getCurrentRoll()?.name ?? "",
      formatLabel: (roll) => {
        const maxId = RollManager.getMaxFrameId(roll);
        const progress = maxId ?? 0;
        const progressStr = roll.frameCount
          ? `(${progress}/${roll.frameCount})`
          : "";
        const statusStr =
          roll.status && roll.status !== "Loaded" ? ` (${roll.status})` : "";
        return `${roll.name}${progressStr ? ` ${progressStr}` : ""}${statusStr}`;
      },
    });

    // Append caption element to roll card (after EntitySelector built the DOM)
    this._caption = document.createElement("div");
    this._caption.className = "roll-caption";
    this._selector.container.appendChild(this._caption);
    this._renderCaption();

    // Auto-open create modal when no rolls exist
    if (!RollManager.getCurrentRoll()) {
      this._modal.openCreate({ mandatory: true });
    }
  },

  render() {
    if (this._selector) this._selector.render();
    this._renderCaption();
    // Auto-open create modal when no rolls exist
    if (!RollManager.getCurrentRoll() && this._modal) {
      this._modal.openCreate({ mandatory: true });
    }
  },

  _renderCaption() {
    if (!this._caption) return;
    const roll = RollManager.getCurrentRoll();
    if (!roll) {
      this._caption.innerHTML = "";
      return;
    }
    const camera = roll.camera || "—";
    const film = roll.film || "—";
    this._caption.innerHTML = `
      <span class="chip">
        <svg class="icon"><use href="icons.svg#icon-camera"></use></svg>
        ${escapeHtml(camera)}
      </span>
      <span class="chip">
        <svg class="icon"><use href="icons.svg#icon-film"></use></svg>
        ${escapeHtml(film)}
      </span>`;
  },
};
