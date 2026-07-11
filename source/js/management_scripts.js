// ========================
// Script Management
// ========================

// Extracts the id and name of every script row inside the given scripts container, shared by both the uncategorized and the category specific lookups
function get_scripts_from_container(script_container) {
    let scripts = [];
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

function get_uncategorized_userscripts() {
    const uncategorized_scripts_container = content.querySelector(".category[data-category='uncategorized'] .category-scripts");
    return get_scripts_from_container(uncategorized_scripts_container);
}

function get_scripts_from_category(category) {
    const category_element = get_category_element(category.id);
    // Scoped to the category's own scripts container, since a category can contain nested subcategories with their own .category-scripts
    const script_container = category_element ? category_element.querySelector(":scope > .category-content > .category-scripts") : null;
    return get_scripts_from_container(script_container);
}

// Builds a single draggable list item representing one script inside the category settings dialog, dragging itself is handled by SortableJS via the dedicated handle element
function build_script_item_html(script_id, script_name) {
    const max_length = 30;
    const truncated_text = script_name.length > max_length
        ? `${script_name.substring(0, max_length)}...`
        : script_name;

    const safe_title = escape_html(script_name);
    const safe_truncated_text = escape_html(truncated_text);

    const html = `
        <div class="category-settings-script-item" data-script-id="${script_id}" data-script-name="${safe_title}">
            <span class="category-settings-script-handle">⋮ ⋮</span>
            <span class="category-settings-script-name" title="${safe_title}">${safe_truncated_text}</span>
        </div>
    `;

    return html.trim();
}

// Sortable instances currently active inside the category settings dialog's script lists, tracked so they can be destroyed once the dialog closes
let script_sortable_instances = [];

// Creates one Sortable instance per script list inside the category settings dialog, both lists share the same group so scripts can be dragged between the category list and the uncategorized list, the entire item is draggable rather than only the handle
function initialize_script_sortables(lists) {
    script_sortable_instances = [];

    lists.forEach(list => {
        const instance = new Sortable(list, {
            group: "category-settings-scripts",
            animation: 150,
            forceFallback: true,
            fallbackOnBody: true,
            swapThreshold: 0.65,
            ghostClass: "category-settings-script-dragging"
        });
        script_sortable_instances.push(instance);
    });
}

// Destroys every active Sortable instance from the category settings dialog's script lists, called once the dialog closes to avoid leaking instances bound to removed elements
function destroy_script_sortables() {
    script_sortable_instances.forEach(instance => instance.destroy());
    script_sortable_instances = [];
}

// Moves scripts in the DOM to reflect the category's saved script order, also moves scripts back to uncategorized when removed from a category
function organize_userscripts_category(category) {
    const category_element = get_category_element(category.id);
    // Scoped to the category's own scripts container, since a category can contain nested subcategories with their own .category-scripts
    const script_container = category_element ? category_element.querySelector(":scope > .category-content > .category-scripts") : null;
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
