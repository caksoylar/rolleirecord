// ============================================================================
// ENTITY MODAL - Schema-driven create/edit/delete modal for any entity type
// ============================================================================

// Sentinel value for "add new" option in EntitySelector dropdowns
const CREATE_NEW_SENTINEL = "__create_new__";

// eslint-disable-next-line no-unused-vars
class EntityFormModal {
  constructor({
    entityType,
    schema,
    manager,
    onSave,
    onBeforeSave,
    onDelete,
    onAfterAction,
  }) {
    this.entityType = entityType;
    this.schema = schema;
    this.manager = manager;
    this.onSave = onSave || (() => {});
    this.onBeforeSave = onBeforeSave || null;
    this.onDelete = onDelete || null;
    this.onAfterAction = onAfterAction || (() => {});
    this.mode = "create";
    this.editingId = null;
    this._mandatory = false;
    this._formatField =
      this.schema.fields.find((f) => f.type === "film-format") || null;
    this._sizeField =
      this.schema.fields.find((f) => f.type === "film-size") || null;

    this.element = this._createDOM();
    document.body.appendChild(this.element);
    this._attachEvents();
  }

  _createDOM() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = `${this.entityType}Modal`;

    const fieldsHTML = this.schema.fields
      .map((field) => {
        const id = `${this.entityType}-${safeInputId(field.name)}`;
        const required = field.required ? "required" : "";

        if (field.type === "select") {
          const options = field.options
            .map((o) => `<option value="${o}">${o}</option>`)
            .join("");
          return `
          <div class="form-group">
            <label for="${id}">${field.label}</label>
            <select id="${id}" name="${safeInputId(field.name)}" ${required}>${options}</select>
          </div>`;
        }

        if (field.type === "film-format") {
          const options = Object.keys(FORMATS)
            .map((f) => `<option value="${f}">${f}</option>`)
            .join("");
          return `
          <div class="form-group">
            <label for="${id}">${field.label}</label>
            <select id="${id}" name="${safeInputId(field.name)}" ${required}>${options}</select>
          </div>`;
        }

        if (field.type === "film-size") {
          return `
          <div class="form-group">
            <label for="${id}">${field.label}</label>
            <select id="${id}" name="${safeInputId(field.name)}" ${required}></select>
          </div>`;
        }

        if (field.type === "textarea") {
          return `
          <div class="form-group">
            <label for="${id}">${field.label}</label>
            <textarea id="${id}" name="${safeInputId(field.name)}" ${required} rows="3"></textarea>
          </div>`;
        }

        const inputType = field.type === "number" ? "number" : "text";
        return `
        <div class="form-group">
          <label for="${id}">${field.label}</label>
          <input type="${inputType}" id="${id}"
                 name="${safeInputId(field.name)}" ${required} />
        </div>`;
      })
      .join("");

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title"></h2>
        </div>
        <form class="entity-form" autocomplete="off">
          <div class="modal-body">
            ${fieldsHTML}
          </div>
          <button type="button" class="secondary field-options-btn" style="display:none">Field Options</button>
          <div class="modal-footer">
            <button type="submit" class="save-btn"></button>
            <button type="button" class="secondary cancel-btn">Cancel</button>
            <button type="button" class="danger delete-btn" style="display:none">Delete</button>
          </div>
        </form>
      </div>`;

    return modal;
  }

  _attachEvents() {
    const form = this.element.querySelector(".entity-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this._handleSubmit();
    });

    this.element
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this.close());

    this.element.addEventListener("click", (e) => {
      if (e.target === this.element && !this._mandatory) this.close();
    });

    const deleteBtn = this.element.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => this._handleDelete());

    // Field Options button — visible only if FRAME_SCHEMA has matching entity_specific fields
    this.hasFieldOptions = FRAME_SCHEMA.fields.some(
      (f) => f.entity_specific === this.entityType.toLowerCase(),
    );
    const fieldOptionsBtn = this.element.querySelector(".field-options-btn");
    if (this.hasFieldOptions) {
      fieldOptionsBtn.addEventListener("click", () => this._openFieldOptions());
    }

    // Wire film-format → film-size dependency
    this._wireFormatSizeDependency();
  }

  _openFieldOptions() {
    if (!this.editingId) return;
    const entity = this.manager.getById(this.editingId);
    if (!entity) return;
    this.close();
    FieldOptionsDialog.open({
      entityType: this.entityType.toLowerCase(),
      entityName: entity.name,
    });
  }

  _wireFormatSizeDependency() {
    if (!this._formatField || !this._sizeField) return;

    const formatSelect = this.element.querySelector(
      `#${this.entityType}-${safeInputId(this._formatField.name)}`,
    );
    const sizeSelect = this.element.querySelector(
      `#${this.entityType}-${safeInputId(this._sizeField.name)}`,
    );

    formatSelect.addEventListener("change", () => {
      this._populateSizeOptions(formatSelect.value, sizeSelect);
    });
  }

  _populateSizeOptions(format, sizeSelect, currentValue = null) {
    const sizes = FORMATS[format] || [];
    sizeSelect.innerHTML = sizes
      .map((s) => `<option value="${s}">${s}</option>`)
      .join("");
    if (currentValue && sizes.includes(currentValue)) {
      sizeSelect.value = currentValue;
    }
  }

  _collectFormData() {
    const data = {};
    this.schema.fields.forEach((field) => {
      const input = this.element.querySelector(
        `#${this.entityType}-${safeInputId(field.name)}`,
      );
      data[field.name] =
        field.type === "number"
          ? input.value === ""
            ? null
            : Number(input.value)
          : input.value.trim();
    });
    return data;
  }

  _populateForm(entity) {
    // Set format first so size options can be populated
    this.schema.fields.forEach((field) => {
      if (field.type === "film-size") return; // handled after format
      const el = this.element.querySelector(
        `#${this.entityType}-${safeInputId(field.name)}`,
      );
      el.value = entity[field.name] ?? "";
    });

    if (this._formatField && this._sizeField) {
      const sizeSelect = this.element.querySelector(
        `#${this.entityType}-${safeInputId(this._sizeField.name)}`,
      );
      this._populateSizeOptions(
        entity[this._formatField.name],
        sizeSelect,
        entity[this._sizeField.name],
      );
    }
  }

  _clearForm() {
    this.schema.fields.forEach((field) => {
      const el = this.element.querySelector(
        `#${this.entityType}-${safeInputId(field.name)}`,
      );
      if (field.type === "film-format") {
        el.selectedIndex = 0;
      } else if (field.type !== "film-size") {
        el.value = field.defaultValue ?? "";
      }
    });

    // Populate size options for the default (first) format
    if (this._formatField && this._sizeField) {
      const formatSelect = this.element.querySelector(
        `#${this.entityType}-${safeInputId(this._formatField.name)}`,
      );
      const sizeSelect = this.element.querySelector(
        `#${this.entityType}-${safeInputId(this._sizeField.name)}`,
      );
      this._populateSizeOptions(formatSelect.value, sizeSelect);
    }
  }

  _handleSubmit() {
    const data = this._collectFormData();

    // Validate required fields
    for (const field of this.schema.fields) {
      if (field.required && !data[field.name] && data[field.name] !== 0) {
        alert(`${field.label} is required`);
        return;
      }
    }

    if (this.onBeforeSave) {
      const existing = this.editingId
        ? this.manager.getById(this.editingId)
        : null;
      if (this.onBeforeSave(data, existing, this.mode) === false) return;
    }

    if (this.mode === "create") {
      const created = this.manager.create(data);
      this.onSave(created, "create");
    } else {
      const result = this.manager.update(this.editingId, data);
      if (result) {
        this.onSave(result.item, "update", result.oldName);
      }
    }

    this.close();
    this.onAfterAction();
    if (this._afterSave) {
      const cb = this._afterSave;
      this._afterSave = null;
      cb();
    }
  }

  _handleDelete() {
    if (!this.editingId) return;
    const entity = this.manager.getById(this.editingId);
    if (!entity) return;

    if (this.onDelete) {
      const canDelete = this.onDelete(entity);
      if (!canDelete) return;
    } else {
      const displayName = entity.name;
      if (
        !confirm(
          `Are you sure you want to delete "${displayName}"? This cannot be undone.`,
        )
      )
        return;
    }

    this.manager.delete(this.editingId);
    this.close();
    this.onAfterAction();
  }

  openCreate(options = {}) {
    this.mode = "create";
    this.editingId = null;
    this._mandatory = options.mandatory || false;
    this._afterSave = options.afterSave || null;
    this._afterClose = options.onClose || null;
    this._clearForm();

    this.element.querySelector(".modal-title").textContent =
      `New ${this.entityType}`;
    this.element.querySelector(".save-btn").textContent = "Create";
    this.element.querySelector(".delete-btn").style.display = "none";
    this.element.querySelector(".field-options-btn").style.display = "none";
    this.element.querySelector(".cancel-btn").style.display = this._mandatory
      ? "none"
      : "";

    this.element.classList.add("active");
    const firstInput = this.element.querySelector("input, select, textarea");
    if (firstInput) firstInput.focus();
  }

  openEdit(entityId, options = {}) {
    const entity = this.manager.getById(entityId);
    if (!entity) return;

    this.mode = "edit";
    this.editingId = entityId;
    this._mandatory = false;
    this._afterSave = options.afterSave || null;
    this._afterClose = options.onClose || null;
    this._populateForm(entity);

    this.element.querySelector(".modal-title").textContent =
      `Edit ${this.entityType}`;
    this.element.querySelector(".save-btn").textContent = "Save";
    this.element.querySelector(".delete-btn").style.display = "";
    this.element.querySelector(".cancel-btn").style.display = "";
    this.element.querySelector(".field-options-btn").style.display = this
      .hasFieldOptions
      ? ""
      : "none";

    this.element.classList.add("active");
    const firstInput = this.element.querySelector("input, select, textarea");
    if (firstInput) firstInput.focus();
  }

  close() {
    this.element.classList.remove("active");
    if (this._afterClose) {
      const cb = this._afterClose;
      this._afterClose = null;
      cb();
    }
  }
}

