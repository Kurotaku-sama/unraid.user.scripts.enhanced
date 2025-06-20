// ========================
// Initialization & Core Functions
// ========================

// Categories
let original_categories = []; // Backup to check if page has already changed on another Tab / Browser
let categories = [];

let content; // For even faster element selection
let uncategorized_category = null; // Global variable to cache the uncategorized category element

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
    bugfixes();
    add_search_input(main_table);
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
        <div class="category ${cfg_uncategorized_collapsed === "yes" ? "collapsed uncategorized_empty" : ""}" data-category="uncategorized"">
            <div class="category-header">${cfg_capitalized === "yes" ? "UNCATEGORIZED USERSCRIPTS" : "Uncategorized Userscripts"}</div>
            <div class="category-content vm-${cfg_default_view_mode}" ${cfg_uncategorized_collapsed === "yes" ? "style=\"max-height: 0px;\"": ""}>
                <div class="category-scripts"></div>
            </div>
        </div>
    `;
    categories_container.insertAdjacentHTML("beforeend", uncategorized_userscripts_header_html);

    // Get the uncategorized scripts container
    let uncategorized_category = categories_container.querySelector(".category[data-category='uncategorized']");
    let uncategorized_userscripts_scripts_container = uncategorized_category.querySelector(".category-scripts");

    // Move all rows from the table into the uncategorized scripts container
    let tbody = table.querySelector("tbody");
    if (tbody)
        while (tbody.firstChild)
            uncategorized_userscripts_scripts_container.appendChild(tbody.firstChild);


    // Make the header clickable
    uncategorized_category.querySelector(".category-header")?.addEventListener("click", toggle_category_visibility);
    update_uncategorized_visibility();

    // Remove the original table
    table.remove();
}

// Update Check
$(function() {
    if ( typeof caPluginUpdateCheck === "function" ) {
        caPluginUpdateCheck("user.scripts.enhanced.plg",{name:"User Scripts Enhanced"});
    }
});