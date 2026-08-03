// ========================
// Category Controls
// ========================

// Tracks the current mobile breakpoint, matches the max-width used by the Panel View responsive grid in the CSS
const mobile_force_panel_media_query = window.matchMedia("(max-width: 800px)");

// Resolves the view mode that should actually be rendered, forcing panel view when mobile_force_panel is enabled and the viewport is currently at or below the mobile breakpoint, since the List View table layout can overflow on small screens
function resolve_effective_view_mode(view_mode) {
    if (cfg_use['mobile_force_panel'] === "yes" && mobile_force_panel_media_query.matches)
        return "panel";
    return view_mode;
}

// Computes the full class list (view mode plus separator and highlighting modifiers) for a scripts container, single source of truth shared by initial rendering and every later reapply
function compute_view_mode_classes(effective_view_mode) {
    const classes = [`vm-${effective_view_mode}`];

    if (effective_view_mode === "list" && cfg_use['list_view_separators'] === "yes")
        classes.push("vo-separator");

    if (cfg_use['view_mode_highlighting'].includes(effective_view_mode))
        classes.push("vo-highlight");

    return classes;
}

// Applies the resolved view mode classes to a given scripts container, shared by both category specific and uncategorized containers
function apply_view_mode_to_container(scripts_container, view_mode) {
    if (!scripts_container) return;

    // Always strip every possible view mode / modifier class first, since a plain CSS override would not work here, the container keeps its originally assigned class unless it is actually removed and replaced in the DOM
    scripts_container.classList.remove("vm-list", "vm-panel", "vo-separator", "vo-highlight");

    const effective_view_mode = resolve_effective_view_mode(view_mode);
    scripts_container.classList.add(...compute_view_mode_classes(effective_view_mode));
}

// Toggles a category's expanded state with an animated max-height transition, triggered by clicking anywhere on the category header
function toggle_category_visibility(event) {
    const category = event.target.closest(".category");
    const content_element = category.querySelector(":scope > .category-content");

    if (content_element.dataset.animating) return; // Block spam clicks

    content_element.dataset.animating = "true"; // Lock for animation
    setTimeout(() => delete content_element.dataset.animating, 500); // Unlock after 0.5s

    if (!category.classList.contains("expanded")) {
        // Open the category with animation if it's currently collapsed
        category.classList.add("expanded");
        content_element.style.maxHeight = `${content_element.scrollHeight}px`; // Initial opening
        setTimeout(() => content_element.style.maxHeight = null, 500); // Reset max-height after animation
    } else {
        // Collapse the category with animation if it's currently expanded
        content_element.style.maxHeight = `${content_element.scrollHeight}px`;
        setTimeout(() => {
            category.classList.remove("expanded");
            content_element.style.maxHeight = "0"; // Collapse with animation
        }, 10);
    }
}

// Applies the expanded state to a category element based on the category's current expanded value
function apply_expanded_state(category) {
    const category_element = get_category_element(category.id);
    if (!category_element) return;

    category.expanded === "yes"
        ? category_element.classList.add("expanded")
        : category_element.classList.remove("expanded");
}

// Applies the view mode classes together with the separator and highlighting modifiers to a category's own scripts container
function apply_view_mode(category) {
    const category_element = get_category_element(category.id);
    if (!category_element) return;

    // Scoped to the category's own scripts container, since a category can contain nested subcategories that have their own .category-scripts
    const category_scripts = category_element.querySelector(":scope > .category-content > .category-scripts");
    apply_view_mode_to_container(category_scripts, category.view_mode);
}

// Recursively reapplies the view mode to every category and its subcategories, used when the mobile force panel breakpoint is crossed so all categories switch between list and panel view immediately without a page reload
function reapply_all_view_modes(list = categories) {
    list.forEach(category => {
        apply_view_mode(category);

        if (category.subcategories.length)
            reapply_all_view_modes(category.subcategories);
    });
}

// Reapplies the view mode classes to the uncategorized section, using the same shared logic as apply_view_mode
function update_uncategorized_view_mode() {
    const uncategorized_scripts = content.querySelector(".category[data-category='uncategorized'] > .category-content > .category-scripts");
    apply_view_mode_to_container(uncategorized_scripts, cfg_use['default_view_mode']);
}

// Reapplies every view mode across categories and the uncategorized section whenever the mobile breakpoint is crossed, only relevant while mobile_force_panel is enabled
mobile_force_panel_media_query.addEventListener("change", () => {
    if (cfg_use['mobile_force_panel'] !== "yes") return;
    reapply_all_view_modes();
    update_uncategorized_view_mode();
});

// Moves the subcategories container before or after the category's own scripts container based on the resolved subcategory position, without needing to recreate the whole category element
function apply_subcategory_position(category) {
    const category_element = get_category_element(category.id);
    if (!category_element) return;

    const category_content = category_element.querySelector(":scope > .category-content");
    const subcategories_container = category_content.querySelector(":scope > .category-subcategories");
    const scripts_container = category_content.querySelector(":scope > .category-scripts");

    const position = resolve_subcategory_position(category);

    // insertBefore with a null reference node simply appends at the end, that is how "below" is achieved by inserting after the scripts container's next sibling
    position === "below"
        ? category_content.insertBefore(subcategories_container, scripts_container.nextSibling)
        : category_content.insertBefore(subcategories_container, scripts_container);
}
