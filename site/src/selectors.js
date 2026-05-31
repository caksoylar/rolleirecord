// ============================================================================
// SELECTORS - Roll selector + roll create/edit modal
// ============================================================================

// Sentinel value used by the roll dropdown's "+ Create new roll" entry
const CREATE_NEW_ROLL = "__create_new_roll__";

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
              <select id="Roll-camera" name="camera" required></select>
            </div>
            <div class="form-group">
              <label for="Roll-film">Film</label>
              <select id="Roll-film" name="film" required></select>
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
            <button type="button" class="secondary import-btn" style="display:none">Import from file…</button>
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
  }

  _populateCameraSelect(currentValue) {
    const select = this.element.querySelector("#Roll-camera");
    const current = currentValue ?? select.value;
    const cameras = CameraManager.getAll();
    select.innerHTML = cameras
      .map(
        (c) =>
          `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`,
      )
      .join("");
    if (current && cameras.some((c) => c.name === current))
      select.value = current;
  }

  _populateFilmSelect(currentValue) {
    const select = this.element.querySelector("#Roll-film");
    const current = currentValue ?? select.value;
    const films = FilmManager.getAll();
    select.innerHTML = films
      .map(
        (f) =>
          `<option value="${escapeHtml(f.name)}">${escapeHtml(f.name)}</option>`,
      )
      .join("");
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
    const defaultCamera = RollManager.getCurrentCamera();
    const defaultFilm = RollManager.getCurrentFilm();
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
    this.element.querySelector(".import-btn").style.display = "";

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
// ROLL SELECTOR - Header dropdown + caption for the active roll
// ============================================================================

const RollSelector = {
  _modal: null,
  _container: null,
  _select: null,
  _editBtn: null,
  _caption: null,

  init() {
    this._modal = new RollFormModal({
      onAfterAction: () => refreshAllUI(),
    });

    this._container = document.querySelector("#rollContainer");
    this._container.innerHTML = `
      <label title="Select roll">
        <svg class="icon"><use href="icons.svg#icon-roll"></use></svg>
      </label>
      <select id="rollSelect"></select>
      <button type="button" class="secondary entity-edit-btn" title="Edit">
        <svg class="icon"><use href="icons.svg#icon-edit"></use></svg>
      </button>`;

    this._select = this._container.querySelector("#rollSelect");
    this._editBtn = this._container.querySelector(".entity-edit-btn");

    this._select.addEventListener("change", (e) => {
      const value = e.target.value;
      if (value === CREATE_NEW_ROLL) {
        this._restoreSelection();
        this._modal.openCreate();
      } else {
        RollManager.setCurrentRoll(value);
        refreshAllUI();
      }
    });

    this._editBtn.addEventListener("click", () => {
      const selectedId = this._select.value;
      if (selectedId && selectedId !== CREATE_NEW_ROLL) {
        this._modal.openEdit(selectedId);
      }
    });

    this._caption = document.createElement("div");
    this._caption.className = "roll-caption";
    this._container.appendChild(this._caption);

    this.render();

    if (!RollManager.getCurrentRoll()) {
      this._modal.openCreate({ mandatory: true });
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

    if (!RollManager.getCurrentRoll() && this._modal) {
      this._modal.openCreate({ mandatory: true });
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
    const maxId = RollManager.getMaxFrameId(roll);
    const progressStr = `${maxId ?? 0} / ${roll.frameCount}`;
    if (roll.frameCount) {
      this._caption.innerHTML = `
      <span class="chip">
        <svg class="icon"><use href="icons.svg#icon-hash"></use></svg>
        ${escapeHtml(progressStr)}
      </span>`;
    }
    const camera = roll.camera || "—";
    const film = roll.film || "—";
    this._caption.innerHTML += `
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

// Re-render every roll-dependent UI surface (selector + table). Lives here
// because it orchestrates RollSelector and TableRenderer, both defined by now.
function refreshAllUI() {
  RollSelector.render();
  TableRenderer.render();
}
