// ========================
// Script Management
// ========================

function get_uncategorized_userscripts() {
    let scripts = [];
    const uncategorized_scripts_container = content.querySelector(".category[data-category='uncategorized'] .category-scripts");
    if (!uncategorized_scripts_container) return scripts;

    uncategorized_scripts_container.querySelectorAll("tr").forEach(row => {
        let script_span = row.querySelector("span.ca_nameEdit");
        let script_name = row.querySelector("font > b > span")?.textContent?.trim();

        if (script_span && script_name) {
            scripts.push({
                id: script_span.id,
                name: script_name
            });
        }
    });

    return scripts;
}

function get_scripts_from_category(category) {
    let scripts = [];
    const category_element = get_category_element(category.name);
    const script_container = category_element ? category_element.querySelector(".category-scripts") : null;
    if (!script_container) return scripts;

    script_container.querySelectorAll("tr").forEach(row => {
        let script_span = row.querySelector("span.ca_nameEdit");
        let script_name = row.querySelector("font > b > span")?.textContent?.trim();

        if (script_span && script_name) {
            scripts.push({
                id: script_span.id,
                name: script_name
            });
        }
    });
    return scripts;
}

// Builds a single draggable list item representing one script inside the category settings dialog
function build_script_item_html(script_id, script_name) {
    const max_length = 30;
    const truncated_text = script_name.length > max_length
        ? `${script_name.substring(0, max_length)}...`
        : script_name;

    const safe_title = escape_html(script_name);
    const safe_truncated_text = escape_html(truncated_text);

    return `
    <li class="category-settings-script-item" draggable="true" data-script-id="${script_id}" data-script-name="${safe_title}">
        <span class="category-settings-script-handle">⋮⋮</span>
        <span class="truncate-text" title="${safe_title}">${safe_truncated_text}</span>
    </li>
`;
}

// Native HTML5 drag and drop reordering and cross list moving for the script lists inside the category settings dialog
function attach_script_drag_events(lists) {
    let dragged_item = null;

    function bind_script_item_events(item) {
        item.addEventListener("dragstart", () => {
            dragged_item = item;
            item.classList.add("category-settings-script-dragging");
        });

        item.addEventListener("dragend", () => {
            item.classList.remove("category-settings-script-dragging");
            dragged_item = null;
        });
    }

    lists.forEach(list => {
        list.querySelectorAll(".category-settings-script-item").forEach(bind_script_item_events);

        list.addEventListener("dragover", event => {
            event.preventDefault();
            if (!dragged_item) return;

            // If the cursor is over a gap between items, determine the nearest item based on the Y position instead of appending it to the end
            const items = [...list.querySelectorAll(".category-settings-script-item")].filter(item => item !== dragged_item);
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
                ? list.insertBefore(dragged_item, closest_item)
                : list.appendChild(dragged_item);
        });
    });
}

// Moves scripts in the DOM to reflect the category's saved script order, also moves scripts back to uncategorized when removed from a category
function organize_userscripts_category(category) {
    const category_element = get_category_element(category.name);
    const script_container = category_element ? category_element.querySelector(".category-scripts") : null;
    if (!script_container) return;

    const uncategorized_scripts_container = content.querySelector(".category[data-category='uncategorized'] .category-scripts");
    if (!uncategorized_scripts_container) return;

    // Create a Set of script IDs in the category for fast lookup
    const category_script_ids = new Set(category.scripts);

    // Create a Map of script rows in the category container for fast access
    const script_rows = new Map();
    script_container.querySelectorAll("tr").forEach(row => {
        const script_id = row.querySelector("span.ca_nameEdit").id;
        script_rows.set(script_id, row);
    });

    // Move scripts back to the uncategorized section if they are no longer in the category
    script_rows.forEach((row, script_id) => {
        if (!category_script_ids.has(script_id)) {
            // Find the correct position to insert the row based on ID
            const rows = uncategorized_scripts_container.querySelectorAll("tr");
            let insert_before = null;

            for (const existing_row of rows) {
                const existing_id = existing_row.querySelector("span.ca_nameEdit").id;

                // Compare IDs as strings (lexicographically)
                if (existing_id.localeCompare(script_id) > 0) {
                    insert_before = existing_row;
                    break;
                }
            }

            // Insert the row at the correct position
            if (insert_before)
                uncategorized_scripts_container.insertBefore(row, insert_before);
            else
                uncategorized_scripts_container.appendChild(row);
        }
    });

    // Organize scripts in the container based on the order in category.scripts
    category.scripts.forEach((script_id, index) => {
        let script_row = script_rows.get(script_id);

        if (!script_row) {
            // Script is missing in the container, move it from the uncategorized section
            script_row = uncategorized_scripts_container.querySelector(`span.ca_nameEdit[id="${script_id}"]`)?.closest("tr");
            if (script_row)
                script_rows.set(script_id, script_row);
        }

        if (script_row && script_row !== script_container.children[index])
            script_container.insertBefore(script_row, script_container.children[index]);
    });

    // Remove non-existent scripts from the category in case a script got deleted, this will be saved whenever the save triggers
    const existing_script_ids = new Set(script_rows.keys());
    category.scripts = category.scripts.filter(script_id => existing_script_ids.has(script_id));

    update_uncategorized_visibility();
}