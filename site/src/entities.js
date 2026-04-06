// ============================================================================
// ENTITY MANAGER - Generic localStorage-backed CRUD for cameras, films, etc.
// ============================================================================

/* eslint-disable no-unused-vars */

class EntityManager {
  constructor({ storageKey, counterKey, defaults, displayField = "name" }) {
    this.storageKey = storageKey;
    this.counterKey = counterKey;
    this.defaults = defaults;
    this.displayField = displayField;
  }

  init() {
    const existing = localStorage.getItem(this.storageKey);
    if (!existing) {
      // Seed from defaults on first load
      const seeded = this.defaults.map((item, i) => ({
        ...item,
        id: `${this.storageKey}-${i + 1}`,
      }));
      this.saveAll(seeded);
      localStorage.setItem(this.counterKey, String(this.defaults.length));
    }
  }

  getAll() {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  saveAll(items) {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  getById(id) {
    return this.getAll().find((item) => item.id === id) || null;
  }

  getByName(name) {
    return (
      this.getAll().find((item) => item[this.displayField] === name) || null
    );
  }

  getNextId() {
    let counter = localStorage.getItem(this.counterKey);
    counter = counter ? parseInt(counter) + 1 : 1;
    localStorage.setItem(this.counterKey, String(counter));
    return `${this.storageKey}-${counter}`;
  }

  create(data) {
    const items = this.getAll();
    const newItem = { ...data, id: this.getNextId() };
    items.push(newItem);
    this.saveAll(items);
    return newItem;
  }

  update(id, data) {
    const items = this.getAll();
    const item = items.find((i) => i.id === id);
    if (!item) return null;
    const oldName = item[this.displayField];
    Object.assign(item, data);
    this.saveAll(items);
    return { item, oldName };
  }

  delete(id) {
    const items = this.getAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    this.saveAll(filtered);
    return true;
  }

  getDisplayName(id) {
    const item = this.getById(id);
    return item ? item[this.displayField] : null;
  }
}

// Singleton instances
const CameraManager = new EntityManager({
  storageKey: "cameras",
  counterKey: "camera-counter",
  defaults: DEFAULT_CAMERAS,
  displayField: "camera-name",
});

CameraManager.getHiddenFields = function (cameraName) {
  if (!cameraName) return [];
  const camera = this.getByName(cameraName);
  return (camera && camera["hidden-fields"]) || [];
};

CameraManager.isFieldHidden = function (fieldName, cameraName) {
  return this.getHiddenFields(cameraName).includes(fieldName);
};

CameraManager.toggleHiddenField = function (fieldName, cameraName) {
  const hidden = this.getHiddenFields(cameraName);
  const index = hidden.indexOf(fieldName);
  if (index === -1) {
    hidden.push(fieldName);
  } else {
    hidden.splice(index, 1);
  }
  const camera = this.getByName(cameraName);
  if (!camera) return;
  camera["hidden-fields"] = hidden;
  this.update(camera.id, camera);
};

const FilmManager = new EntityManager({
  storageKey: "films",
  counterKey: "film-counter",
  defaults: DEFAULT_FILMS,
  displayField: "film-name",
});

// Adapter to make RollManager compatible with EntityFormModal/EntitySelector
const RollManagerAdapter = {
  displayField: "roll-name",

  getAll() {
    return RollManager.getRolls();
  },

  getById(id) {
    return RollManager.getRollById(id);
  },

  getByName(name) {
    return RollManager.getRolls().find((r) => r["roll-name"] === name) || null;
  },

  create(data) {
    return RollManager.createRoll(data["roll-name"]);
  },

  update(id, data) {
    const roll = RollManager.getRollById(id);
    if (!roll) return null;
    const oldName = roll["roll-name"];
    RollManager.renameRoll(id, data["roll-name"]);
    return { item: RollManager.getRollById(id), oldName };
  },

  delete(id) {
    return RollManager.deleteRoll(id);
  },
};
