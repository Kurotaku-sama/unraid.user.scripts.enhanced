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
                    <div id="cs-category-scripts-list" class="category-settings-script-list">${category_scripts_html}</div>
                </div>
                <div class="category-settings-scripts-column">
                    <p>Uncategorized Scripts</p>
                    <div id="cs-uncategorized-scripts-list" class="category-settings-script-list">${uncategorized_scripts_html}</div>
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

    const category_list = document.getElementById("cs-category-scripts-list");
    const uncategorized_list = document.getElementById("cs-uncategorized-scripts-list");
    initialize_script_sortables([category_list, uncategorized_list]);

    document.querySelector(".category-settings-advanced-toggle").addEventListener("click", event => {
        event.target.nextElementSibling.classList.toggle("expanded");
    });

    document.getElementById("cs-delete-button").addEventListener("click", () => {
        destroy_script_sortables();
        request_delete_category(category);
    });

    document.getElementById("cs-add-subcategory-button")?.addEventListener("click", () => {
        destroy_script_sortables();
        add_category(category.id);
    });

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

// Working copy of the entire category tree used exclusively inside the order dialog, nothing is written back to the real tree until the dialog is confirmed
let order_dialog_categories = [];

// Sortable instances currently active inside the order dialog, tracked so they can be destroyed once the dialog closes
let order_sortable_instances = [];

// Opens a drag and drop dialog showing the entire nested category tree at once, categories can be reordered within their level or reparented into a different category, or out to the top level
function open_change_order_dialog() {
    order_dialog_categories = structuredClone(categories);

    const tree_html = build_order_tree_html(order_dialog_categories, 1);
    const html = `
        <div class="category-order-info">You can drag & drop categories to reorder them, or move them into another category to nest them as a subcategory, up to ${max_category_depth} levels deep.</div>
        <div id="category-order-root" class="category-order-list">${tree_html}</div>
    `;

    swal({
        title: "Change Category Order",
        text: html,
        html: true,
        showCancelButton: true,
        confirmButtonText: "Save",
        cancelButtonText: "Cancel",
        closeOnConfirm: false,
        customClass: "swal-responsive-fix category-order-swal",
    }, async function(confirm) {
        if (!confirm) {
            destroy_order_sortables();
            return swal.close();
        }

        const root_list = document.getElementById("category-order-root");
        const category_map = build_category_id_map(order_dialog_categories);
        const new_tree = build_tree_from_order_dom(root_list, category_map);
        const previous_categories_backup = structuredClone(categories);

        categories = new_tree;

        const save_success = await perform_save();
        destroy_order_sortables();

        if (save_success) {
            apply_category_tree_dom_order(categories);
            swal.close();
        } else {
            categories = previous_categories_backup;
        }
    });

    initialize_order_sortables();
    update_order_sublist_visibility();
}

// Recursively builds the nested list markup for the order dialog, every category always gets its own sublist container regardless of depth, so Sortable can move a category back out of it later, the container is only visually hidden inline once the maximum depth is reached, the row itself gets its bottom corners rounded in that case since no sublist will visually attach below it
function build_order_tree_html(list, depth) {
    let html = "";

    for (const category of list) {
        const safe_name = escape_html(category.name);
        const children_html = build_order_tree_html(category.subcategories, depth + 1);
        const at_max_depth = depth >= max_category_depth;
        const sublist_hidden_style = at_max_depth ? 'style="display: none;"' : "";
        const row_radius_style = at_max_depth ? 'style="border-bottom-left-radius: 5px; border-bottom-right-radius: 5px;"' : "";

        html += `
            <div class="category-order-item" data-category="${category.id}">
                <div class="category-order-row" ${row_radius_style}>
                    <span class="category-order-handle">⋮ ⋮</span>
                    <span class="category-order-name">${safe_name}</span>
                </div>
                <div class="category-order-sublist" data-parent="${category.id}" ${sublist_hidden_style}>${children_html}</div>
            </div>
        `;
    }

    return html;
}

// Resyncs the working copy of the tree from the current DOM order after every drop, so subsequent depth checks during the same dialog session are always based on the latest structure, then refreshes which sublists are visually hidden since reparenting may have changed the depth of an entire moved subtree
function order_dialog_on_end() {
    const root_list = document.getElementById("category-order-root");
    const category_map = build_category_id_map(order_dialog_categories);
    order_dialog_categories = build_tree_from_order_dom(root_list, category_map);
    update_order_sublist_visibility();
}

