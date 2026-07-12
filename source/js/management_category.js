// ========================
// Category Management
// ========================

// Renders a category element, recursively rendering its subcategories afterward, parent_id is null for top level categories
function create_category(category, parent_id = null) {
    const safe_name = escape_html(category.name);
    const style_attr = category.collapsed === "yes" ? 'style="max-height: 0px;"' : "";
    const custom_class = category.custom_class || "";
    const effective_view_mode = resolve_effective_view_mode(category.view_mode);
    const view_mode_classes = compute_view_mode_classes(effective_view_mode).join(" ");

    const subcategories_html = `<div class="category-subcategories"></div>`;
    const scripts_html = `<div class="category-scripts ${view_mode_classes}"></div>`;

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
    // Clear the scripts of the category itself, this moves its scripts back to uncategorized
    category.scripts = [];
    organize_userscripts_category(category);

    // Do the same for every nested subcategory at any depth, so no script silently disappears when its parent category gets deleted
    flatten_subcategories(category).forEach(subcategory => {
        subcategory.scripts = [];
        organize_userscripts_category(subcategory);
    });

    // Find the array that directly contains this category, either the top level list or a parent's subcategories array
    const siblings = get_category_siblings(category.id);
    if (!siblings) return;

    // Locate the category's own position inside that array
    const index = siblings.findIndex(cat => cat.id === category.id);
    if (index === -1) return;

    // Remove the category from the tree and renumber the remaining siblings so order stays sequential
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