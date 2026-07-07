// ========================
// Category Controls
// ========================

// Applies the collapsed state to a category element based on the category's current collapsed value
function apply_collapsed_state(category) {
    const category_element = get_category_element(category.name);
    if (!category_element) return;

    category.collapsed === "yes"
        ? category_element.classList.add("collapsed")
        : category_element.classList.remove("collapsed");
}

// Applies the view mode classes (list or panel) together with the separator and highlighting modifiers to a category element
function apply_view_mode(category) {
    const category_element = get_category_element(category.name);
    if (!category_element) return;

    const category_scripts = category_element.querySelector(".category-scripts");
    category_scripts.classList.remove("vm-list", "vm-panel", "vo-separator", "vo-highlight");

    if (category.view_mode === "panel") {
        category_scripts.classList.add("vm-panel");

        if (cfg_use['view_mode_highlighting'].includes("panel"))
            category_scripts.classList.add("vo-highlight");
    } else {
        category_scripts.classList.add("vm-list");

        if (cfg_use['list_view_separators'] === "yes")
            category_scripts.classList.add("vo-separator");

        if (cfg_use['view_mode_highlighting'].includes("list"))
            category_scripts.classList.add("vo-highlight");
    }
}