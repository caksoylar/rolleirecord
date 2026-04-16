// ============================================================================
// EXPORT & IMPORT - JSON file I/O for rolls
// ============================================================================

// eslint-disable-next-line no-unused-vars
const Export = {
  _getFrameData() {
    const rows = RollManager.getFrames();

    const camera = SessionManager.getSelectedCamera();
    const film = SessionManager.getSelectedFilm();
    const iso = FilmManager.getByName(film)?.iso ?? "";

    // Add camera and film to each row, omit null/undefined fields
    const enrichedData = rows.map((row) => {
      const clean = {};
      for (const [key, val] of Object.entries(row)) {
        if (val != null) clean[key] = val; // eslint-disable-line eqeqeq
      }
      clean.camera = camera;
      clean.film = film;
      clean.iso = iso;
      return clean;
    });
    return enrichedData;
  },

  _downloadFile(content, mimeType, extension) {
    const currentRoll = RollManager.getCurrentRoll();
    const blob = new Blob([content], { type: mimeType });
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
    link.download = `${rollName}-${timestamp}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportToJSON() {
    const data = this._getFrameData();
    const jsonString = JSON.stringify(data, null, 2);
    this._downloadFile(jsonString, "application/json", "json");
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

          // Extract camera and film from the first frame, resolve to known entities
          const firstFrame = data[0];
          const importedCamera = firstFrame.camera || "";
          const importedFilm = firstFrame.film || "";

          // Use imported name if it matches a known entity, otherwise fall back to first available
          const matchedCamera = CameraManager.getByName(importedCamera);
          const camera = matchedCamera
            ? importedCamera
            : CameraManager.getAll()[0]?.name || "";

          const matchedFilm = FilmManager.getByName(importedFilm);
          const film = matchedFilm
            ? importedFilm
            : FilmManager.getAll()[0]?.name || "";

          // Strip per-roll metadata from each frame, keep only schema fields
          const schemaFields = FRAME_SCHEMA.fields;
          const schemaFieldNames = schemaFields.map((f) => f.name);
          const frames = data.map((row) => {
            const frame = {};
            for (const key of Object.keys(row)) {
              if (!schemaFieldNames.includes(key)) continue;
              const field = schemaFields.find((f) => f.name === key);
              let val = row[key];
              // Coerce types to match schema
              if (field.type === "number") {
                val = val == null ? null : Number(val); // eslint-disable-line eqeqeq
                if (isNaN(val)) val = null;
                // eslint-disable-next-line eqeqeq
              } else if (val != null) {
                val = String(val);
              }
              frame[key] = val;
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

  exportToExiftoolCSV() {
    const data = this._getFrameData().sort((f1, f2) => f1.id - f2.id);
    const exif = data.map(buildExifTags);

    const keys = [...new Set(exif.flatMap((obj) => Object.keys(obj)))];

    const toCsvLine = (obj) =>
      keys
        .map((key) => {
          const val = obj[key] ?? "";
          // Wrap in quotes if value contains comma, quote, or newline
          return /[,"\n]/.test(String(val))
            ? `"${String(val).replace(/"/g, '""')}"`
            : val;
        })
        .join(",");

    const csvString = [keys.join(","), ...exif.map(toCsvLine)].join("\n");

    this._downloadFile(csvString, "text/csv", "csv");
  },
};
