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
    // Shortens overly long script names for display purposes only, the full name is still available via the title attribute on hover
    const truncated_text = script_name.length > max_length
        ? `${script_name.substring(0, max_length)}...`
        : script_name;

    const safe_title = escape_html(script_name);
    const safe_truncated_text = escape_html(truncated_text);

    const html = `
        <div class="category-settings-script-item" data-script-id="${script_id}">
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
            emptyInsertThreshold: 50,
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
// Runs after every save that could have changed a category's script assignment, since the settings dialog only edits the in memory category.scripts array, the actual <tr> rows still need to be physically relocated in the DOM to match
function organize_userscripts_category(category) {
    const category_element = get_category_element(category.id);
    // Scoped to the category's own scripts container, since a category can contain nested subcategories with their own .category-scripts
    const script_container = category_element ? category_element.querySelector(":scope > .category-content > .category-scripts") : null;
    if (!script_container) return;

    const uncategorized_scripts_container = content.querySelector(".category[data-category='uncategorized'] .category-scripts");
    if (!uncategorized_scripts_container) return;

    // Set of script ids that are supposed to remain in this category, used for a fast lookup instead of an array search on every row
    const category_script_ids = new Set(category.scripts);

    // Maps every script id currently rendered inside the category container to its actual <tr> row, so rows can be looked up and moved without repeatedly querying the DOM
    const script_rows = new Map();
    script_container.querySelectorAll("tr").forEach(row => {
        const script_span = row.querySelector("span.ca_nameEdit");
        if (!script_span) return;
        script_rows.set(script_span.id, row);
    });

    // Snapshot the currently sorted uncategorized rows once instead of re-querying the DOM inside the loop below, the array is kept manually in sync after every insertion so it always reflects the current state without another querySelectorAll call
    let uncategorized_rows_sorted = Array.from(uncategorized_scripts_container.querySelectorAll("tr"));

    // Any row still physically inside the category container that is no longer listed in category.scripts must have been unassigned, move it back to uncategorized
    script_rows.forEach((row, script_id) => {
        if (!category_script_ids.has(script_id)) {
            // Uncategorized rows are kept sorted by script id, find the first existing row whose id sorts after the moved script id to insert before it and keep that order intact
            const insert_index = uncategorized_rows_sorted.findIndex(existing_row => existing_row.querySelector("span.ca_nameEdit").id.localeCompare(script_id) > 0);

            if (insert_index !== -1) {
                uncategorized_scripts_container.insertBefore(row, uncategorized_rows_sorted[insert_index]);
                uncategorized_rows_sorted.splice(insert_index, 0, row);
            } else {
                uncategorized_scripts_container.appendChild(row);
                uncategorized_rows_sorted.push(row);
            }
        }
    });

    // Walks category.scripts in its saved order and makes sure every row physically sits at the matching index inside the category container, newly assigned scripts are pulled in from uncategorized on demand
    category.scripts.forEach((script_id, index) => {
        let script_row = script_rows.get(script_id);

        if (!script_row) {
            // Script is missing in the container, move it from the uncategorized section
            script_row = uncategorized_scripts_container.querySelector(`span.ca_nameEdit[id="${script_id}"]`)?.closest("tr");
            if (script_row)
                script_rows.set(script_id, script_row);
        }

        // Only touch the DOM if the row is not already sitting at its correct position, avoids unnecessary reflows for rows that never moved
        if (script_row && script_row !== script_container.children[index])
            script_container.insertBefore(script_row, script_container.children[index]);
    });

    // A script referenced in category.scripts might no longer exist at all (e.g. it was deleted through the original User Scripts UI), drop those stale ids so they do not get persisted on the next save
    const existing_script_ids = new Set(script_rows.keys());
    category.scripts = category.scripts.filter(script_id => existing_script_ids.has(script_id));

    update_uncategorized_visibility();
}