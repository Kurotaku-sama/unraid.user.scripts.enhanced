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

function add_search_input(table) {
    if(cfg_enable_search === "yes") {
        let search_input_field_html = `<div><input type="text" id="category-search-input" placeholder="Search"></div>`;
        table.insertAdjacentHTML("beforebegin", search_input_field_html);
        // Add search function if enabled
        document.getElementById("category-search-input")?.addEventListener("input", function(e) { search_script(e.target.value); });
    }
}