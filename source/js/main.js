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
    const main_table = content.querySelector("table");
    if (!main_table) return;
    if (cfg_use['custom_css']?.trim() != "")
        insert_custom_css();

    handle_description_visibility();
    bugfixes();
    add_search_input(main_table);
    container_overhaul(main_table);

    const add_script_button = content.querySelector("input[type='button'][value='Add New Script']");
    if (add_script_button) {
        add_settings_button(add_script_button);
        add_change_order_button(add_script_button);
        add_category_button(add_script_button);
    }

    const done_button = content.querySelector("input[type='button'][value='Done']");
    if (done_button) {
        done_button.parentNode.style.display = "flex";
        done_button.parentNode.style.flexWrap = 'wrap';
        add_about_button(done_button);
    }

    categories.forEach(cat => {create_category(cat)});

}

function container_overhaul(table) {
    const categories_container_html = "<div id='categories-container'></div>";
    table.insertAdjacentHTML("beforebegin", categories_container_html);

    const categories_container = document.getElementById("categories-container");

    // Style
    const style_attr = cfg_use['uncategorized_collapsed'] === "yes" ? 'style="max-height: 0px;"' : "";
    // Determine optional extra classes for uncategorized section
    const extra_classes = [
        (cfg_use['default_view_mode'] === "list" && cfg_use['list_view_separators'] === "yes") ? "vo-separator" : "",
        (cfg_use['view_mode_highlighting'].includes(cfg_use['default_view_mode'])) ? "vo-highlight" : ""
    ].filter(Boolean).join(" ");

    const uncategorized_name = escape_html(cfg_use['capitalized'] === "yes" ? cfg_use['uncategorized_name'].toUpperCase() : cfg_use['uncategorized_name'])
    const uncategorized_userscripts_header_html = `
        <div class="category ${cfg_use['uncategorized_collapsed'] === "yes" ? "collapsed uncategorized_empty" : ""}" data-category="uncategorized">
            <div class="category-header">
                <span class="category-header-text">${uncategorized_name}</span>
            </div>
            <div class="category-content" ${style_attr}>
                <div class="category-subcategories"></div>
                <div class="category-scripts vm-${cfg_use['default_view_mode']} ${extra_classes}"></div>
            </div>
        </div>
    `;
    categories_container.insertAdjacentHTML("beforeend", uncategorized_userscripts_header_html);

    // Get the uncategorized scripts container
    const uncategorized_category = categories_container.querySelector(".category[data-category='uncategorized']");
    const uncategorized_userscripts_scripts_container = uncategorized_category.querySelector(".category-scripts");

    // Move all rows from the table into the uncategorized scripts container
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