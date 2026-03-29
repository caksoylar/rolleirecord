// ============================================================================
// SELECTORS - Camera, Film, and Roll selectors + Create/Rename roll modals
// ============================================================================

/* eslint-disable no-unused-vars */

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
        refreshAllUI();
      }
    });
  },

  render() {
    const rolls = RollManager.getRolls();
    const currentRoll = RollManager.getCurrentRoll();

    let html = '<select id="rollSelect">';

    rolls.forEach((roll) => {
      const selected =
        currentRoll && roll.id === currentRoll.id ? "selected" : "";
      html += `<option value="${roll.id}" ${selected}>${escapeHtml(roll.name)}</option>`;
    });

    html += '<option value="create-new"';
    if (!currentRoll) html += " selected";
    html += ">+ Create new roll</option>";
    html += "</select>";

    this.selectElement.innerHTML = "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const newSelect = temp.querySelector("select");
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
// SHARED MODAL HELPERS
// ============================================================================
function initModal(element, { formSelector, inputSelector, onSubmit }) {
  const formElement = element.querySelector(formSelector);
  const inputElement = element.querySelector(inputSelector);

  if (formElement) {
    formElement.addEventListener("submit", (e) => {
      e.preventDefault();
      onSubmit(inputElement.value.trim());
    });
  }

  const cancelBtn = element.querySelector(".cancel-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () =>
      element.classList.remove("active"),
    );
  }

  element.addEventListener("click", (e) => {
    if (e.target === element) {
      element.classList.remove("active");
    }
  });

  return { element, inputElement };
}

// ============================================================================
// CREATE ROLL MODAL
// ============================================================================
const CreateRollModal = {
  element: null,
  inputElement: null,

  init() {
    const modal = initModal(document.getElementById("createRollModal"), {
      formSelector: "#createRollForm",
      inputSelector: "#rollNameInput",
      onSubmit: (name) => this.submit(name),
    });
    this.element = modal.element;
    this.inputElement = modal.inputElement;
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

  submit(name) {
    if (!name) {
      alert("Roll name cannot be empty");
      return;
    }

    const newRoll = RollManager.createRoll(name);
    RollManager.setCurrentRoll(newRoll.id);

    refreshAllUI();
    this.close();
  },
};

// ============================================================================
// RENAME ROLL MODAL
// ============================================================================
const RenameRollModal = {
  element: null,
  inputElement: null,

  init() {
    const modal = initModal(document.getElementById("renameRollModal"), {
      formSelector: "#renameRollForm",
      inputSelector: "#rollRenameInput",
      onSubmit: (name) => this.submit(name),
    });
    this.element = modal.element;
    this.inputElement = modal.inputElement;
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

  submit(name) {
    if (!name) {
      alert("Roll name cannot be empty");
      return;
    }

    RollManager.renameRoll(RollManager.getCurrentRollId(), name);
    RollSelector.render();
    this.close();
  },
};
