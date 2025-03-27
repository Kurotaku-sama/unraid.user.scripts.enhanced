// ========================
// Initialization & Core Functions
// ========================

// Categories
let original_categories = []; // Backup to check if page has already changed on another Tab / Browser
let categories = [];

let content; // For even faster element selection

(async function() {
    hide_elements();
    original_categories = await categories_load();
    categories = $.extend(true, [], original_categories); // Deep copy using jQuery
    await Promise.all([
        wait_for_element(".content > table"),
        wait_for_element("input[type='button'][value='Add New Script']")
    ]);

    content = document.querySelector(".content");
    main();
})();

function main() {
    let main_table = content.querySelector("table");
    if (!main_table) return;
    if (cfg_custom_css.trim() != "")
        insert_custom_css();

    handle_description_visibility();

    container_overhaul(main_table);

    let add_script_button = content.querySelector("input[type='button'][value='Add New Script']");
    if (add_script_button) {
        add_settings_button(add_script_button);
        add_category_button(add_script_button);
    }

    categories.forEach(cat => {create_category(cat)});
}

function container_overhaul(table) {
    let categories_container_html = "<div id='categories-container'></div>";
    table.insertAdjacentHTML("beforebegin", categories_container_html);

    let categories_container = document.getElementById("categories-container");

    // Header
    let uncategorized_userscripts_header_html = `
        <div class="category ${cfg_uncategorized_collapsed === "yes" ? "collapsed" : ""}" data-category="uncategorized">
            <div class="category-header">${cfg_capitalized === "yes" ? "UNCATEGORIZED USERSCRIPTS" : "Uncategorized Userscripts"}</div>
            <div class="category-content vm-${cfg_default_view_mode}" ${cfg_uncategorized_collapsed === "yes" ? "style=\"max-height: 0px;\"": ""}>
                <div class="category-scripts"></div>
            </div>
        </div>
    `;
    categories_container.insertAdjacentHTML("beforeend", uncategorized_userscripts_header_html);

    // 3Get the uncategorized scripts container
    let uncategorized_category = categories_container.querySelector(".category[data-category='uncategorized']");
    let uncategorized_userscripts_scripts_container = uncategorized_category.querySelector(".category-scripts");

    // Move all rows from the table into the uncategorized scripts container
    let tbody = table.querySelector("tbody");
    if (tbody)
        while (tbody.firstChild)
            uncategorized_userscripts_scripts_container.appendChild(tbody.firstChild);

    // Make the header clickable
    let uncategorized_userscripts_header = uncategorized_category.querySelector(".category-header");
    uncategorized_userscripts_header.addEventListener("click", toggle_category_visibility);

    // Remove the original table
    table.remove();
}

function hide_elements() {
    const style = document.createElement("style");
    style.id = "dynamic-hide-styles";

    // Hide first P element
    let css_rules = ".content > p:first-of-type { display: none !important; }";

    // What is cron and credits
    if (cfg_hide_what_is_cron === "yes" && cfg_hide_credits === "yes")
        css_rules += ".content > p:nth-of-type(2) { display: none !important; }";
    else {
        if (cfg_hide_what_is_cron === "yes")
            css_rules += ".ca_cron { display: none !important; }";
        if (cfg_hide_credits === "yes")
            css_rules += ".ca_credits { display: none !important; }";
    }

    // How to add scripts button
    if (cfg_hide_how_to_add_scripts === "yes")
        css_rules += ".content > center:first-of-type { display: none !important; }";

    // Help section
    if (cfg_hide_help === "yes")
        css_rules += ".content > center:nth-of-type(2) { display: none !important; }";


    style.textContent = css_rules;
    document.head.appendChild(style);
}

// ========================
// Description visibility
// ========================

async function handle_description_visibility() {
    if (cfg_hide_description !== "no") {
        const description_elements = content.querySelectorAll(".ca_descEdit");
        description_elements.forEach(element => {
            // Apply initial visibility rules
            update_description_visibility(element);

            // Observe text changes in this element (excluding <textarea>)
            observe_text_changes(element);
        });
    }
}

// Function to update visibility based on current text and hide_description
function update_description_visibility(element) {
    const description_text = element.textContent.trim();

    switch (cfg_hide_description) {
        case "yes":
            // Add the .desc-hidden class to hide the text
            element.classList.add("desc-hidden");
            break;

        case "without":
            if (description_text.startsWith("No description") || description_text === "")
                // Add the .desc-hidden class to hide the text
                element.classList.add("desc-hidden");
            else
                // Remove the .desc-hidden class if the text no longer matches the condition
                element.classList.remove("desc-hidden");
            break;
    }
}

