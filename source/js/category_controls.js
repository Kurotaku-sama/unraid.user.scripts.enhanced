// ========================
// Category Controls
// ========================

function toggle_collapsed(category) {
    const category_element = content.querySelector(`.category[data-category="${category.name}"]`);
    const collapse_button = category_element.querySelector(".collapse-toggle");
    category.collapsed = category.collapsed === "yes" ? "no" : "yes";
    collapse_button.value = "Collapsed: " + category.collapsed;
    categories_prepare_save();
}

function toggle_view_mode(category) {
    const category_element = content.querySelector(`.category[data-category="${category.name}"]`);
    const category_content = category_element.querySelector(".category-content");
    const view_button = category_element.querySelector(".view-mode-toggle");

    if (category.view_mode === "list") {
        category.view_mode = "panel";
        category_content.classList.remove("vm-list");
        category_content.classList.add("vm-panel");
        view_button.value = "View: Panel";
    } else {
        category.view_mode = "list";
        category_content.classList.remove("vm-panel");
        category_content.classList.add("vm-list");
        view_button.value = "View: List";
    }
    categories_prepare_save();
}

function move_category(category, direction) {
    // Calculate target position based on direction
    const swap_index = direction === "up" ? category.order - 1 : category.order + 1;

    // Validate if swap index is within bounds
    if (swap_index < 1 || swap_index > categories.length) return;

    // Find the category to swap with
    const swap_category = categories.find(c => c.order === swap_index);
    if (!swap_category) return;

    // Swap the order values between categories
    const temp_order = category.order;
    category.order = swap_category.order;
    swap_category.order = temp_order;

    // Re-sort the categories array based on order
    categories.sort((a, b) => a.order - b.order);

    // Get DOM elements for both categories
    const category_element = content.querySelector(`.category[data-category="${category.name}"]`);
    const swap_element = content.querySelector(`.category[data-category="${swap_category.name}"]`);
    if (!category_element || !swap_element) return;

    if (direction === "up")
        swap_element.parentNode.insertBefore(category_element, swap_element);
    else
        swap_element.parentNode.insertBefore(category_element, swap_element.nextSibling);

    update_move_buttons();
    categories_prepare_save();
}

function update_move_buttons() {
    // Iterate through all categories
    categories.forEach(category => {
        const category_element = content.querySelector(`.category[data-category="${category.name}"]`);
        if (!category_element) return;

        // Get move buttons
        const move_up_button = category_element.querySelector(".move-up");
        const move_down_button = category_element.querySelector(".move-down");

        // Update button states based on category position
        if (move_up_button)
            move_up_button.disabled = category.order === 1;
        if (move_down_button)
            move_down_button.disabled = category.order === categories.length;
    });
}