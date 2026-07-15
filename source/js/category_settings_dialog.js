// ========================
// Category Settings Dialog
// ========================

// Opens the settings dialog for a category, containing renaming, collapsed state, view mode, subcategory position, script assignment via drag and drop, subcategory creation, advanced options and deletion
function open_category_settings(category) {
    const category_scripts = get_scripts_from_category(category);
    const uncategorized_scripts = get_uncategorized_userscripts();

    const html_category_scripts = category_scripts.map(script => build_script_item_html(script.id, script.name)).join("");
    const html_uncategorized_scripts = uncategorized_scripts.map(script => build_script_item_html(script.id, script.name)).join("");
    const uncategorized_name = escape_html(cfg_use['uncategorized_name']);

    const safe_name = escape_html(category.name);
    const safe_custom_class = escape_html(category.custom_class || "");

    const current_depth = get_category_depth(category.id);
    const can_have_subcategories = current_depth < max_category_depth;

    // Category name input
    const html_category_name = `
            <dl>
                <dt>Category Name:</dt>
                <dd><input type="text" id="category-settings-name-input" class="swal-force-visible" maxlength="40" value="${safe_name}"></dd>
            </dl>`;

    // Default collapsed state
    const html_collapsed = `
            <dl>
                <dt>Collapsed by default:</dt>
                <dd>
                    <select id="category-settings-collapsed-select" class="narrow">
                        <option value="no" ${category.collapsed === "no" ? "selected" : ""}>No</option>
                        <option value="yes" ${category.collapsed === "yes" ? "selected" : ""}>Yes</option>
                    </select>
                </dd>
            </dl>`;

    // Category view mode
    const html_view_mode = `
            <dl>
                <dt>View Mode:</dt>
                <dd>
                    <select id="category-settings-viewmode-select" class="narrow">
                        <option value="list" ${category.view_mode === "list" ? "selected" : ""}>List</option>
                        <option value="panel" ${category.view_mode === "panel" ? "selected" : ""}>Panel</option>
                    </select>
                </dd>
            </dl>`;

    // Subcategory position selector
    const html_subcategory_position = can_have_subcategories ? `
            <dl>
                <dt>Subcategory Position:</dt>
                <dd>
                    <select id="category-settings-subposition-select" class="narrow">
                        <option value="default" ${category.subcategory_position === "default" ? "selected" : ""}>Default</option>
                        <option value="above" ${category.subcategory_position === "above" ? "selected" : ""}>Above Scripts</option>
                        <option value="below" ${category.subcategory_position === "below" ? "selected" : ""}>Below Scripts</option>
                    </select>
                </dd>
            </dl>` : "";

    // Script lists
    const html_scripts = `
            <div class="category-settings-scripts">
                <div class="category-settings-scripts-column-container">
                    <div class="category-settings-scripts-column-headline">Scripts in Category</div>
                    <div id="category-settings-category-scripts-list" class="category-settings-script-list">${html_category_scripts}</div>
                </div>
                <div class="category-settings-scripts-column-container">
                    <div class="category-settings-scripts-column-headline">${uncategorized_name}</div>
                    <div id="category-settings-uncategorized-scripts-list" class="category-settings-script-list">${html_uncategorized_scripts}</div>
                </div>
            </div>`;

    // Create subcategory button
    const html_create_subcategory = `
            <div class="category-settings-create-subcategory">
                <input type="button" id="category-settings-create-subcategory-button" value="Create Subcategory" ${can_have_subcategories ? "" : "disabled"}>
            </div>`;

    // Custom classes input
    const html_custom_classes = `
                    <dl>
                        <dt>Custom Classes:</dt>
                        <dd><input type="text" id="category-settings-class-input" class="swal-force-visible" maxlength="30" value="${safe_custom_class}"></dd>
                    </dl>`;

    // Advanced options section
    const html_advanced_options = `
            <div class="category-settings-advanced">
                <div class="category-settings-advanced-toggle">Advanced Options ▾</div>
                <div class="category-settings-advanced-content">
                    ${html_custom_classes}
                    <small class="category-settings-info">This classes are applied to the category container. You can add custom styling for it in the User Scripts Enhanced settings, for example to change the gradient color only for this category.</small>
                    <div class="category-settings-delete">
                        <input type="button" id="category-settings-delete-button" value="Delete Category">
                    </div>
                </div>
            </div>`;

    const html = `
        <div class="category-settings">
            ${html_category_name}
            ${html_collapsed}
            ${html_view_mode}
            ${html_subcategory_position}
            ${html_scripts}
            ${html_create_subcategory}
            ${html_advanced_options}
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
        if (!confirm) {
            destroy_script_sortables();
            return swal.close();
        }

        const success = await save_category_settings(category);
        if (success) {
            destroy_script_sortables();
            swal.close();
        }
    });

    const category_list = document.getElementById("category-settings-category-scripts-list");
    const uncategorized_list = document.getElementById("category-settings-uncategorized-scripts-list");
    initialize_script_sortables([category_list, uncategorized_list]);

    document.querySelector(".category-settings-advanced-toggle").addEventListener("click", event => {
        event.target.nextElementSibling.classList.toggle("expanded");
    });

    document.getElementById("category-settings-delete-button").addEventListener("click", () => {
        destroy_script_sortables();
        request_delete_category(category);
    });

    document.getElementById("category-settings-create-subcategory-button")?.addEventListener("click", () => {
        destroy_script_sortables();
        add_category(category.id);
    });

    document.getElementById("category-settings-class-input").addEventListener("input", event => {
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
    const name_input = document.getElementById("category-settings-name-input");
    const collapsed_select = document.getElementById("category-settings-collapsed-select");
    const viewmode_select = document.getElementById("category-settings-viewmode-select");
    const subposition_select = document.getElementById("category-settings-subposition-select");
    const class_input = document.getElementById("category-settings-class-input");
    const category_list = document.getElementById("category-settings-category-scripts-list");

    const original_name = category.name;
    const new_name = name_input.value.trim();
    const name_changed = new_name !== original_name;

    if (name_changed) {
        const siblings = get_category_siblings(category.id);
        const validated_name = validate_category_name(new_name, siblings, original_name);
        if (!validated_name) 
            return false;
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
    if (subposition_select) 
        category.subcategory_position = subposition_select.value;

    const success = await perform_save();
    if (!success) {
        Object.assign(category, backup);
        return false;
    }

    // The category id never changes on rename, so only the displayed text needs updating, not any data-category attribute
    if (name_changed) {
        const header_text = category_element.querySelector(":scope > .category-header > .category-header-text");
        if (header_text) 
            header_text.textContent = cfg_use['capitalized'] === "yes" ? new_name.toUpperCase() : new_name;
    }

    // Split on whitespace and filter out empty strings, otherwise a class string with multiple consecutive spaces would produce empty entries and classList.add/remove would throw a DOMException
    if (backup.custom_class) 
        category_element.classList.remove(...backup.custom_class.split(" ").filter(Boolean));
    if (new_custom_class) 
        category_element.classList.add(...new_custom_class.split(" ").filter(Boolean));

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
        if (!confirm) 
            return open_category_settings(category);
        delete_category(category);
    });
}
