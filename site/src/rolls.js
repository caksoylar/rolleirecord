// ============================================================================
// ROLL MANAGER - Multi-roll management system
// ============================================================================

// eslint-disable-next-line no-unused-vars
const RollManager = {
  ROLLS_KEY: "rolls",
  CURRENT_ROLL_KEY: "current-roll-id",
  ROLL_ID_COUNTER_KEY: "roll-counter",
  DEFAULT_FRAME_COUNT,

  // Initialize rollmanager
  init() {
    const rolls = this.getRolls();

    // Ensure current roll is set if rolls exist, cleared if not
    const currentRollId = this._getCurrentRollId();
    if (rolls.length === 0) {
      localStorage.removeItem(this.CURRENT_ROLL_KEY);
    } else if (!currentRollId || !rolls.find((r) => r.id === currentRollId)) {
      this._setCurrentRollId(rolls[0].id);
    }
  },

  // Get all rolls
  getRolls() {
    const stored = localStorage.getItem(this.ROLLS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  // Save all rolls
  _saveRolls(rolls) {
    localStorage.setItem(this.ROLLS_KEY, JSON.stringify(rolls));
  },

  // Get current roll ID
  _getCurrentRollId() {
    return localStorage.getItem(this.CURRENT_ROLL_KEY);
  },

  // Set current roll ID
  _setCurrentRollId(rollId) {
    localStorage.setItem(this.CURRENT_ROLL_KEY, rollId);
  },

  // Get next roll ID
  _getNextRollId() {
    let counter = localStorage.getItem(this.ROLL_ID_COUNTER_KEY);
    counter = counter ? parseInt(counter, 10) + 1 : 1;
    localStorage.setItem(this.ROLL_ID_COUNTER_KEY, counter.toString());
    return `roll-${counter}`;
  },

  // Get roll by ID
  _getRollById(rollId) {
    const rolls = this.getRolls();
    return rolls.find((r) => r.id === rollId) || null;
  },

  // Get current roll
  getCurrentRoll() {
    const currentId = this._getCurrentRollId();
    if (!currentId) return null;
    return this._getRollById(currentId);
  },

  // Get the camera name for the current roll, falling back to the first
  // available camera if no roll is selected.
  getCurrentCamera() {
    return (
      this.getCurrentRoll()?.camera ?? CameraManager.getAll()[0]?.name ?? ""
    );
  },

  // Get the film name for the current roll, falling back to the first
  // available film if no roll is selected.
  getCurrentFilm() {
    return this.getCurrentRoll()?.film ?? FilmManager.getAll()[0]?.name ?? "";
  },

  // Create new roll from a data object
  createRoll(data) {
    const rolls = this.getRolls();
    const rollId = this._getNextRollId();
    const now = new Date().toISOString();
    const film = data.film || FilmManager.getAll()[0]?.name || "";
    const boxSpeed = FilmManager.getByName(film)?.iso ?? null;

    const newRoll = {
      id: rollId,
      name: data.name,
      frameCount: data.frameCount ?? this.DEFAULT_FRAME_COUNT,
      camera: data.camera || CameraManager.getAll()[0]?.name || "",
      film,
      ei: data.ei ?? boxSpeed,
      status: data.status || "Loaded",
      notes: data.notes || "",
      frames: data.frames || [],
      createdAt: now,
      updatedAt: now,
    };

    rolls.push(newRoll);
    this._saveRolls(rolls);

    // Set as current roll if it's the first one
    if (rolls.length === 1) {
      this._setCurrentRollId(rollId);
    }

    return newRoll;
  },

  // Delete roll
  deleteRoll(rollId) {
    const rolls = this.getRolls();

    const filtered = rolls.filter((r) => r.id !== rollId);
    if (filtered.length === rolls.length) return false;
    this._saveRolls(filtered);

    // If deleted roll was current, switch to first remaining or clear
    if (this._getCurrentRollId() === rollId) {
      if (filtered.length > 0) {
        this._setCurrentRollId(filtered[0].id);
      } else {
        localStorage.removeItem(this.CURRENT_ROLL_KEY);
      }
    }

    return true;
  },

  // Rename roll
  _renameRoll(rollId, newName) {
    return this.updateRoll(rollId, { name: newName });
  },

  // Update entire roll
  updateRoll(rollId, rollData) {
    const rolls = this.getRolls();
    const roll = rolls.find((r) => r.id === rollId);

    if (roll) {
      Object.assign(roll, rollData);
      roll.updatedAt = new Date().toISOString();
      this._saveRolls(rolls);
    }

    return roll || null;
  },

  // Set current roll
  setCurrentRoll(rollId) {
    const roll = this._getRollById(rollId);
    if (roll) {
      this._setCurrentRollId(rollId);
    }
    return roll || null;
  },

  // Get frames from current roll
  getFrames() {
    const currentRoll = this.getCurrentRoll();
    return currentRoll ? currentRoll.frames : [];
  },

  // Get frame by ID from current roll
  getFrameById(frameId) {
    const frames = this.getFrames();
    return frames.find((f) => f.id === frameId) || null;
  },

  // Add frame to current roll
  addFrame(frameData) {
    const currentRoll = this.getCurrentRoll();
    if (!currentRoll) return null;

    currentRoll.frames.push(frameData);
    this.updateRoll(currentRoll.id, currentRoll);

    return frameData;
  },

  // Update frame in current roll
  updateFrame(frameId, frameData) {
    const currentRoll = this.getCurrentRoll();
    if (!currentRoll) return null;

    const frameIndex = currentRoll.frames.findIndex((f) => f.id === frameId);
    if (frameIndex !== -1) {
      currentRoll.frames[frameIndex] = frameData;
      this.updateRoll(currentRoll.id, currentRoll);
      return frameData;
    }

    return null;
  },

  // Delete frame from current roll
  deleteFrame(frameId) {
    const currentRoll = this.getCurrentRoll();
    if (!currentRoll) return false;

    const initialLength = currentRoll.frames.length;
    currentRoll.frames = currentRoll.frames.filter((f) => f.id !== frameId);

    if (currentRoll.frames.length < initialLength) {
      this.updateRoll(currentRoll.id, currentRoll);
      return true;
    }

    return false;
  },

  // Check if frame ID is unique in current roll
  isFrameIdUnique(frameId, excludeId = null) {
    const frames = this.getFrames();
    return !frames.some((f) => f.id === frameId && f.id !== excludeId);
  },

  // Get highest existing frame ID in current roll
  getLastFrameId() {
    return this.getMaxFrameId(this.getCurrentRoll());
  },

  // Get highest frame ID for a given roll
  getMaxFrameId(roll) {
    if (!roll || roll.frames.length === 0) return null;
    const ids = roll.frames
      .map((f) => f.id)
      .filter((id) => typeof id === "number");
    return ids.length === 0 ? null : Math.max(...ids);
  },

  // Get next suggested frame ID
  getNextSuggestedFrameId() {
    const max = this.getLastFrameId();
    return max == null ? 1 : max + 1; // eslint-disable-line eqeqeq
  },
};