// Recursively sets or removes the inline display none on every sublist container based on its current nesting depth in the DOM, and toggles the matching bottom border radius on its own row, a sublist at or beyond the maximum allowed depth gets hidden with its row rounded on both bottom corners, a sublist below that depth has both inline styles removed again in case they were set before a category got moved back out
function update_order_sublist_visibility(list_element = document.getElementById("category-order-root"), depth = 1) {
    for (const item of list_element.querySelectorAll(":scope > .category-order-item")) {
        const sublist = item.querySelector(":scope > .category-order-sublist");
        const row = item.querySelector(":scope > .category-order-row");
        if (!sublist || !row) continue;

        const at_max_depth = depth >= max_category_depth;

        if (at_max_depth) {
            sublist.style.display = "none";
            row.style.borderBottomLeftRadius = "5px";
            row.style.borderBottomRightRadius = "5px";
        } else {
            sublist.style.removeProperty("display");
            row.style.removeProperty("border-bottom-left-radius");
            row.style.removeProperty("border-bottom-right-radius");
        }

        update_order_sublist_visibility(sublist, depth + 1);
    }
}

// Creates one Sortable instance per list in the order dialog (the root list plus every category's own sublist), all sharing the same group so items can be dragged across levels, dragging is enabled on the entire row rather than a small handle only
function initialize_order_sortables() {
    order_sortable_instances = [];

    document.querySelectorAll(".category-order-list, .category-order-sublist").forEach(list_element => {
        const instance = new Sortable(list_element, {
            group: "category-order",
            handle: ".category-order-row",
            animation: 150,
            forceFallback: true,
            fallbackOnBody: true,
            swapThreshold: 0.65,
            onMove: order_dialog_on_move,
            onEnd: order_dialog_on_end
        });
        order_sortable_instances.push(instance);
    });
}

// Destroys every active Sortable instance from the order dialog, called once the dialog is closed to avoid leaking instances bound to removed elements
function destroy_order_sortables() {
    order_sortable_instances.forEach(instance => instance.destroy());
    order_sortable_instances = [];
}

// Blocks a drag operation from landing on an invalid target, either because it would nest a category inside one of its own descendants, or because it would push its deepest subcategory beyond max_category_depth
function order_dialog_on_move(event) {
    const dragged_item = event.dragged;
    const target_list = event.to;

    if (dragged_item.contains(target_list)) return false;

    const target_depth = get_order_list_depth(target_list);
    const dragged_category = find_category_by_id(dragged_item.dataset.category, order_dialog_categories);
    if (!dragged_category) return false;

    const subtree_relative_depth = get_subtree_relative_depth(dragged_category);

    return (target_depth + subtree_relative_depth) <= max_category_depth;
}

// Determines the depth a category would end up at if placed directly inside the given order dialog list element, the root list is depth 1
function get_order_list_depth(list_element) {
    let depth = 1;
    let ancestor_item = list_element.closest(".category-order-item");

    while (ancestor_item) {
        depth++;
        ancestor_item = ancestor_item.parentElement.closest(".category-order-item");
    }

    return depth;
}

// Recursively rebuilds the category tree from the current DOM order of the order dialog, reusing the full category objects from the id map so no data is lost, only order and parent relationships change
function build_tree_from_order_dom(list_element, category_map) {
    const result = [];
    let order = 1;

    for (const item of list_element.querySelectorAll(":scope > .category-order-item")) {
        const category = category_map.get(item.dataset.category);
        if (!category) continue;

        const sublist = item.querySelector(":scope > .category-order-sublist");
        category.order = order++;
        category.subcategories = sublist ? build_tree_from_order_dom(sublist, category_map) : [];

        result.push(category);
    }

    return result;
}

// Relocates every existing category element to match the saved tree structure by moving the elements themselves rather than recreating them, this preserves script rows and any other content already rendered inside, only position and parent container change
function apply_category_tree_dom_order(list, parent_id = null) {
    const container = parent_id
        ? get_category_element(parent_id).querySelector(":scope > .category-content > .category-subcategories")
        : document.getElementById("categories-container");

    const uncategorized = parent_id ? null : container.querySelector(":scope > .category[data-category='uncategorized']");

    list.forEach(category => {
        const category_element = get_category_element(category.id);
        if (!category_element) return;

        category_element.dataset.order = category.order;

        if (parent_id)
            container.appendChild(category_element);
        else
            uncategorized
                ? container.insertBefore(category_element, uncategorized)
                : container.appendChild(category_element);

        apply_category_tree_dom_order(category.subcategories, category.id);
    });
}