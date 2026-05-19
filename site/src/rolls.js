// ============================================================================
// ROLL MANAGER - Multi-roll management system
// ============================================================================

// eslint-disable-next-line no-unused-vars
const RollManager = {
  ROLLS_KEY: "rolls",
  CURRENT_ROLL_KEY: "current-roll-id",
  ROLL_ID_COUNTER_KEY: "roll-counter",
  DEFAULT_FRAME_COUNT: ROLL_SCHEMA.fields.find(
    (val) => val.name === "frameCount",
  )?.defaultValue,

  // Initialize rollmanager
  init() {
    const rolls = this.getRolls();

    // Ensure current roll is set if rolls exist, cleared if not
    const currentRollId = this.getCurrentRollId();
    if (rolls.length === 0) {
      localStorage.removeItem(this.CURRENT_ROLL_KEY);
    } else if (!currentRollId || !rolls.find((r) => r.id === currentRollId)) {
      this.setCurrentRollId(rolls[0].id);
    }
  },

  // Get all rolls
  getRolls() {
    const stored = localStorage.getItem(this.ROLLS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  // Save all rolls
  saveRolls(rolls) {
    localStorage.setItem(this.ROLLS_KEY, JSON.stringify(rolls));
  },

  // Get current roll ID
  getCurrentRollId() {
    return localStorage.getItem(this.CURRENT_ROLL_KEY);
  },

  // Set current roll ID
  setCurrentRollId(rollId) {
    localStorage.setItem(this.CURRENT_ROLL_KEY, rollId);
  },

  // Get next roll ID
  getNextRollId() {
    let counter = localStorage.getItem(this.ROLL_ID_COUNTER_KEY);
    counter = counter ? parseInt(counter) + 1 : 1;
    localStorage.setItem(this.ROLL_ID_COUNTER_KEY, counter.toString());
    return `roll-${counter}`;
  },

  // Get roll by ID
  getRollById(rollId) {
    const rolls = this.getRolls();
    return rolls.find((r) => r.id === rollId) || null;
  },

  // Get current roll
  getCurrentRoll() {
    const currentId = this.getCurrentRollId();
    if (!currentId) return null;
    return this.getRollById(currentId);
  },

  // Create new roll
  createRoll(name, frameCount) {
    frameCount = frameCount ?? this.DEFAULT_FRAME_COUNT;
    const rolls = this.getRolls();

    // Generate unique roll ID
    const rollId = this.getNextRollId();

    // Create roll with defaults
    const newRoll = {
      id: rollId,
      name: name,
      frameCount: frameCount,
      camera: CameraManager.getAll()[0]?.name || "",
      film: FilmManager.getAll()[0]?.name || "",
      frames: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    rolls.push(newRoll);
    this.saveRolls(rolls);

    // Set as current roll if it's the first one
    if (rolls.length === 1) {
      this.setCurrentRollId(rollId);
    }

    return newRoll;
  },

  // Delete roll
  deleteRoll(rollId) {
    const rolls = this.getRolls();

    const filtered = rolls.filter((r) => r.id !== rollId);
    if (filtered.length === rolls.length) return false;
    this.saveRolls(filtered);

    // If deleted roll was current, switch to first remaining or clear
    if (this.getCurrentRollId() === rollId) {
      if (filtered.length > 0) {
        this.setCurrentRollId(filtered[0].id);
      } else {
        localStorage.removeItem(this.CURRENT_ROLL_KEY);
      }
    }

    return true;
  },

  // Rename roll
  renameRoll(rollId, newName) {
    const rolls = this.getRolls();
    const roll = rolls.find((r) => r.id === rollId);

    if (roll) {
      roll.name = newName;
      roll.updatedAt = new Date().toISOString();
      this.saveRolls(rolls);
    }

    return roll || null;
  },

  // Update entire roll
  updateRoll(rollId, rollData) {
    const rolls = this.getRolls();
    const roll = rolls.find((r) => r.id === rollId);

    if (roll) {
      Object.assign(roll, rollData);
      roll.updatedAt = new Date().toISOString();
      this.saveRolls(rolls);
    }

    return roll || null;
  },

  // Set current roll
  setCurrentRoll(rollId) {
    const roll = this.getRollById(rollId);
    if (roll) {
      this.setCurrentRollId(rollId);
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
    currentRoll.updatedAt = new Date().toISOString();
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
      currentRoll.updatedAt = new Date().toISOString();
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
      currentRoll.updatedAt = new Date().toISOString();
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
    const frames = this.getFrames();
    if (frames.length === 0) return 1;
    const ids = frames.map((f) => f.id).filter((id) => typeof id === "number");
    return ids.length === 0 ? 1 : Math.max(...ids) + 1;
  },
};
