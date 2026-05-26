// ============================================================================
// EXPORT & IMPORT - I/O for rolls
// ============================================================================

// eslint-disable-next-line no-unused-vars
const Export = {
  // Build clean frame data for CSV export (flat rows with camera/film/iso)
  _getFrameData() {
    const rows = RollManager.getFrames();
    const camera = RollManager.getCurrentCamera();
    const film = RollManager.getCurrentFilm();
    const iso = FilmManager.getByName(film)?.iso ?? "";

    return rows.map((row) => {
      const clean = Object.fromEntries(
        Object.entries(row).filter(([, val]) => val != null), // eslint-disable-line eqeqeq
      );
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
    const fieldMap = new Map(FRAME_SCHEMA.fields.map((f) => [f.name, f]));
    return rawFrames.map((row) => {
      const frame = {};
      for (const key of Object.keys(row)) {
        const field = fieldMap.get(key);
        if (!field) continue;
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
    const existingNames = new Set(RollManager.getRolls().map((r) => r.name));
    if (!existingNames.has(name)) return name;
    let suffix = 2;
    while (existingNames.has(`${name} (${suffix})`)) {
      suffix++;
    }
    return `${name} (${suffix})`;
  },

  _rollFilename(extension) {
    const currentRoll = RollManager.getCurrentRoll();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const rollName = currentRoll
      ? currentRoll.name.replace(/[^a-z0-9]/gi, "_")
      : "export";
    const frameCount = RollManager.getMaxFrameId(currentRoll) ?? 0;
    return `${rollName}_${frameCount}-${timestamp}.${extension}`;
  },

  _downloadFile(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportStorage() {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      backup[key] = localStorage.getItem(key);
    }
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    this._downloadFile(
      JSON.stringify(backup, null, 2),
      "application/json",
      `rolleirecord-backup-${timestamp}.json`,
    );
  },

  _importFile(handler) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          handler(event.target.result, file);
        } catch (err) {
          alert("Failed to import: " + err.message);
        }
      };
      reader.readAsText(file);
    });

    input.click();
  },

  importStorage() {
    this._importFile((text) => {
      const backup = JSON.parse(text);
      if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
        alert("Invalid file: expected a JSON object.");
        return;
      }
      if (
        !confirm(
          "This will replace all current data with the backup. Continue?",
        )
      )
        return;
      localStorage.clear();
      Object.entries(backup).forEach(([k, v]) => localStorage.setItem(k, v));
      location.reload();
    });
  },

  exportRoll() {
    const roll = RollManager.getCurrentRoll();
    if (!roll) return;

    const cameraName = RollManager.getCurrentCamera();
    const filmName = RollManager.getCurrentFilm();

    const data = {
      name: roll.name,
      frameCount: roll.frameCount ?? null,
      notes: roll.notes || "",
      camera: this._cleanEntity(CameraManager.getByName(cameraName)),
      film: this._cleanEntity(FilmManager.getByName(filmName)),
      frames: this._coerceFrames(roll.frames),
    };

    const jsonString = JSON.stringify(data, null, 2);
    this._downloadFile(
      jsonString,
      "application/json",
      this._rollFilename("json"),
    );
  },

  importRoll() {
    this._importFile((text, file) => {
      const data = JSON.parse(text);

      if (!data || typeof data !== "object" || !Array.isArray(data.frames)) {
        alert("Invalid file: expected a JSON object with a frames array.");
        return;
      }

      // Reconcile camera and film entities
      const camera = data.camera
        ? CameraManager.upsertByName(data.camera)
        : null;
      const film = data.film ? FilmManager.upsertByName(data.film) : null;

      const cameraName = camera?.name || CameraManager.getAll()[0]?.name || "";
      const filmName = film?.name || FilmManager.getAll()[0]?.name || "";

      const frames = this._coerceFrames(data.frames);

      // Use roll name from data, fall back to filename
      let rollName = data.name;
      if (!rollName) {
        const baseName = file.name.replace(/\.json$/i, "");
        rollName = baseName
          .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/, "")
          .replace(/_-?\d+$/, "")
          .replace(/_/g, " ");
      }
      rollName = this._deduplicateRollName(rollName || "Imported Roll");

      const newRoll = RollManager.createRoll({
        name: rollName,
        frameCount: data.frameCount,
        notes: data.notes || "",
        camera: cameraName,
        film: filmName,
        frames,
      });
      RollManager.setCurrentRoll(newRoll.id);

      refreshAllUI();
    });
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

    this._downloadFile(csvString, "text/csv", this._rollFilename("csv"));
  },
};