// ============================================================================
// ENTITY SELECTOR - Reusable select + edit button + "add new" for any entity
// ============================================================================

// eslint-disable-next-line no-unused-vars
class EntitySelector {
  constructor({
    containerSelector,
    selectId,
    manager,
    modal,
    iconHref,
    label,
    addNewLabel,
    onSelect,
    getSelectedValue,
    formatLabel,
  }) {
    this.container = document.querySelector(containerSelector);
    this.selectId = selectId;
    this.manager = manager;
    this.modal = modal;
    this.iconHref = iconHref;
    this.label = label;
    this.addNewLabel = addNewLabel || "+ Add new";
    this.onSelect = onSelect || (() => {});
    this.getSelectedValue = getSelectedValue;
    this.formatLabel = formatLabel || ((item) => item.name);

    this._buildDOM();
    this.render();
    this._attachEvents();
  }

  _buildDOM() {
    this.container.innerHTML = `
      <label title="${this.label}">
        <svg class="icon"><use href="icons.svg${this.iconHref}"></use></svg>
      </label>
      <select id="${this.selectId}"></select>
      <button type="button" class="secondary entity-edit-btn" title="Edit">
        <svg class="icon"><use href="icons.svg#icon-edit"></use></svg>
      </button>`;

    this.selectElement = this.container.querySelector("select");
    this.editBtn = this.container.querySelector(".entity-edit-btn");
  }

