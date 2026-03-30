// ============================================================================
// EXPORT & IMPORT - JSON file I/O for rolls
// ============================================================================

/* eslint-disable no-unused-vars */

const Export = {
  exportToJSON() {
    const rows = RollManager.getFrames();
    rows.forEach((row) => {
      row.aperture = row.aperture.replace("ƒ/", "");
      row.shutter = row.aperture.replace("s", "");
    });

    const camera = CAMERAS.find(
      (val) => val.name === SessionManager.getSelectedCamera(),
    ).name;
    const selectedFilm = FILMS.find(
      (val) => val.name === SessionManager.getSelectedFilm(),
    );
    const film = selectedFilm.name;
    const iso = selectedFilm.iso;
    const currentRoll = RollManager.getCurrentRoll();

    // Add camera and film to each row
    const enrichedData = rows.map((row) => ({
      ...row,
      camera,
      film,
      iso,
    }));

    const jsonString = JSON.stringify(enrichedData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);

    // Use roll name in filename, replace special characters with underscores
    const rollName = currentRoll
      ? currentRoll.name.replace(/[^a-z0-9]/gi, "_")
      : "export";
    link.href = url;
    link.download = `${rollName}-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  importFromJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);

          if (!Array.isArray(data) || data.length === 0) {
            alert("Invalid file: expected a non-empty JSON array of frames.");
            return;
          }

          // Extract camera and film from the first frame
          const firstFrame = data[0];
          const camera = firstFrame.camera || CAMERAS[0]?.name || "";
          const film = firstFrame.film || FILMS[0]?.name || "";

          // Strip per-roll metadata from each frame, keep only schema fields
          const schemaFieldNames = SCHEMA.fields.map((f) => f.name);
          const frames = data.map((row) => {
            const frame = {};
            for (const key of Object.keys(row)) {
              if (schemaFieldNames.includes(key)) {
                frame[key] = row[key];
              }
            }
            // Restore ƒ/ prefix on aperture if it was stripped during export
            if (frame.aperture && !frame.aperture.startsWith("ƒ/")) {
              frame.aperture = "ƒ/" + frame.aperture;
            }
            // Restore suffix on aperture if it was stripped during export
            if (
              frame.shutter &&
              !frame.shutter.endsWith("s") &&
              frame.shutter !== "B"
            ) {
              frame.shutter += "s";
            }
            return frame;
          });

          // Derive roll name from filename (strip extension and timestamp)
          const baseName = file.name.replace(/\.json$/i, "");
          const rollName = baseName
            .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/, "")
            .replace(/_/g, " ");

          // Create new roll and populate it
          const newRoll = RollManager.createRoll(rollName || "Imported Roll");
          RollManager.setCurrentRoll(newRoll.id);
          RollManager.updateRoll(newRoll.id, {
            camera,
            film,
            frames,
          });

          // Refresh all UI
          refreshAllUI();
        } catch (err) {
          alert("Failed to import: " + err.message);
        }
      };

      reader.readAsText(file);
    });

    input.click();
  },
};
