// ============================================================================
// APP INITIALIZATION - Main entry point for application
// ============================================================================

function initManagers() {
  CameraManager.init();
  FilmManager.init();
  RollManager.init();
}

document.addEventListener("DOMContentLoaded", function () {
  // Initialize entity managers (seeds defaults on first load)
  initManagers();

  // Initialize modules
  FrameModal.init();
  RollSelector.init();
  SettingsMenu.init();

  // Render initial table
  TableRenderer.render();

  // FAB: add new frame
  document
    .getElementById("addFrameFab")
    .addEventListener("click", () => UI.openAddModal());

  // Update banner: reload page to activate new service worker
  document
    .getElementById("updateBanner")
    .addEventListener("click", () => location.reload());
});

// ============================================================================
// SETTINGS MENU - App-level actions (Export, Import, Clear All)
// ============================================================================

const SettingsMenu = {
  element: null,

  init() {
    this.element = document.getElementById("settingsMenu");

    document
      .getElementById("settingsBtn")
      .addEventListener("click", () => this.open());

    this.element
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this.close());

    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) this.close();
    });

    document
      .getElementById("settingsExportRollBtn")
      .addEventListener("click", () => {
        this.close();
        Export.exportRoll();
      });

    document
      .getElementById("settingsImportRollBtn")
      .addEventListener("click", () => {
        this.close();
        Export.importRoll();
      });

    document
      .getElementById("settingsExportCSVBtn")
      .addEventListener("click", () => {
        this.close();
        Export.exportToExiftoolCSV();
      });

    document
      .getElementById("settingsFullExportBtn")
      .addEventListener("click", () => {
        this.close();
        Export.exportStorage();
      });

    document
      .getElementById("settingsFullImportBtn")
      .addEventListener("click", () => {
        this.close();
        Export.importStorage();
      });

    document
      .getElementById("settingsRefreshCacheBtn")
      .addEventListener("click", async () => {
        if (!("caches" in window)) {
          alert("Cache API not available.");
          return;
        }
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        location.reload();
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
          initManagers();
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
