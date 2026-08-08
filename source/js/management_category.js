// ========================
// Category Management
// ========================

// Renders a category element, recursively rendering its subcategories afterward, parent_id is null for top level categories
function create_category(category, parent_id = null) {
    // HTML in names can be explicitly allowed via the plugin settings, the name is otherwise escaped before being rendered into the header
    const safe_name = cfg_use['disabled_limits'].includes("render_html_in_category_names") ? category.name : escape_html(category.name);
    const style_attr = category.expanded !== "yes" ? 'style="max-height: 0px;"' : "";
    // Re-sanitizes the custom class on every render instead of trusting the stored value, categories.json can be manually edited or affected by a corrupted schema, sanitize_category_classes strips anything that is not a valid CSS class character
    const custom_class = sanitize_category_classes(category.custom_class || "");
    const effective_view_mode = resolve_effective_view_mode(category.view_mode);
    const view_mode_classes = compute_view_mode_classes(effective_view_mode).join(" ");

    const html_subcategories = `<div class="category-subcategories"></div>`;
    const html_scripts = `<div class="category-scripts ${view_mode_classes}"></div>`;

    // The subcategories container is placed above or below the category's own scripts container based on the resolved subcategory position
    const content_inner_html = resolve_subcategory_position(category) === "below"
        ? `${html_scripts}${html_subcategories}`
        : `${html_subcategories}${html_scripts}`;

    const html = `
        <div class="category ${category.expanded === "yes" ? "expanded" : ""} ${custom_class}" data-category="${category.id}" data-order="${category.order}">
            <div class="category-header">
                <span class="category-header-text">${cfg_use['capitalized'] === "yes" ? safe_name.toUpperCase() : safe_name}</span>
                <i class="fa fa-cog category-settings-cog" data-category="${category.id}"></i>
            </div>
            <div class="category-content" ${style_attr}>
                ${content_inner_html}
            </div>
        </div>`;

    let category_element;

    if (parent_id) {
        // Nested category, append it inside its parent's own subcategories container instead of the top level categories container
        const parent_element = get_category_element(parent_id);
        const parent_subcategories_container = parent_element.querySelector(":scope > .category-content > .category-subcategories");
        parent_subcategories_container.insertAdjacentHTML("beforeend", html.trim());
        category_element = parent_subcategories_container.lastElementChild;
    } else {
        // Top level category, always keep it above the fixed "uncategorized" section which must stay the last entry in the container
        const category_container = document.getElementById("categories-container");
        const uncategorized = category_container.querySelector(":scope > .category[data-category='uncategorized']");

        if (uncategorized) {
            uncategorized.insertAdjacentHTML("beforebegin", html.trim());
            category_element = uncategorized.previousElementSibling;
        } else {
            category_container.insertAdjacentHTML("beforeend", html.trim());
            category_element = category_container.lastElementChild;
        }
    }

    // Register the newly created element in the cache so later lookups by id are O(1) instead of scanning the DOM
    category_element_cache.set(category.id, category_element);

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
    } else
        sibling_list = categories;

    // The character limit on the input field can be disabled via the plugin settings, omitting the attribute entirely removes the restriction
    const input_attributes = cfg_use['disabled_limits'].includes("category_name_length") ? {} : { maxlength: "40" };

    swal({
        title: "Add New Category",
        text: "Enter a name for the new category:",
        type: "input",
        inputValue: "",
        inputPlaceHolder: "Category Name",
        showCancelButton: true,
        closeOnConfirm: false,
        inputAttributes: input_attributes
    }, async function (input) {
        if (input === false || input === null) {
            swal.close();
            return;
        }

        const category_name = validate_category_name(input, sibling_list);
        if (!category_name)
            return false;

        let new_category = {
            id: generate_unique_category_id(),
            name: category_name,
            order: sibling_list.length + 1,
            view_mode: cfg_use['default_view_mode'],
            expanded: cfg_use['default_expanded'],
            custom_class: "",
            subcategory_position: "default",
            scripts: [],
            subcategories: []
        };

        // Push into the in memory tree and persist first, only render the new element in the DOM once the save actually succeeded, otherwise roll back the in memory change
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
// The in memory tree is mutated and persisted first, DOM changes only happen once the save is confirmed, on failure every in memory change is rolled back so the tree and the DOM never diverge from the server
// Returns true on success and false on failure instead of closing the confirmation dialog itself, the caller decides when it is safe to close it, mirroring save_category_settings
async function delete_category(category) {
    // Collects every nested subcategory at any depth below this one, since they all get deleted along with their parent and none of their scripts should be silently lost
    const subcategories = flatten_subcategories(category);

    // Find the array that directly contains this category, either the top level list or a parent's subcategories array
    const siblings = get_category_siblings(category.id);
    if (!siblings) return false;

    // Locate the category's own position inside that array
    const index = siblings.findIndex(cat => cat.id === category.id);
    if (index === -1) return false;

    // Snapshot every field this operation touches before mutating it, so it can be fully restored if the server rejects the save
    const scripts_backup = category.scripts;
    const subcategory_scripts_backup = subcategories.map(subcategory => subcategory.scripts);

    // Clear the scripts of the category itself and every nested subcategory in memory first, the actual DOM row relocation only happens after the save is confirmed
    category.scripts = [];
    subcategories.forEach(subcategory => (subcategory.scripts = []));

    // Remove the category from the tree and renumber the remaining siblings so order stays sequential
    siblings.splice(index, 1);
    siblings.forEach((cat, i) => (cat.order = i + 1));

    const success = await perform_save();
    if (!success) {
        // Roll back every in memory change since the server rejected the save, restores scripts, tree position and order
        category.scripts = scripts_backup;
        subcategories.forEach((subcategory, i) => (subcategory.scripts = subcategory_scripts_backup[i]));
        siblings.splice(index, 0, category);
        siblings.forEach((cat, i) => (cat.order = i + 1));
        return false;
    }

    // Only touch the DOM after the deletion was actually persisted, moves the now unassigned scripts back to uncategorized
    organize_userscripts_category(category);
    subcategories.forEach(subcategory => organize_userscripts_category(subcategory));

    // Removes the category element and every nested subcategory element along with it, since subcategory DOM elements live inside the parent's own container
    get_category_element(category.id)?.remove();

    // Remove the category and every nested subcategory from the element cache, their DOM elements no longer exist
    category_element_cache.delete(category.id);
    subcategories.forEach(subcategory => category_element_cache.delete(subcategory.id));

    update_uncategorized_visibility();
    return true;
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