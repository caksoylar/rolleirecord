// ============================================================================
// APP INITIALIZATION - Main entry point for application
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
  // Initialize entity managers (seeds defaults on first load)
  CameraManager.init();
  FilmManager.init();
  RollManager.init();

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
    .addEventListener("click", () => FrameModal.openAddModal());

  // Update banner: reload page to activate new service worker
  document
    .getElementById("updateBanner")
    .addEventListener("click", () => location.reload());

  // Re-trigger rec icon animation when the app is resumed (e.g. switching back on iOS)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const elt = document.querySelector("#recIconOuter");
      if (elt) {
        elt.replaceWith(elt.cloneNode(true));
      }
    }
  });
});
