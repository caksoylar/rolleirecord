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
  OptionsDialog.init();
  CameraSelector.init();
  FilmSelector.init();
  RollSelector.init();

  // Render initial table
  TableRenderer.render();

  // Attach event listeners
  document
    .getElementById("exportBtn")
    .addEventListener("click", () => Export.exportToJSON());
  document
    .getElementById("importBtn")
    .addEventListener("click", () => Export.importFromJSON());
  document
    .getElementById("settingsBtn")
    .addEventListener("click", () => OptionsDialog.open());
  document.getElementById("clearAllBtn").addEventListener("click", () => {
    if (
      confirm(
        `Are you sure you want to clear all storage? This cannot be undone.`,
      )
    ) {
      localStorage.clear();
      refreshAllUI();
    }
  });
});