function observe_text_changes(element) {
    // Watch for changes in the element itself and its children (except <textarea>)
    const config = { childList: true, subtree: true }; // Watch for added/removed nodes and text changes

    const callback = (mutations_list, observer) => {
        for (const mutation of mutations_list) {
            // Ignore changes that involve the <textarea>
            if (mutation.target.tagName?.toLowerCase() === "textarea") continue;
            // Text or child nodes have changed, update visibility based on hide_description
            update_description_visibility(element);
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(element, config);
}

// ========================
// UI Components
// ========================

function add_category_button(reference_button) {
    let category_button_html = `<input type="button" id="add-category" value="Add New Category" onclick="add_category();">`;
    reference_button.insertAdjacentHTML("afterend", category_button_html);
}

function add_settings_button(reference_button) {
    let settings_button_html = `<input type="button" id="add-settings" value="Settings" onclick="window.location.href='/Settings/UserscriptsEnhanced';">`;
    reference_button.insertAdjacentHTML("afterend", settings_button_html);
}

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

// ========================
// Category Management
// ========================

function create_category(category) {
    const category_container = document.getElementById("categories-container");
    const html = `
        <div class="category ${category.collapsed === "yes" ? "collapsed" : ""}" data-category="${category.name}" data-order="${category.order}">
            <div class="category-header">${cfg_capitalized === "yes" ? category.name.toUpperCase() : category.name}</div>
            <div class="category-content vm-${category.view_mode}" ${category.collapsed === "yes" ? "style=\"max-height: 0px;\"": ""}>
                <div class="category-controls">
                    <input type="button" class="manage-scripts" data-category="${category.name}" value="Manage Scripts">
                    <div class="category-controls-right">
                        <input type="button" class="rename-category" data-category="${category.name}" value="Rename">
                        <input type="button" class="collapse-toggle" data-category="${category.name}" value="Collapsed: ${category.collapsed}">
                        <input type="button" class="view-mode-toggle" data-category="${category.name}" value="View: ${category.view_mode === "list" ? "List" : "Panel"}">
                        <input type="button" class="move-up" data-category="${category.name}" value="↑" ${category.order === 1 ? "disabled" : ""}>
                        <input type="button" class="move-down" data-category="${category.name}" value="↓" ${category.order === categories.length ? "disabled" : ""}>
                        <input type="button" class="delete-category" data-category="${category.name}" value="Delete">
                    </div>
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
        ".manage-scripts": () => manage_scripts(category),
        ".rename-category": () => rename_category(category),
        ".collapse-toggle": () => toggle_collapsed(category),
        ".view-mode-toggle": () => toggle_view_mode(category),
        ".move-up": () => move_category(category, "up"),
        ".move-down": () => move_category(category, "down"),
        ".delete-category": () => delete_category(category)
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
        if(success) {
            // console.log(`✅ Category "${category_name}" added successfully.`);
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

        // Remove category from the array
        categories = categories.filter(cat => cat.name !== category.name);

        // Adjust order values for remaining categories
        categories.forEach((cat, index) => cat.order = index + 1);

        // Remove category element from the DOM
        let category_element = $(`.category[data-category="${category.name}"]`);
        if (category_element.length)
            category_element.remove();

        update_move_buttons();
        categories_prepare_save();
    });
}

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

// ========================
// Validations
// ========================

function validate_category_name(input, original_name = null) {
    let category_name = input.trim();
    if (!category_name) {
        swal.showInputError("❌ The category name cannot be empty!");
        return false;
    }
    if (category_name.length > 40) {
        swal.showInputError("❌ The category name cannot be longer than 40 characters!");
        return false;
    }
    if (category_name.toLowerCase() === "uncategorized") {
        swal.showInputError(`❌ The category name cannot be "${category_name}"!`);
        return false;
    }
    if (original_name && original_name === category_name) {
        swal.showInputError("❌ The new category name cannot be the same as the original name!");
        return false;
    }
    let category_exists = categories.some(cat => cat.name.toLowerCase() === category_name.toLowerCase());
    if (category_exists) {
        swal.showInputError("❌ A category with this name already exists!");
        return false;
    }
    if (/["\\]/.test(category_name)) {
        swal.showInputError("❌ The category name cannot contain double quotes (\") or backslashes (\\)!");
        return false;
    }
    return category_name;
}

function validate_categories_order(data) {
    // Check if the order values are already sequential and start from 1
    let is_sequential = true;
    for (let i = 0; i < data.length; i++) {
        if (data[i].order !== i + 1) {
            is_sequential = false;
            break;
        }
    }
    // If not sequential, reorder the categories
    if (!is_sequential) {
        console.log("🔄 Reordering categories to maintain correct order...");
        // Sort the categories by their current order
        let sorted_categories = [...data].sort((a, b) => a.order - b.order);

        // Assign new sequential order starting from 1
        sorted_categories.forEach((category, index) => {
            category.order = index + 1;
        });
        categories_prepare_save(sorted_categories);
        return sorted_categories;
    }
    // If already sequential, return the original data
    return data;
}

// ========================
// Helper Functions
// ========================

function wait_for_element(selector) {
    return new Promise(resolve => {
        const node = document.querySelector(selector);
        if (node) return resolve(node);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function toggle_category_visibility(event) {
    let category = event.target.closest(".category");
    let content = category.querySelector(".category-content");

    if (content.dataset.animating) return; // Block spam clicks

    content.dataset.animating = "true"; // Lock for animation
    setTimeout(() => delete content.dataset.animating, 500); // Unlock after 0.5s

    if (category.classList.contains("collapsed")) {
        // Open the category with animation if it's collapsed
        category.classList.remove("collapsed");
        content.style.maxHeight = content.scrollHeight + "px"; // Initial opening
        setTimeout(() => content.style.maxHeight = null, 500); // Reset max-height after animation
    } else {
        // Collapse the category with animation if it's open
        content.style.maxHeight = content.scrollHeight + "px";
        setTimeout(() => {
            category.classList.add("collapsed");
            content.style.maxHeight = "0"; // Collapse with animation
        }, 10);
    }
}

function insert_custom_css() {
    let style = document.createElement("style");
    style.textContent = cfg_custom_css;
    document.head.appendChild(style);
}

// ========================
// Data Persistence
// ========================

let is_saving = false;
let can_save = true;
let countdown_interval = null;

function stop_saving() {
    if (countdown_interval) {
        clearInterval(countdown_interval);
        countdown_interval = null;
    }

    const save_panel = document.getElementById('save-panel');
    if (save_panel) {
        save_panel.style.opacity = 0;
        setTimeout(() => save_panel.remove(), 300);
    }

    is_saving = false;
}

async function categories_prepare_save(categories_to_save) {
    if (is_saving) return;
    is_saving = true;

    if(can_save == false) {
        swal("Save not possible", "The categories had changed on another instance, reload the page to be able to save again!", "error");
        is_saving = false;
        return false;
    }

    let delay = parseInt(cfg_save_delay);

    if (delay === 0) {
        await perform_save(categories_to_save);
        return;
    }

    const html = `
        <div id="save-panel">
            Saving in: <span id="save-timer">${delay}</span> Seconds
        </div>
    `;

    content.insertAdjacentHTML("beforeend", html);
    const save_panel = document.getElementById("save-panel");
    save_panel.style.opacity = 0;
    setTimeout(() => save_panel.style.opacity = 1, 10);

    const timer_element = document.getElementById("save-timer");
    countdown_interval = setInterval(async () => {
        delay--;
        timer_element.textContent = delay;

        if (delay <= 0) {
            await perform_save(categories_to_save);
            stop_saving();
        }
    }, 1000);
}

async function perform_save(categories_to_save) {
    stop_saving();

    if(can_save == false) {
        swal("Save not possible", "The categories had changed on another instance, reload the page to be able to save again!", "error");
        return false;
    }

    let save_success;
    try {
        const fetched_categories = await categories_load();

        if (JSON.stringify(fetched_categories) !== JSON.stringify(original_categories)) {
            can_save = false;
            swal({
                title: "Conflict Detected",
                text: "The categories have been modified already. Reload the page otherwise you can't save.",
                html: true,
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "Reload Page",
                cancelButtonText: "Cancel",
                dangerMode: true
            }, function(confirm) {
                if (confirm) location.reload();
            });
            return false;
        }

        save_success = await categories_save(categories_to_save);
        if (save_success)
            original_categories = $.extend(true, [], categories_to_save || categories);
        return save_success;
    } catch (error) {
        console.error("❌ Save preparation error:", error);
        return false;
    }
}

async function categories_load() {
    try {
        const data = await $.getJSON(`/plugins/${cfg_plugin}/php/categories_load.php?plugin=${cfg_plugin}`);
        // Check if the response contains an error
        if (data.error)
            throw new Error(data.error); // Throw an error with the server error message

        // Handle warnings if present
        if (data.warning)
            swal({title: "Warning", text: data.warning, icon: "warning"});
        return validate_categories_order(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
        console.error("❌ Load error:", error);
        swal("Load Failed", error || "An unknown error occurred while loading categories.", "error");
        return [];
    }
}

async function categories_save(categories_to_save) {
    if(can_save == false) {
        swal("Save not possible", "The categories had changed on another instance, reload the page to be able to save again!", "error");
        return false;
    }

    try {
        // Use the passed categories or fall back to the global `categories` variable
        const categories_data = JSON.stringify(categories_to_save || categories);
        const response = JSON.parse(await $.post(`/plugins/${cfg_plugin}/php/categories_save.php`, {
            plugin: cfg_plugin,
            categories: categories_data
        }));

        // Check if the response contains an error
        if (response.error)
            throw new Error(response.error); // Throw an error with the server error message

        return true;
    } catch (error) {
        console.error("❌ Save error:", error);
        swal("Save Failed", error || "An unknown error occurred while saving categories.", "error");
        return false;
    }
}