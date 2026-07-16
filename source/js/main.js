// ========================
// Initialization & Core Functions
// ========================

// Maximum allowed nesting depth of categories, top level categories are depth 1, referenced by every depth check across the plugin, configurable via the plugin settings page, validated here in case the cfg file was edited manually, falls back to 3 if not a whole number between 1 and 10
const raw_max_category_depth = parseInt(cfg_use['max_category_depth'], 10);
const max_category_depth = (Number.isInteger(raw_max_category_depth) && raw_max_category_depth >= 1 && raw_max_category_depth <= 10) ? raw_max_category_depth : 3;

// Categories
let original_categories = []; // Backup to check if page has already changed on another Tab / Browser
let categories = [];

let content; // For even faster element selection
let uncategorized_category = null; // Global variable to cache the uncategorized category element

// Loads the saved category tree and waits for the original User Scripts markup to exist before running any DOM setup, since the plugin injects itself before the original page content has necessarily finished rendering
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
    const main_table = content.querySelector("table");
    if (!main_table) return;
    if (cfg_use['custom_css']?.trim() != "")
        insert_custom_css();
    
    // Container for Search Box and About/Credits Buttons
    main_table.insertAdjacentHTML("beforebegin", "<div id=search_about_wrapper></div>");

    add_cron_button();
    add_search_input();
    add_about_buttons();
    handle_description_visibility();
    bugfixes(); // Fixes that affect the original user scripts plugin
    container_overhaul(main_table);

    const add_script_button = content.querySelector("input[type='button'][value='Add New Script']");
    if (add_script_button) {
        add_settings_button(add_script_button);
        add_change_order_button(add_script_button);
        add_category_button(add_script_button);
    }

    categories.forEach(cat => {create_category(cat)});
}

function insert_custom_css() {
    const style = document.createElement("style");
    style.textContent = cfg_use['custom_css'];
    document.head.appendChild(style);
}

// Replaces the original single flat table with the categories container structure, moving every existing script row into the "uncategorized" section first since category assignment happens afterward via organize_userscripts_category for each category
function container_overhaul(table) {
    const html_categories_container = "<div id='categories-container'></div>";
    table.insertAdjacentHTML("beforebegin", html_categories_container);

    const categories_container = document.getElementById("categories-container");

    // Style
    const style_attr = cfg_use['uncategorized_collapsed'] === "yes" ? 'style="max-height: 0px;"' : "";
    const effective_view_mode = resolve_effective_view_mode(cfg_use['default_view_mode']);
    const view_mode_classes = compute_view_mode_classes(effective_view_mode).join(" ");

    const uncategorized_name = escape_html(cfg_use['capitalized'] === "yes" ? cfg_use['uncategorized_name'].toUpperCase() : cfg_use['uncategorized_name'])
    const html_uncategorized_userscripts_header = `
        <div class="category ${cfg_use['uncategorized_collapsed'] === "yes" ? "collapsed uncategorized_empty" : ""}" data-category="uncategorized">
            <div class="category-header">
                <span class="category-header-text">${uncategorized_name}</span>
            </div>
            <div class="category-content" ${style_attr}>
                <div class="category-subcategories"></div>
                <div class="category-scripts ${view_mode_classes}"></div>
            </div>
        </div>
    `;
    categories_container.insertAdjacentHTML("beforeend", html_uncategorized_userscripts_header);

    // Get the uncategorized scripts container
    const uncategorized_category = categories_container.querySelector(".category[data-category='uncategorized']");
    const uncategorized_userscripts_scripts_container = uncategorized_category.querySelector(".category-scripts");

    // Move all rows from the table into the uncategorized scripts container, appendChild moves the existing node instead of cloning it, so all original event listeners and jQuery data on each row stay intact
    const tbody = table.querySelector("tbody");
    if (tbody)
        while (tbody.firstChild)
            uncategorized_userscripts_scripts_container.appendChild(tbody.firstChild);

    // Make the header clickable
    uncategorized_category.querySelector(".category-header")?.addEventListener("click", toggle_category_visibility);
    update_uncategorized_visibility();

    // Remove the original table
    table.remove();
}

$(function() {
    // Update Check
    if (typeof caPluginUpdateCheck === "function")
        caPluginUpdateCheck("user.scripts.enhanced.plg",{name:"User Scripts Enhanced"});
});