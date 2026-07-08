// ========================
// Category Management
// ========================

// Renders a category element, recursively rendering its subcategories afterward, parent_id is null for top level categories
function create_category(category, parent_id = null) {
    const safe_name = escape_html(category.name);
    const style_attr = category.collapsed === "yes" ? 'style="max-height: 0px;"' : "";
    const custom_class = category.custom_class || "";

    const extra_classes = [
        (category.view_mode === "list" && cfg_use['list_view_separators'] === "yes") ? "vo-separator" : "",
        (category.view_mode && cfg_use['view_mode_highlighting'].includes(category.view_mode)) ? "vo-highlight" : ""
    ].filter(Boolean).join(" ");

    const subcategories_html = `<div class="category-subcategories"></div>`;
    const scripts_html = `<div class="category-scripts vm-${category.view_mode} ${extra_classes}"></div>`;

    // The subcategories container is placed above or below the category's own scripts container based on the resolved subcategory position
    const content_inner_html = resolve_subcategory_position(category) === "below"
        ? `${scripts_html}${subcategories_html}`
        : `${subcategories_html}${scripts_html}`;

    const html = `
        <div class="category ${category.collapsed === "yes" ? "collapsed" : ""} ${custom_class}" data-category="${category.id}" data-order="${category.order}">
            <div class="category-header">
                <span class="category-header-text">${cfg_use['capitalized'] === "yes" ? safe_name.toUpperCase() : safe_name}</span>
                <i class="fa fa-cog category-settings-cog" data-category="${category.id}"></i>
            </div>
            <div class="category-content" ${style_attr}>
                ${content_inner_html}
            </div>
        </div>`;

    if (parent_id) {
        const parent_element = get_category_element(parent_id);
        const parent_subcategories_container = parent_element.querySelector(":scope > .category-content > .category-subcategories");
        parent_subcategories_container.insertAdjacentHTML("beforeend", html.trim());
    } else {
        const category_container = document.getElementById("categories-container");
        const uncategorized = category_container.querySelector(":scope > .category[data-category='uncategorized']");
        uncategorized
            ? uncategorized.insertAdjacentHTML("beforebegin", html.trim())
            : category_container.insertAdjacentHTML("beforeend", html.trim());
    }

    initialize_category_controls(category);

    // Recursively render already existing subcategories, e.g. right after loading from storage
    category.subcategories.forEach(subcategory => create_category(subcategory, category.id));
}

function initialize_category_controls(category) {
    const element = get_category_element(category.id);
    const header = element.querySelector(":scope > .category-header");
    const settings_cog = element.querySelector(":scope > .category-header > .category-settings-cog");

    header.addEventListener("click", toggle_category_visibility);

    // Prevent the collapse toggle from firing when the cog itself is clicked
    settings_cog.addEventListener("click", event => {
        event.stopPropagation();
        open_category_settings(category);
    });

    organize_userscripts_category(category);
}

// Adds a new category, if parent_id is provided the new category is added as a subcategory of that category instead of at the top level
function add_category(parent_id = null) {
    let sibling_list;

    if (parent_id) {
        const parent_category = find_category_by_id(parent_id);
        if (!parent_category) return;

        const parent_depth = get_category_depth(parent_id);
        if (parent_depth >= max_category_depth) return; // Safety guard, the UI already hides this option at max depth

        sibling_list = parent_category.subcategories;
    } else {
        sibling_list = categories;
    }

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

        let category_name = validate_category_name(input, sibling_list);
        if (!category_name) return false;

        let new_category = {
            id: generate_unique_category_id(),
            name: category_name,
            order: sibling_list.length + 1,
            view_mode: cfg_use['default_view_mode'],
            collapsed: cfg_use['default_collapsed'],
            custom_class: "",
            subcategory_position: "default",
            scripts: [],
            subcategories: []
        };

        sibling_list.push(new_category);
        const success = await perform_save(categories);
        if (success) {
            create_category(new_category, parent_id);
            swal.close();
        }
        else
            sibling_list.pop();
    });
}