  _attachEvents() {
    this.container.addEventListener("change", (e) => {
      if (e.target !== this.selectElement) return;
      const value = e.target.value;
      if (value === CREATE_NEW_SENTINEL) {
        this.modal.openCreate();
        // Reset select to current value
        this._restoreSelection();
      } else {
        this.onSelect(value);
      }
    });

    this.editBtn.addEventListener("click", () => {
      const selectedId = this.selectElement.value;
      if (selectedId && selectedId !== CREATE_NEW_SENTINEL) {
        this.modal.openEdit(selectedId);
      }
    });
  }

  _restoreSelection() {
    const selectedName = this.getSelectedValue();
    const item = this.manager.getByName(selectedName);
    if (item) {
      this.selectElement.value = item.id;
    }
  }

  render() {
    const items = this.manager.getAll();
    const selectedName = this.getSelectedValue();
    const selectedItem = this.manager.getByName(selectedName);

    let html = "";
    items.forEach((item) => {
      const selected =
        selectedItem && item.id === selectedItem.id ? "selected" : "";
      html += `<option value="${item.id}" ${selected}>${escapeHtml(this.formatLabel(item))}</option>`;
    });
    html += `<option value="${CREATE_NEW_SENTINEL}">${escapeHtml(this.addNewLabel)}</option>`;

    this.selectElement.innerHTML = html;
  }
}
