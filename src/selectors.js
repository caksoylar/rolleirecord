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

// ============================================================================
// RENAME ROLL MODAL
// ============================================================================
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
    RollManager.renameRoll(RollManager.getCurrentRollId(), name);

    // Update UI
    RollSelector.render();

    this.close();
  },
};
