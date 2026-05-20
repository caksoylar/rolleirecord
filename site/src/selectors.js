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
// CAMERA SELECTOR - Uses EntitySelector + EntityFormModal
// ============================================================================

// eslint-disable-next-line no-unused-vars
const CameraSelector = {
  _modal: null,
  _selector: null,

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

    this._selector = new EntitySelector({
      containerSelector: "#cameraContainer",
      selectId: "cameraSelect",
      manager: CameraManager,
      modal: this._modal,
      iconHref: "#icon-camera",
      label: "Select camera",
      addNewLabel: "+ Add new camera",
      onSelect: (cameraId) => {
        const camera = CameraManager.getById(cameraId);
        if (camera) {
          SessionManager.setSelectedCamera(camera.name);
          TableRenderer.render();
        }
      },
      getSelectedValue: () => SessionManager.getSelectedCamera(),
    });
  },

  render() {
    if (this._selector) this._selector.render();
  },
};

// ============================================================================
// FILM SELECTOR - Uses EntitySelector + EntityFormModal
// ============================================================================

// eslint-disable-next-line no-unused-vars
const FilmSelector = {
  _modal: null,
  _selector: null,

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

    this._selector = new EntitySelector({
      containerSelector: "#filmContainer",
      selectId: "filmSelect",
      manager: FilmManager,
      modal: this._modal,
      iconHref: "#icon-film",
      label: "Select film",
      addNewLabel: "+ Add new film",
      onSelect: (filmId) => {
        const film = FilmManager.getById(filmId);
        if (film) {
          SessionManager.setSelectedFilm(film.name);
        }
      },
      getSelectedValue: () => SessionManager.getSelectedFilm(),
    });
  },

  render() {
    if (this._selector) this._selector.render();
  },
};

// ============================================================================
// ROLL SELECTOR - Uses EntitySelector + EntityFormModal
// ============================================================================

// eslint-disable-next-line no-unused-vars
const RollSelector = {
  _modal: null,
  _selector: null,

  init() {
    this._modal = new EntityFormModal({
      entityType: "Roll",
      schema: ROLL_SCHEMA,
      manager: RollManagerAdapter,
      onBeforeSave: (data, existing, mode) => {
        if (
          mode === "update" &&
          existing &&
          existing.camera !== data.camera &&
          existing.frames?.length > 0
        ) {
          return confirm(
            `This roll already has ${existing.frames.length} frame(s) logged with "${existing.camera}". ` +
              `Changing the camera may affect hidden fields and per-camera options. Continue?`,
          );
        }
      },
      onSave: (item, mode) => {
        if (mode === "create") {
          RollManager.setCurrentRoll(item.id);
        }
      },
      onDelete: (entity) => {
        return confirm(
          `Are you sure you want to delete the roll "${entity.name}"? This cannot be undone.`,
        );
      },
      onAfterAction: () => refreshAllUI(),
    });

    this._selector = new EntitySelector({
      containerSelector: "#rollContainer",
      selectId: "rollSelect",
      manager: RollManagerAdapter,
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
        return roll.frameCount
          ? `${roll.name} (${progress}/${roll.frameCount})`
          : roll.name;
      },
    });

    // Auto-open create modal when no rolls exist
    if (!RollManager.getCurrentRoll()) {
      this._modal.openCreate({ mandatory: true });
    }
  },

  render() {
    if (this._selector) this._selector.render();
    // Auto-open create modal when no rolls exist
    if (!RollManager.getCurrentRoll() && this._modal) {
      this._modal.openCreate({ mandatory: true });
    }
  },
};
