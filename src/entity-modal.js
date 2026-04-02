// ============================================================================
// ENTITY MODAL - Schema-driven create/edit/delete modal for any entity type
// ============================================================================

/* eslint-disable no-unused-vars */

class EntityFormModal {
  constructor({
    entityType,
    schema,
    manager,
    onSave,
    onDelete,
    onAfterAction,
  }) {
    this.entityType = entityType;
    this.schema = schema;
    this.manager = manager;
    this.onSave = onSave || (() => {});
    this.onDelete = onDelete || null;
    this.onAfterAction = onAfterAction || (() => {});
    this.mode = "create";
    this.editingId = null;

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
        const id = `${this.entityType}-${field.name}`;
        const required = field.required ? "required" : "";

        if (field.type === "film-format") {
          const options = Object.keys(FORMATS)
            .map((f) => `<option value="${f}">${f}</option>`)
            .join("");
          return `
          <div class="form-group">
            <label for="${id}">${field.label}</label>
            <select id="${id}" name="${field.name}" ${required}>${options}</select>
          </div>`;
        }

        if (field.type === "film-size") {
          return `
          <div class="form-group">
            <label for="${id}">${field.label}</label>
            <select id="${id}" name="${field.name}" ${required}></select>
          </div>`;
        }

        const inputType = field.type === "number" ? "number" : "text";
        return `
        <div class="form-group">
          <label for="${id}">${field.label}</label>
          <input type="${inputType}" id="${id}"
                 name="${field.name}" ${required} />
        </div>`;
      })
      .join("");

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title"></h2>
        </div>
        <form class="entity-form">
          <div class="modal-body">
            ${fieldsHTML}
          </div>
          <button type="button" class="secondary field-options-btn" style="display:none">Field Options</button>
          <div class="modal-footer">
            <button type="submit" class="save-btn"></button>
            <button type="button" class="secondary cancel-btn">Cancel</button>
            <button type="button" class="secondary import-btn" style="display:none">Import</button>
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

    const importBtn = this.element.querySelector(".import-btn");
    importBtn.addEventListener("click", () => {
      Export.importFromJSON();
    });

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
      entityName: entity[this.manager.displayField],
    });
  }

  _wireFormatSizeDependency() {
    const formatField = this.schema.fields.find(
      (f) => f.type === "film-format",
    );
    const sizeField = this.schema.fields.find((f) => f.type === "film-size");
    if (!formatField || !sizeField) return;

    const formatSelect = this.element.querySelector(
      `#${this.entityType}-${formatField.name}`,
    );
    const sizeSelect = this.element.querySelector(
      `#${this.entityType}-${sizeField.name}`,
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
        `#${this.entityType}-${field.name}`,
      );
      data[field.name] =
        field.type === "number" ? Number(input.value) : input.value.trim();
    });
    return data;
  }

  _populateForm(entity) {
    // Set format first so size options can be populated
    const formatField = this.schema.fields.find(
      (f) => f.type === "film-format",
    );
    const sizeField = this.schema.fields.find((f) => f.type === "film-size");

    this.schema.fields.forEach((field) => {
      if (field.type === "film-size") return; // handled after format
      const el = this.element.querySelector(
        `#${this.entityType}-${field.name}`,
      );
      el.value = entity[field.name] ?? "";
    });

    if (formatField && sizeField) {
      const sizeSelect = this.element.querySelector(
        `#${this.entityType}-${sizeField.name}`,
      );
      this._populateSizeOptions(
        entity[formatField.name],
        sizeSelect,
        entity[sizeField.name],
      );
    }
  }

  _clearForm() {
    this.schema.fields.forEach((field) => {
      const el = this.element.querySelector(
        `#${this.entityType}-${field.name}`,
      );
      if (field.type === "film-format") {
        el.selectedIndex = 0;
      } else if (field.type !== "film-size") {
        el.value = "";
      }
    });

    // Populate size options for the default (first) format
    const formatField = this.schema.fields.find(
      (f) => f.type === "film-format",
    );
    const sizeField = this.schema.fields.find((f) => f.type === "film-size");
    if (formatField && sizeField) {
      const formatSelect = this.element.querySelector(
        `#${this.entityType}-${formatField.name}`,
      );
      const sizeSelect = this.element.querySelector(
        `#${this.entityType}-${sizeField.name}`,
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
  }

  _handleDelete() {
    if (!this.editingId) return;
    const entity = this.manager.getById(this.editingId);
    if (!entity) return;

    if (this.onDelete) {
      const canDelete = this.onDelete(entity);
      if (!canDelete) return;
    } else {
      const displayName = entity[this.manager.displayField];
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
    this._clearForm();
    this._mandatory = options.mandatory || false;

    this.element.querySelector(".modal-title").textContent =
      `New ${this.entityType}`;
    this.element.querySelector(".save-btn").textContent = "Create";
    this.element.querySelector(".delete-btn").style.display = "none";
    this.element.querySelector(".field-options-btn").style.display = "none";

    const cancelBtn = this.element.querySelector(".cancel-btn");
    const importBtn = this.element.querySelector(".import-btn");
    if (this._mandatory) {
      cancelBtn.style.display = "none";
      importBtn.style.display = "";
    } else {
      cancelBtn.style.display = "";
      importBtn.style.display = "none";
    }

    this.element.classList.add("active");
    const firstInput = this.element.querySelector("input");
    if (firstInput) firstInput.focus();
  }

  openEdit(entityId) {
    const entity = this.manager.getById(entityId);
    if (!entity) return;

    this.mode = "edit";
    this.editingId = entityId;
    this._mandatory = false;
    this._populateForm(entity);

    this.element.querySelector(".modal-title").textContent =
      `Edit ${this.entityType}`;
    this.element.querySelector(".save-btn").textContent = "Save";
    this.element.querySelector(".delete-btn").style.display = "";
    this.element.querySelector(".cancel-btn").style.display = "";
    this.element.querySelector(".import-btn").style.display = "none";
    this.element.querySelector(".field-options-btn").style.display = this
      .hasFieldOptions
      ? ""
      : "none";

    this.element.classList.add("active");
    const firstInput = this.element.querySelector("input");
    if (firstInput) firstInput.focus();
  }

  close() {
    this.element.classList.remove("active");
  }
}

// ============================================================================
// ENTITY SELECTOR - Reusable select + edit button + "add new" for any entity
// ============================================================================

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

    this._buildDOM();
    this.render();
    this._attachEvents();
  }

  _buildDOM() {
    this.container.innerHTML = `
      <label title="${this.label}">
        <svg class="icon"><use href="${this.iconHref}"></use></svg>
      </label>
      <select id="${this.selectId}"></select>
      <button type="button" class="secondary entity-edit-btn" title="Edit">
        <svg class="icon"><use href="#icon-edit"></use></svg>
      </button>`;

    this.selectElement = this.container.querySelector("select");
    this.editBtn = this.container.querySelector(".entity-edit-btn");
  }

  _attachEvents() {
    this.container.addEventListener("change", (e) => {
      if (e.target !== this.selectElement) return;
      const value = e.target.value;
      if (value === "__create_new__") {
        this.modal.openCreate();
        // Reset select to current value
        this._restoreSelection();
      } else {
        this.onSelect(value);
      }
    });

    this.editBtn.addEventListener("click", () => {
      const selectedId = this.selectElement.value;
      if (selectedId && selectedId !== "__create_new__") {
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
      html += `<option value="${item.id}" ${selected}>${escapeHtml(item[this.manager.displayField])}</option>`;
    });
    html += `<option value="__create_new__">${escapeHtml(this.addNewLabel)}</option>`;

    this.selectElement.innerHTML = html;
  }
}
