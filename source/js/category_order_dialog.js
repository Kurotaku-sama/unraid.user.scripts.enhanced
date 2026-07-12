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
