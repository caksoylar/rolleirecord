// ============================================================================
// EXPORT & IMPORT - I/O for rolls
// ============================================================================

const Export = {
  // Build clean frame data for CSV export (flat rows with camera/film/iso)
  _getFrameData() {
    const rows = RollManager.getFrames();
    const camera = SessionManager.getSelectedCamera();
    const film = SessionManager.getSelectedFilm();
    const iso = FilmManager.getByName(film)?.iso ?? "";

    return rows.map((row) => {
      const clean = {};
      for (const [key, val] of Object.entries(row)) {
        if (val != null) clean[key] = val; // eslint-disable-line eqeqeq
      }
      clean.camera = camera;
      clean.film = film;
      clean.iso = iso;
      return clean;
    });
  },

  // Strip internal id, keep only entity-relevant properties
  _cleanEntity(entity) {
    if (!entity) return {};
    const { id: _id, ...rest } = entity;
    return rest;
  },

  // Coerce raw frame objects to match FRAME_SCHEMA types, strip nulls
  _coerceFrames(rawFrames) {
    const schemaFields = FRAME_SCHEMA.fields;
    const schemaFieldNames = schemaFields.map((f) => f.name);
    return rawFrames.map((row) => {
      const frame = {};
      for (const key of Object.keys(row)) {
        if (!schemaFieldNames.includes(key)) continue;
        const field = schemaFields.find((f) => f.name === key);
        let val = row[key];
        if (field.type === "number") {
          val = val == null ? null : Number(val); // eslint-disable-line eqeqeq
          if (isNaN(val)) val = null;
        } else if (field.type === "checkbox") {
          val = val === true || val === "true";
          // eslint-disable-next-line eqeqeq
        } else if (val != null) {
          val = String(val);
        }
        if (val != null) frame[key] = val; // eslint-disable-line eqeqeq
      }
      return frame;
    });
  },

  // Append numeric suffix if a roll with this name already exists
  _deduplicateRollName(name) {
    const existingNames = RollManager.getRolls().map((r) => r.name);
    if (!existingNames.includes(name)) return name;
    let suffix = 2;
    while (existingNames.includes(`${name} (${suffix})`)) {
      suffix++;
    }
    return `${name} (${suffix})`;
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

  exportBackup() {
    const roll = RollManager.getCurrentRoll();
    if (!roll) return;

    const cameraName = SessionManager.getSelectedCamera();
    const filmName = SessionManager.getSelectedFilm();

    const data = {
      name: roll.name,
      frameCount: roll.frameCount ?? null,
      notes: roll.notes || "",
      camera: this._cleanEntity(CameraManager.getByName(cameraName)),
      film: this._cleanEntity(FilmManager.getByName(filmName)),
      frames: Export._coerceFrames(roll.frames),
    };

    const jsonString = JSON.stringify(data, null, 2);
    this._downloadFile(jsonString, "application/json", "json");
  },

  importBackup() {
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

          if (!data || typeof data !== "object" || !Array.isArray(data.frames)) {
            alert("Invalid file: expected a JSON object with a frames array.");
            return;
          }

          // Reconcile camera and film entities
          const camera = data.camera
            ? CameraManager.upsertByName(data.camera)
            : null;
          const film = data.film
            ? FilmManager.upsertByName(data.film)
            : null;

          const cameraName = camera?.name || CameraManager.getAll()[0]?.name || "";
          const filmName = film?.name || FilmManager.getAll()[0]?.name || "";

          const frames = Export._coerceFrames(data.frames);

          // Use roll name from data, fall back to filename
          let rollName = data.name;
          if (!rollName) {
            const baseName = file.name.replace(/\.json$/i, "");
            rollName = baseName
              .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/, "")
              .replace(/_/g, " ");
          }
          rollName = Export._deduplicateRollName(rollName || "Imported Roll");

          const newRoll = RollManagerAdapter.create({
            name: rollName,
            frameCount: data.frameCount,
            notes: data.notes || "",
          });
          RollManager.setCurrentRoll(newRoll.id);
          RollManager.updateRoll(newRoll.id, {
            camera: cameraName,
            film: filmName,
            frames,
          });

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
