// ========================
// Script Management
// ========================

function manage_scripts(category) {
    // Get all uncategorized scripts (those still in the main table)
    let uncategorized_scripts = get_uncategorized_userscripts();

    // Get the scripts that are already in the category container
    let category_scripts = get_scripts_from_category(category);

    // Create the options for the dropdown list (only uncategorized scripts)
    let script_options = uncategorized_scripts.map(script =>
        `<option value="${script.id}">${script.name}</option>`
    ).join("");

    // Create the list of already assigned scripts
    let assigned_script_list = category_scripts.map(script =>
        create_list_item(script.id, script.name)
    ).join("");

    swal({
        title: `Manage Scripts in ${category.name}`,
        text: `
            <div class="swal-add-script">
                <label for="script-selection">Select Script to Add:</label>
                <select id="script-selection" size="5">${script_options}</select>
                <input type="button" id="add-script-button" value="Add to Category" onclick="add_selected_script()">
                <p>Currently in Category:</p>
                <ul id="added-scripts">${assigned_script_list}</ul>
            </div>
        `,
        html: true,
        showCancelButton: true,
        confirmButtonText: "Save",
        cancelButtonText: "Cancel"
    }, function(is_confirmed) {
        if (!is_confirmed) return;

        // Convert the NodeList to an array and extract the scriptIds
        let added_scripts_container = document.getElementById("added-scripts");
        let added_scripts = Array.from(added_scripts_container.querySelectorAll("li"));
        let selected_scripts = added_scripts.map(li => li.dataset.scriptId);

        // Check if changes were made
        console.log(JSON.stringify(category.scripts));
        console.log(JSON.stringify(category.scripts));
        if (JSON.stringify(selected_scripts) !== JSON.stringify(category.scripts)) {
            category.scripts = selected_scripts;
            organize_userscripts_category(category);
            perform_save();
        }
    });
}

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
    const category_container = content.querySelector(`.category[data-category="${category.name}"] .category-scripts`);
    if (!category_container) return scripts;

    category_container.querySelectorAll("tr").forEach(row => {
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

function add_selected_script(event) {
    let selection_box = document.getElementById("script-selection");
    if (!selection_box || selection_box.selectedIndex === -1) return;

    let selected_option = selection_box.options[selection_box.selectedIndex];
    if (!selected_option) return;

    let script_id = selected_option.value;
    let script_name = selected_option.text;

    let list_item = create_list_item(script_id, script_name);
    document.getElementById("added-scripts").insertAdjacentHTML("beforeend", list_item);
    selected_option.remove();
}

function remove_selected_script(event) {
    const list_item = event.target.parentElement;
    const script_id = list_item.dataset.scriptId
    const script_name = list_item.dataset.scriptName;
    const selection_box = document.getElementById("script-selection");

    if (!selection_box) return;

    // Remember scroll position
    const scroll_top = selection_box.scrollTop;
    const new_option = new Option(script_name, script_id);

    // Find position based on script ID (string comparison)
    let insert_index = -1;
    for (let i = 0; i < selection_box.options.length; i++) {
        const option_id = selection_box.options[i].value; // Get ID from option value

        if (script_id.localeCompare(option_id) < 0) { // Compare IDs as strings
            insert_index = i;
            break;
        }
    }

    // Insert the new option at the correct position
    if (insert_index === -1)
        selection_box.add(new_option);
    else
        selection_box.add(new_option, insert_index);

    // Restore scroll position
    selection_box.scrollTop = scroll_top;
    list_item.remove();
}

function move_script(event, direction) {
    let element = event.target.parentElement;
    let parent = element.parentElement;
    if (direction === "up" && element.previousElementSibling) {
        parent.insertBefore(element, element.previousElementSibling);
    } else if (direction === "down" && element.nextElementSibling) {
        parent.insertBefore(element.nextElementSibling, element);
    }
}

function create_list_item(script_id, script_name) {
    const max_length = 30;
    const truncated_text = script_name.length > max_length
        ? script_name.substring(0, max_length) + "..."
        : script_name;

    return `
        <li data-script-id="${script_id}" data-script-name="${script_name}">
            <input type="button" class="remove-script" data-id="${script_id}" value="Remove" onclick="remove_selected_script(event)">
            <input type="button" class="move-up" value="↑" onclick="move_script(event, 'up')">
            <input type="button" class="move-down" value="↓" onclick="move_script(event, 'down')">
            <span class="truncate-text" title="${script_name}">${truncated_text}</span>
        </li>
    `;
}

function organize_userscripts_category(category) {
    const script_container = content.querySelector(`.category[data-category="${category.name}"] .category-scripts`);
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
            // Get the script ID for sorting
            const script_id = row.querySelector("span.ca_nameEdit").id;

            // Find the correct position to insert the row based on ID
            const rows = uncategorized_scripts_container.querySelectorAll("tr");
            let insert_before = null;

            for (const existing_row of rows) {
                const existing_id = existing_row.querySelector("span.ca_nameEdit").id;

                // Compare IDs as strings (lexicographically)
                if (existing_id.localeCompare(script_id) > 0) { // Correct comparison
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
                script_rows.set(script_id, script_row); // Cache the row for future use
        }

        if (script_row && script_row !== script_container.children[index])
            script_container.insertBefore(script_row, script_container.children[index]);
    });

    // Remove non-existent scripts from the category in case a script got deleted, this will be saved whenever the save triggers
    const existing_script_ids = new Set(script_rows.keys());
    category.scripts = category.scripts.filter(script_id => existing_script_ids.has(script_id));
}