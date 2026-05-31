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

  // Render initial table
  TableRenderer.render();

  // Settings: navigate to the settings page
  document.getElementById("settingsBtn").addEventListener("click", () => {
    window.location.href = "settings.html";
  });

  // FAB: add new frame
  document
    .getElementById("addFrameFab")
    .addEventListener("click", () => UI.openAddModal());

  // Update banner: reload page to activate new service worker
  document
    .getElementById("updateBanner")
    .addEventListener("click", () => location.reload());
});
