// ============================================================================
// APP INITIALIZATION - Main entry point for application
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
  // Initialize entity managers (seeds defaults on first load)
  CameraManager.init();
  FilmManager.init();

  // Initialize RollManager (creates default roll if needed)
  RollManager.init();

  // Initialize modules
  FrameModal.init();
  FieldOptionsDialog.init();
  CameraSelector.init();
  FilmSelector.init();
  RollSelector.init();
  SettingsMenu.init();

  // Render initial table
  TableRenderer.render();

  // Settings gear button
  document
    .getElementById("settingsBtn")
    .addEventListener("click", () => SettingsMenu.open());
});

// ============================================================================
// SETTINGS MENU - App-level actions (Export, Import, Clear All)
// ============================================================================

const SettingsMenu = {
  element: null,

  init() {
    this.element = document.getElementById("settingsMenu");

    this.element
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this.close());

    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) this.close();
    });

    document
      .getElementById("settingsExportBtn")
      .addEventListener("click", () => {
        this.close();
        Export.exportToJSON();
      });

    document
      .getElementById("settingsImportBtn")
      .addEventListener("click", () => {
        this.close();
        Export.importFromJSON();
      });

    document
      .getElementById("settingsExportCSVBtn")
      .addEventListener("click", () => {
        this.close();
        Export.exportToExiftoolCSV();
      });

    document
      .getElementById("settingsClearAllBtn")
      .addEventListener("click", () => {
        if (
          confirm(
            "Are you sure you want to clear all storage? This cannot be undone.",
          )
        ) {
          localStorage.clear();
          CameraManager.init();
          FilmManager.init();
          RollManager.init();
          this.close();
          refreshAllUI();
        }
      });
  },

  open() {
    this.element.classList.add("active");
  },

  close() {
    this.element.classList.remove("active");
  },
};
