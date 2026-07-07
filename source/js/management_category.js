// ========================
// Category Management
// ========================

function create_category(category) {
    const category_container = document.getElementById("categories-container");

    // Escaped safe_name
    const safe_name = escape_html(category.name);

    // Determine style attribute
    const style_attr = category.collapsed === "yes" ? 'style="max-height: 0px;"' : "";

    // Custom class applied to the category container, already sanitized on save
    const custom_class = category.custom_class || "";

    // Determine optional view classes
    const extra_classes = [
        (category.view_mode === "list" && cfg_use['list_view_separators'] === "yes") ? "vo-separator" : "",
        (category.view_mode && cfg_use['view_mode_highlighting'].includes(category.view_mode)) ? "vo-highlight" : ""
    ].filter(Boolean).join(" ");

    const html = `
        <div class="category ${category.collapsed === "yes" ? "collapsed" : ""} ${custom_class}" data-category="${safe_name}" data-order="${category.order}">
            <div class="category-header">
                <span class="category-header-text">${cfg_use['capitalized'] === "yes" ? safe_name.toUpperCase() : safe_name}</span>
                <i class="fa fa-cog category-settings-cog" data-category="${safe_name}"></i>
            </div>
            <div class="category-content" ${style_attr}>
                <div class="category-subcategories"></div>
                <div class="category-scripts vm-${category.view_mode} ${extra_classes}"></div>
            </div>
        </div>`;

    const uncategorized = category_container.querySelector(".category[data-category='uncategorized']");
    uncategorized
        ? uncategorized.insertAdjacentHTML("beforebegin", html)
        : category_container.insertAdjacentHTML("beforeend", html);

    initialize_category_controls(category);
}

function initialize_category_controls(category) {
    const element = get_category_element(category.name);
    const header = element.querySelector(".category-header");
    const settings_cog = element.querySelector(".category-settings-cog");

    header.addEventListener("click", toggle_category_visibility);

    // Prevent the collapse toggle from firing when the cog itself is clicked
    settings_cog.addEventListener("click", event => {
        event.stopPropagation();
        open_category_settings(category);
    });

    organize_userscripts_category(category);
}

function add_category() {
    swal({
        title: "Add New Category",
        text: "Enter a name for the new category:",
        type: "input",
        inputValue: "",
        inputPlaceHolder: "Category Name",
        showCancelButton: true,
        closeOnConfirm: false,
        inputAttributes: {
            maxlength: "40"
        }
    }, async function (input) {
        if (input === false || input === null) {
            swal.close();
            return;
        }

        let category_name = validate_category_name(input);
        if (!category_name) return false;

        let new_category = {
            name: category_name,
            order: categories.length + 1,
            view_mode: cfg_use['default_view_mode'],
            collapsed: cfg_use['default_collapsed'],
            custom_class: "",
            scripts: []
        };

        categories.push(new_category);
        const success = await perform_save(categories);
        if (success) {
            create_category(new_category);
            swal.close();
        }
        else
            categories.pop();
    });
}

function delete_category(category) {
    // Clear scripts array to trigger moving scripts back to uncategorized
    category.scripts = [];

    // Reorganize scripts (will move them to uncategorized)
    organize_userscripts_category(category);

    // Remove category from the categories array
    categories = categories.filter(cat => cat.name !== category.name);

    // Update order of remaining categories
    categories.forEach((cat, index) => (cat.order = index + 1));

    // Safely remove category element from DOM if it exists
    get_category_element(category.name)?.remove();

    // Update UI states
    update_uncategorized_visibility();
    perform_save();
    swal.close();
}

function update_uncategorized_visibility() {
    // Initialize uncategorized_category only once (if not already cached)
    if (!uncategorized_category) {
        uncategorized_category = content.querySelector(".category[data-category='uncategorized']");
        if (!uncategorized_category)
            return;
    }

    const has_scripts = uncategorized_category.querySelectorAll(".category-scripts tr").length > 0;

    // Toggle visibility: show if scripts exist, hide otherwise
    if (!has_scripts && !uncategorized_category.classList.contains("uncategorized_empty"))
        uncategorized_category.classList.add("uncategorized_empty");
    else if (has_scripts && uncategorized_category.classList.contains("uncategorized_empty"))
        uncategorized_category.classList.remove("uncategorized_empty");
}

// ========================
// Category Settings Dialog
// ========================

