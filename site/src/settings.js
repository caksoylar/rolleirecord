// ============================================================================
// SETTINGS PAGE - Standalone page for entity editing links, metadata export,
// and developer/data-management actions. Per-roll JSON import lives on
// the main app page (the roll selector bar), not here.
// ============================================================================

const SettingsPage = {
  init() {
    // Seed managers so current camera/film lookups and CSV export work.
    CameraManager.init();
    FilmManager.init();
    RollManager.init();

    document
      .getElementById("settingsEditCamera")
      .addEventListener("click", () => {
        const params = new URLSearchParams({
          type: "camera",
          name: RollManager.getCurrentCamera(),
        });
        window.location.href = `entity-editor.html?${params}`;
      });

    document
      .getElementById("settingsEditFilms")
      .addEventListener("click", () => {
        const params = new URLSearchParams({
          type: "film",
          name: RollManager.getCurrentFilm(),
        });
        window.location.href = `entity-editor.html?${params}`;
      });

    const mapsProviderSelect = document.getElementById("settingsMapsProvider");
    mapsProviderSelect.value =
      localStorage.getItem("maps-provider") ?? "google";
    mapsProviderSelect.addEventListener("change", () => {
      localStorage.setItem("maps-provider", mapsProviderSelect.value);
    });

    const toggleRGC = document.getElementById("settingsEnableRGC");
    toggleRGC.checked = localStorage.getItem("rgc-enabled") === "true";
    toggleRGC.addEventListener("change", () => {
      localStorage.setItem("rgc-enabled", toggleRGC.checked);
    });

    document
      .getElementById("settingsFullExportBtn")
      .addEventListener("click", () => Export.exportStorage());

    document
      .getElementById("settingsFullImportBtn")
      .addEventListener("click", () => Export.importStorage());

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
          window.location.href = "index.html";
        }
      });
  },
};

document.addEventListener("DOMContentLoaded", () => SettingsPage.init());
