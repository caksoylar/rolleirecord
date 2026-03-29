// ============================================================================
// APP INITIALIZATION - Main entry point for application
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
  // Initialize RollManager first (creates default roll if needed)
  RollManager.init();

  // Initialize modules
  FrameModal.init();
  OptionsDialog.init();
  CameraSelector.init();
  FilmSelector.init();
  CreateRollModal.init();
  RollSelector.init();
  RenameRollModal.init();

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
  document
    .getElementById("renameBtn")
    .addEventListener("click", () => RenameRollModal.open());
  document.getElementById("deleteRollBtn").addEventListener("click", () => {
    const currentRoll = RollManager.getCurrentRoll();
    if (!currentRoll) return;
    if (
      confirm(
        `Are you sure you want to delete the roll "${currentRoll.name}"? This cannot be undone.`,
      )
    ) {
      RollManager.deleteRoll(currentRoll.id);
      refreshAllUI();
    }
  });
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