// Opens the settings dialog for a category, containing renaming, collapsed state, view mode, script assignment via drag and drop, advanced options and deletion
function open_category_settings(category) {
    const category_scripts = get_scripts_from_category(category);
    const uncategorized_scripts = get_uncategorized_userscripts();

    const category_scripts_html = category_scripts.map(script => build_script_item_html(script.id, script.name)).join("");
    const uncategorized_scripts_html = uncategorized_scripts.map(script => build_script_item_html(script.id, script.name)).join("");

    const safe_name = escape_html(category.name);
    const safe_custom_class = escape_html(category.custom_class || "");

    const html = `
        <div class="category-settings">
            <dl>
                <dt>Category Name:</dt>
                <dd><input type="text" id="cs-name-input" class="swal-force-visible" maxlength="40" value="${safe_name}"></dd>
            </dl>
            <dl>
                <dt>Collapsed by default:</dt>
                <dd>
                    <select id="cs-collapsed-select" class="narrow">
                        <option value="no" ${category.collapsed === "no" ? "selected" : ""}>No</option>
                        <option value="yes" ${category.collapsed === "yes" ? "selected" : ""}>Yes</option>
                    </select>
                </dd>
            </dl>
            <dl>
                <dt>View Mode:</dt>
                <dd>
                    <select id="cs-viewmode-select" class="narrow">
                        <option value="list" ${category.view_mode === "list" ? "selected" : ""}>List</option>
                        <option value="panel" ${category.view_mode === "panel" ? "selected" : ""}>Panel</option>
                    </select>
                </dd>
            </dl>
            <div class="category-settings-scripts">
                <div class="category-settings-scripts-column">
                    <p>Scripts in Category</p>
                    <ul id="cs-category-scripts-list" class="category-settings-script-list">${category_scripts_html}</ul>
                </div>
                <div class="category-settings-scripts-column">
                    <p>Uncategorized Scripts</p>
                    <ul id="cs-uncategorized-scripts-list" class="category-settings-script-list">${uncategorized_scripts_html}</ul>
                </div>
            </div>
            <div class="category-settings-advanced">
                <div class="category-settings-advanced-toggle">Advanced Options ▾</div>
                <div class="category-settings-advanced-content">
                    <dl>
                        <dt>Custom Classes:</dt>
                        <dd><input type="text" id="cs-class-input" class="swal-force-visible" maxlength="30" value="${safe_custom_class}"></dd>
                    </dl>
                    <small class="category-settings-info">This classes are applied to the category container. You can add custom styling for it in the User Scripts Enhanced settings, for example to change the gradient color only for this category.</small>
                </div>
            </div>
            <div class="category-settings-delete">
                <input type="button" id="cs-delete-button" value="Delete Category">
            </div>
        </div>
    `;

    swal({
        title: "Category Settings",
        text: html,
        html: true,
        showCancelButton: true,
        confirmButtonText: "Save",
        cancelButtonText: "Cancel",
        closeOnConfirm: false,
        customClass: "swal-responsive-fix category-settings-swal"
    }, async function (confirm) {
        if (!confirm) return swal.close();

        const success = await save_category_settings(category);
        if (success) swal.close();
    });

    const category_list = document.getElementById("cs-category-scripts-list");
    const uncategorized_list = document.getElementById("cs-uncategorized-scripts-list");
    attach_script_drag_events([category_list, uncategorized_list]);

    document.querySelector(".category-settings-advanced-toggle").addEventListener("click", event => {
        event.target.nextElementSibling.classList.toggle("expanded");
    });

    document.getElementById("cs-delete-button").addEventListener("click", () => request_delete_category(category));

    document.getElementById("cs-class-input").addEventListener("input", event => {
        const cursor_position = event.target.selectionStart;
        const original_length = event.target.value.length;
        event.target.value = sanitize_category_classes(event.target.value);
        const new_length = event.target.value.length;
        const new_cursor_position = cursor_position - (original_length - new_length);
        event.target.setSelectionRange(new_cursor_position, new_cursor_position);
    });
}

// Applies all changes made in the category settings dialog, reverts them if saving fails
async function save_category_settings(category) {
    const name_input = document.getElementById("cs-name-input");
    const collapsed_select = document.getElementById("cs-collapsed-select");
    const viewmode_select = document.getElementById("cs-viewmode-select");
    const class_input = document.getElementById("cs-class-input");
    const category_list = document.getElementById("cs-category-scripts-list");

    const original_name = category.name;
    const new_name = name_input.value.trim();
    const name_changed = new_name !== original_name;

    if (name_changed) {
        const validated_name = validate_category_name(new_name, original_name);
        if (!validated_name) return false;
    }

    const category_element = get_category_element(original_name);
    const new_scripts = [...category_list.querySelectorAll(".category-settings-script-item")].map(item => item.dataset.scriptId);
    const new_custom_class = sanitize_category_classes(class_input.value);

    // Backup current values in case the save request fails and needs to be reverted
    const backup = {
        name: category.name,
        collapsed: category.collapsed,
        view_mode: category.view_mode,
        scripts: [...category.scripts],
        custom_class: category.custom_class
    };

    category.name = new_name;
    category.collapsed = collapsed_select.value;
    category.view_mode = viewmode_select.value;
    category.scripts = new_scripts;
    category.custom_class = new_custom_class;

    const success = await perform_save();
    if (!success) {
        Object.assign(category, backup);
        return false;
    }

    if (name_changed) {
        get_elements_by_category(original_name).forEach(element => element.setAttribute("data-category", new_name));
        const header_text = category_element.querySelector(".category-header-text");
        if (header_text) header_text.textContent = cfg_use['capitalized'] === "yes" ? new_name.toUpperCase() : new_name;
    }

    if (backup.custom_class) category_element.classList.remove(...backup.custom_class.split(" "));
    if (new_custom_class) category_element.classList.add(...new_custom_class.split(" "));

    apply_collapsed_state(category);
    apply_view_mode(category);
    organize_userscripts_category(category);
    update_uncategorized_visibility();

    return true;
}

