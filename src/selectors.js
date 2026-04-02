// ============================================================================
// SELECTORS - Camera, Film, and Roll selectors + entity modals
// ============================================================================

/* eslint-disable no-unused-vars */

// ============================================================================
// CAMERA SELECTOR - Uses EntitySelector + EntityFormModal
// ============================================================================

let cameraModal = null;
let cameraSelector = null;

const CameraSelector = {
  init() {
    cameraModal = new EntityFormModal({
      entityType: "Camera",
      schema: CAMERA_SCHEMA,
      manager: CameraManager,
      onSave: (item, mode, oldName) => {
        if (mode === "update" && oldName && oldName !== item[CameraManager.displayField]) {
          // Cascade rename to all rolls referencing old camera name
          const rolls = RollManager.getRolls();
          rolls.forEach((roll) => {
            if (roll.camera === oldName) {
              roll.camera = item[CameraManager.displayField];
              RollManager.updateRoll(roll.id, roll);
            }
          });
          // Update OptionsManager storage keys
          OptionsManager.renameCameraKeys(oldName, item[CameraManager.displayField]);
        }
        if (mode === "create") {
          // Set new camera as selected for current roll
          SessionManager.setSelectedCamera(item[CameraManager.displayField]);
        }
      },
      onDelete: (entity) => {
        if (
          !confirm(
            `Are you sure you want to delete "${entity[CameraManager.displayField]}"? This cannot be undone.`,
          )
        )
          return false;

        // Reassign any rolls using this camera to the first remaining one
        const remaining = CameraManager.getAll().filter(
          (c) => c.id !== entity.id,
        );
        const fallback = remaining[0]?.[CameraManager.displayField] || "";
        const rolls = RollManager.getRolls();
        rolls.forEach((roll) => {
          if (roll.camera === entity[CameraManager.displayField]) {
            roll.camera = fallback;
            RollManager.updateRoll(roll.id, roll);
          }
        });
        return true;
      },
      onAfterAction: () => refreshAllUI(),
    });

    cameraSelector = new EntitySelector({
      containerSelector: "#cameraContainer",
      selectId: "cameraSelect",
      manager: CameraManager,
      modal: cameraModal,
      iconHref: "#icon-camera",
      label: "Select camera",
      addNewLabel: "+ Add new camera",
      onSelect: (cameraId) => {
        const camera = CameraManager.getById(cameraId);
        if (camera) {
          SessionManager.setSelectedCamera(camera[CameraManager.displayField]);
          TableRenderer.render();
        }
      },
      getSelectedValue: () => SessionManager.getSelectedCamera(),
    });
  },

  render() {
    if (cameraSelector) cameraSelector.render();
  },
};

// ============================================================================
// FILM SELECTOR - Uses EntitySelector + EntityFormModal
// ============================================================================

let filmModal = null;
let filmSelector = null;

const FilmSelector = {
  init() {
    filmModal = new EntityFormModal({
      entityType: "Film",
      schema: FILM_SCHEMA,
      manager: FilmManager,
      onSave: (item, mode, oldName) => {
        if (mode === "update" && oldName && oldName !== item[FilmManager.displayField]) {
          // Cascade rename to all rolls referencing old film name
          const rolls = RollManager.getRolls();
          rolls.forEach((roll) => {
            if (roll.film === oldName) {
              roll.film = item[FilmManager.displayField];
              RollManager.updateRoll(roll.id, roll);
            }
          });
        }
        if (mode === "create") {
          SessionManager.setSelectedFilm(item[FilmManager.displayField]);
        }
      },
      onDelete: (entity) => {
        if (
          !confirm(
            `Are you sure you want to delete "${entity[FilmManager.displayField]}"? This cannot be undone.`,
          )
        )
          return false;

        // Reassign any rolls using this film to the first remaining one
        const remaining = FilmManager.getAll().filter(
          (f) => f.id !== entity.id,
        );
        const fallback = remaining[0]?.[FilmManager.displayField] || "";
        const rolls = RollManager.getRolls();
        rolls.forEach((roll) => {
          if (roll.film === entity[FilmManager.displayField]) {
            roll.film = fallback;
            RollManager.updateRoll(roll.id, roll);
          }
        });
        return true;
      },
      onAfterAction: () => refreshAllUI(),
    });

    filmSelector = new EntitySelector({
      containerSelector: "#filmContainer",
      selectId: "filmSelect",
      manager: FilmManager,
      modal: filmModal,
      iconHref: "#icon-film",
      label: "Select film",
      addNewLabel: "+ Add new film",
      onSelect: (filmId) => {
        const film = FilmManager.getById(filmId);
        if (film) {
          SessionManager.setSelectedFilm(film[FilmManager.displayField]);
        }
      },
      getSelectedValue: () => SessionManager.getSelectedFilm(),
    });
  },

  render() {
    if (filmSelector) filmSelector.render();
  },
};

// ============================================================================
// ROLL SELECTOR - Uses EntitySelector + EntityFormModal
// ============================================================================

let rollModal = null;
let rollSelector = null;

const RollSelector = {
  init() {
    rollModal = new EntityFormModal({
      entityType: "Roll",
      schema: ROLL_SCHEMA,
      manager: RollManagerAdapter,
      onSave: (item, mode) => {
        if (mode === "create") {
          RollManager.setCurrentRoll(item.id);
        }
      },
      onDelete: (entity) => {
        if (
          !confirm(
            `Are you sure you want to delete the roll "${entity[RollManagerAdapter.displayField]}"? This cannot be undone.`,
          )
        )
          return false;
        return true;
      },
      onAfterAction: () => refreshAllUI(),
    });

    rollSelector = new EntitySelector({
      containerSelector: "#rollContainer",
      selectId: "rollSelect",
      manager: RollManagerAdapter,
      modal: rollModal,
      iconHref: "#icon-roll",
      label: "Select roll",
      addNewLabel: "+ Create new roll",
      onSelect: (rollId) => {
        RollManager.setCurrentRoll(rollId);
        refreshAllUI();
      },
      getSelectedValue: () => {
        const roll = RollManager.getCurrentRoll();
        return roll ? roll["roll-name"] : "";
      },
    });

    // Auto-open create modal when no rolls exist
    if (!RollManager.getCurrentRoll()) {
      rollModal.openCreate();
    }
  },

  render() {
    if (rollSelector) {
      rollSelector.render();
    }
    // Auto-open create modal when no rolls exist
    if (!RollManager.getCurrentRoll() && rollModal) {
      rollModal.openCreate();
    }
  },
};
