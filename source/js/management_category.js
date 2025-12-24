// ========================
// Category Management
// ========================

function create_category(category) {
    const category_container = document.getElementById("categories-container");

    // Determine style attribute
    const style_attr = category.collapsed === "yes" ? 'style="max-height: 0px;"' : "";

    // Determine optional view classes
    const extra_classes = [
        (category.view_mode === "list" && cfg_list_view_separators === "yes") ? "vo-separator" : "",
        (category.view_mode && cfg_view_mode_highlighting.includes(category.view_mode)) ? "vo-highlight" : ""
    ].filter(Boolean).join(" ");

    const html = `
        <div class="category ${category.collapsed === "yes" ? "collapsed" : ""}" data-category="${category.name}" data-order="${category.order}">
            <div class="category-header">${cfg_capitalized === "yes" ? category.name.toUpperCase() : category.name}</div>
            <div class="category-content vm-${category.view_mode} ${extra_classes}" ${style_attr}>
                <div class="category-controls">
                    <input type="button" class="ctrl-manage-scripts" data-category="${category.name}" value="Manage Scripts">
                    <input type="button" class="ctrl-rename-category" data-category="${category.name}" value="Rename">
                    <input type="button" class="ctrl-collapse-toggle" data-category="${category.name}" value="Collapsed: ${category.collapsed}">
                    <input type="button" class="ctrl-view-mode-toggle" data-category="${category.name}" value="View: ${category.view_mode === "list" ? "List" : "Panel"}">
                    <input type="button" class="ctrl-move-up" data-category="${category.name}" value="↑" ${category.order === 1 ? "disabled" : ""}>
                    <input type="button" class="ctrl-move-down" data-category="${category.name}" value="↓" ${category.order === categories.length ? "disabled" : ""}>
                    <input type="button" class="ctrl-delete-category" data-category="${category.name}" value="Delete">
                </div>
                <div class="category-scripts"></div>
            </div>
        </div>`;

    const uncategorized = category_container.querySelector(".category[data-category='uncategorized']");
    uncategorized
        ? uncategorized.insertAdjacentHTML("beforebegin", html)
        : category_container.insertAdjacentHTML("beforeend", html);

    initialize_category_controls(category);
}

function initialize_category_controls(category) {
    const element = content.querySelector(`.category[data-category="${category.name}"]`);
    const header = element.querySelector(".category-header");

    header.addEventListener("click", toggle_category_visibility);

    const controls = {
        ".ctrl-manage-scripts": () => manage_scripts(category),
        ".ctrl-rename-category": () => rename_category(category),
        ".ctrl-collapse-toggle": () => toggle_collapsed(category),
        ".ctrl-view-mode-toggle": () => toggle_view_mode(category),
        ".ctrl-move-up": () => move_category(category, "up"),
        ".ctrl-move-down": () => move_category(category, "down"),
        ".ctrl-delete-category": () => delete_category(category)
    };

    Object.entries(controls).forEach(([selector, handler]) => {
        element.querySelector(selector).addEventListener("click", handler);
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
            view_mode: cfg_default_view_mode,
            collapsed: cfg_default_collapsed,
            scripts: []
        };

        categories.push(new_category);
        let success = await perform_save(categories)
        if (success) {
            create_category(new_category);
            swal.close();
        }
        else
            categories.pop();
    });
}

function rename_category(category) {
    let original_name = category.name;
    const category_element = content.querySelector(`.category[data-category="${original_name}"]`);
    if (!category_element) return;

    swal({
        title: `Rename Category: ${original_name}`,
        text: "Enter a new name for the category:",
        type: "input",
        inputValue: original_name,
        inputPlaceHolder: "Category Name",
        showCancelButton: true,
        closeOnConfirm: false,
        inputAttributes: {
            maxlength: "40"
        }
    }, function (input) {
        if (input === false || input === null) {
            swal.close();
            return;
        }

        let new_name = validate_category_name(input, original_name);
        if (!new_name) return false;

        category.name = new_name;

        // Update all relevant HTML elements dynamically based on data-category attribute
        content.querySelectorAll(`[data-category="${original_name}"]`).forEach(el => {
            el.setAttribute("data-category", new_name);
        });

        // Ensure category-header text is also updated
        let header_element = category_element.querySelector(".category-header");
        if (header_element)
            header_element.textContent = cfg_capitalized === "yes" ? new_name.toUpperCase() : new_name;

        categories_prepare_save();
        swal.close();
    });
}

function delete_category(category) {
    swal({
        title: "Are you sure?",
        text: `Do you really want to delete the category "${category.name}"?<br>This action cannot be undone!`,
        html: true,
        type: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No",
        dangerMode: true
    }, function(confirm) {
        if (!confirm) return;

        // Clear scripts array to trigger moving scripts back to uncategorized
        category.scripts = [];

        // Reorganize scripts (will move them to uncategorized)
        organize_userscripts_category(category);

        // Remove category from the categories array
        categories = categories.filter(cat => cat.name !== category.name);

        // Update order of remaining categories
        categories.forEach((cat, index) => (cat.order = index + 1));

        // Safely remove category element from DOM if it exists
        content.querySelector(`.category[data-category="${category.name}"]`)?.remove();

        // Update UI states
        update_uncategorized_visibility();
        update_move_buttons();
        categories_prepare_save();
    });
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