// Deletes a category, cascading into every nested subcategory, all affected scripts are moved back to the top level uncategorized section
function delete_category(category) {
    category.scripts = [];
    organize_userscripts_category(category);

    flatten_subcategories(category).forEach(subcategory => {
        subcategory.scripts = [];
        organize_userscripts_category(subcategory);
    });

    const siblings = get_category_siblings(category.id);
    if (!siblings) return;

    const index = siblings.findIndex(cat => cat.id === category.id);
    if (index === -1) return;

    siblings.splice(index, 1);
    siblings.forEach((cat, i) => (cat.order = i + 1));

    // Removes the category element and every nested subcategory element along with it
    get_category_element(category.id)?.remove();

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

// Opens the settings dialog for a category, containing renaming, collapsed state, view mode, subcategory position, script assignment via drag and drop, subcategory creation, advanced options and deletion
function open_category_settings(category) {
    const category_scripts = get_scripts_from_category(category);
    const uncategorized_scripts = get_uncategorized_userscripts();

    const category_scripts_html = category_scripts.map(script => build_script_item_html(script.id, script.name)).join("");
    const uncategorized_scripts_html = uncategorized_scripts.map(script => build_script_item_html(script.id, script.name)).join("");

    const safe_name = escape_html(category.name);
    const safe_custom_class = escape_html(category.custom_class || "");

    const current_depth = get_category_depth(category.id);
    const can_have_subcategories = current_depth < max_category_depth;

    // The subcategory position option is only meaningful, and therefore only shown, when this category is still allowed to have subcategories
    const subcategory_position_html = can_have_subcategories ? `
            <dl>
                <dt>Subcategory Position:</dt>
                <dd>
                    <select id="cs-subposition-select" class="narrow">
                        <option value="default" ${category.subcategory_position === "default" ? "selected" : ""}>Default</option>
                        <option value="above" ${category.subcategory_position === "above" ? "selected" : ""}>Above Scripts</option>
                        <option value="below" ${category.subcategory_position === "below" ? "selected" : ""}>Below Scripts</option>
                    </select>
                </dd>
            </dl>` : "";

    const add_subcategory_html = `
            <div class="category-settings-add-subcategory">
                <input type="button" id="cs-add-subcategory-button" value="Add Subcategory" ${can_have_subcategories ? "" : "disabled"}>
            </div>`;

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
            ${subcategory_position_html}
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
            ${add_subcategory_html}
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

    document.getElementById("cs-add-subcategory-button")?.addEventListener("click", () => add_category(category.id));

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
    const subposition_select = document.getElementById("cs-subposition-select");
    const class_input = document.getElementById("cs-class-input");
    const category_list = document.getElementById("cs-category-scripts-list");

    const original_name = category.name;
    const new_name = name_input.value.trim();
    const name_changed = new_name !== original_name;

    if (name_changed) {
        const siblings = get_category_siblings(category.id);
        const validated_name = validate_category_name(new_name, siblings, original_name);
        if (!validated_name) return false;
    }

    const category_element = get_category_element(category.id);
    const new_scripts = [...category_list.querySelectorAll(".category-settings-script-item")].map(item => item.dataset.scriptId);
    const new_custom_class = sanitize_category_classes(class_input.value);

    // Backup current values in case the save request fails and needs to be reverted
    const backup = {
        name: category.name,
        collapsed: category.collapsed,
        view_mode: category.view_mode,
        subcategory_position: category.subcategory_position,
        scripts: [...category.scripts],
        custom_class: category.custom_class
    };

    category.name = new_name;
    category.collapsed = collapsed_select.value;
    category.view_mode = viewmode_select.value;
    category.scripts = new_scripts;
    category.custom_class = new_custom_class;
    if (subposition_select) category.subcategory_position = subposition_select.value;

    const success = await perform_save();
    if (!success) {
        Object.assign(category, backup);
        return false;
    }

    // The category id never changes on rename, so only the displayed text needs updating, not any data-category attribute
    if (name_changed) {
        const header_text = category_element.querySelector(":scope > .category-header > .category-header-text");
        if (header_text) header_text.textContent = cfg_use['capitalized'] === "yes" ? new_name.toUpperCase() : new_name;
    }

    if (backup.custom_class) category_element.classList.remove(...backup.custom_class.split(" "));
    if (new_custom_class) category_element.classList.add(...new_custom_class.split(" "));

    apply_collapsed_state(category);
    apply_view_mode(category);
    apply_subcategory_position(category);
    organize_userscripts_category(category);
    update_uncategorized_visibility();

    return true;
}

// Opens a confirmation dialog before deleting a category, reopens the settings dialog if the deletion is canceled
function request_delete_category(category) {
    swal({
        title: "Are you sure?",
        text: `Do you really want to delete the category "${escape_html(category.name)}"?<br>This will also delete all its subcategories.<br>This action cannot be undone!`,
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

// Opens a drag and drop dialog that lets the user rearrange the order of all top level categories at once, replacing the old move up/down buttons
function open_change_order_dialog() {
    let order_items_html = "";
    for (const category of [...categories].sort((a, b) => a.order - b.order))
        order_items_html += build_order_item_html(category);

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

        for (const category_id of new_order) {
            const category = categories.find(cat => cat.id === category_id);
            if (category)
                category.order = new_order.indexOf(category_id) + 1;
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

// Builds a single draggable list item representing one top level category inside the change order dialog
function build_order_item_html(category) {
    const safe_name = escape_html(category.name);
    return `<li class="category-order-item" draggable="true" data-category="${category.id}"><span class="category-order-handle">⋮⋮</span>${safe_name}</li>`;
}

// Moves every top level category element in the DOM to match the current order property, called after the change order dialog is confirmed
function reorder_category_elements() {
    const category_container = document.getElementById("categories-container");
    const uncategorized = category_container.querySelector(".category[data-category='uncategorized']");

    for (const category of categories) {
        const category_element = get_category_element(category.id);
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