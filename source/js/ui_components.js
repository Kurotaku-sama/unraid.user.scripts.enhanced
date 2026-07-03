// ========================
// UI Components
// ========================

function add_category_button(reference_button) {
    const html = `<input type="button" id="add-category" value="Add New Category" onclick="add_category();">`;
    reference_button.insertAdjacentHTML("afterend", html);
}

function add_settings_button(reference_button) {
    const html = `<input type="button" id="add-settings" value="Settings" onclick="window.location.href='/Settings/UserscriptsEnhanced';">`;
    reference_button.insertAdjacentHTML("afterend", html);
}

function add_about_button(reference_button) {
    const html = `<input type="button" class="about-button" value="About U.S.E" onclick="about_plugin()"">`;
    reference_button.insertAdjacentHTML("afterend", html);
}


function add_search_input(table) {
    if (cfg_use['enable_search'] === "yes") {
        let search_input_field_html = `
            <div class="category-search-wrapper">
                <b class="icon-u-search system category-search-icon"></b>
                <input type="text" id="category-search-input" class="category-search-input" placeholder="Search">
            </div>
        `;
        table.insertAdjacentHTML("beforebegin", search_input_field_html);
        document.getElementById("category-search-input")?.addEventListener("input", e => search_script(e.target.value));
    }
}