// Opens a confirmation dialog before deleting a category, reopens the settings dialog if the deletion is canceled
function request_delete_category(category) {
    swal({
        title: "Are you sure?",
        text: `Do you really want to delete the category "${escape_html(category.name)}"?<br>This action cannot be undone!`,
        html: true,
        type: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No",
        dangerMode: true
    }, function (confirm) {
        if (!confirm) return open_category_settings(category);
        delete_category(category);
    });
}

// ========================
// Category Order Dialog
// ========================

// Opens a drag and drop dialog that lets the user rearrange the order of all categories at once, replacing the old move up/down buttons
function open_change_order_dialog() {
    let order_items_html = "";
    for (const category of [...categories].sort((a, b) => a.order - b.order))
        order_items_html += build_order_item_html(category.name);

    const html = `<ul id="category-order-list" class="category-order-list">${order_items_html}</ul>`;

    swal({
        title: "Change Category Order",
        text: html,
        html: true,
        showCancelButton: true,
        confirmButtonText: "Save",
        cancelButtonText: "Cancel",
        closeOnConfirm: false,
        customClass: "swal-responsive-fix",
    }, async function(confirm) {
        if (!confirm) return swal.close();

        const order_list = document.getElementById("category-order-list");
        const new_order = [];
        for (const item of order_list.querySelectorAll(".category-order-item"))
            new_order.push(item.dataset.category);

        for (const category_name of new_order) {
            const category = categories.find(cat => cat.name === category_name);
            if (category)
                category.order = new_order.indexOf(category_name) + 1;
        }

        categories.sort((a, b) => a.order - b.order);

        const save_success = await perform_save();
        if (save_success) {
            reorder_category_elements();
            swal.close();
        }
    });

    attach_order_drag_events();
}

// Builds a single draggable list item representing one category inside the change order dialog
function build_order_item_html(category_name) {
    const safe_name = escape_html(category_name);
    return `<li class="category-order-item" draggable="true" data-category="${safe_name}"><span class="category-order-handle">⋮⋮</span>${safe_name}</li>`;
}

// Moves every category element in the DOM to match the current order property, called after the change order dialog is confirmed
function reorder_category_elements() {
    const category_container = document.getElementById("categories-container");
    const uncategorized = category_container.querySelector(".category[data-category='uncategorized']");

    for (const category of categories) {
        const category_element = get_category_element(category.name);
        if (category_element)
            category_container.insertBefore(category_element, uncategorized);
    }
}

// Native HTML5 drag and drop reordering for the category order list inside the swal dialog
function attach_order_drag_events() {
    const order_list = document.getElementById("category-order-list");
    if (!order_list) return;

    let dragged_item = null;

    for (const item of order_list.querySelectorAll(".category-order-item"))
        bind_order_item_events(item);

    order_list.addEventListener("dragover", event => {
        event.preventDefault();
        if (!dragged_item) return;

        // If the cursor is over a gap between items, determine the nearest item based on the Y position instead of appending it to the end
        const items = [...order_list.querySelectorAll(".category-order-item")].filter(item => item !== dragged_item);
        let closest_item = null;
        let closest_offset = Number.NEGATIVE_INFINITY;

        for (const item of items) {
            const rect = item.getBoundingClientRect();
            const offset = event.clientY - rect.top - (rect.height / 2);
            if (offset < 0 && offset > closest_offset) {
                closest_offset = offset;
                closest_item = item;
            }
        }

        closest_item
            ? order_list.insertBefore(dragged_item, closest_item)
            : order_list.appendChild(dragged_item);
    });

    function bind_order_item_events(item) {
        item.addEventListener("dragstart", () => {
            dragged_item = item;
            item.classList.add("category-order-dragging");
        });

        item.addEventListener("dragend", () => {
            item.classList.remove("category-order-dragging");
            dragged_item = null;
        });
    }
}