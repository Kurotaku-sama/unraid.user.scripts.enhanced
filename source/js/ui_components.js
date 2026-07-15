// ========================
// UI Components
// ========================

function add_category_button(reference_button) {
    const html = `<input type="button" id="add-category" value="Add New Category" onclick="add_category();">`;
    reference_button.insertAdjacentHTML("afterend", html);
}

function add_change_order_button(reference_button) {
    const html = `<input type="button" id="change-category-order" value="Change Order" onclick="open_change_order_dialog();">`;
    reference_button.insertAdjacentHTML("afterend", html);
}

function add_settings_button(reference_button) {
    const html = `<input type="button" id="add-settings" value="Settings">`;
    reference_button.insertAdjacentHTML("afterend", html);

    document.getElementById("add-settings").addEventListener("mousedown", event => {
        if (event.button === 1)
            window.open("/Settings/UserscriptsEnhanced", "_blank");
        else if (event.button === 0)
            window.location.href = "/Settings/UserscriptsEnhanced";
    });
}

function add_search_input() {
    if (cfg_use['enable_search'] === "yes") {
        const container = document.getElementById("search_about_wrapper");
        const search_input_field_html = `
            <div class="category-search-wrapper">
                <b class="icon-u-search system category-search-icon"></b>
                <input type="text" id="category-search-input" class="category-search-input" placeholder="Search">
            </div>
        `;
        container.insertAdjacentHTML("afterbegin", search_input_field_html);
        document.getElementById("category-search-input")?.addEventListener("input", e => search_script(e.target.value));
    }
}

// Inserts both "About U.S.E" and "About U.S." buttons into the shared wrapper above the search input, native credits popup gets its own rebuilt swal instead of relying on the original plugin's tooltip
function add_about_buttons() {
    const html = `
        <div class="about-wrapper">
            <input type="button" class="about-button" value="About U.S.E" onclick="about_plugin();">
            <input type="button" class="about-button" value="About U.S" onclick="open_credits();">
        </div>
    `;

    document.getElementById("search_about_wrapper").insertAdjacentHTML("beforeend", html.trim());
}

// Creates and inserts a native styled "What Is Cron" button directly next to the "How To Add Scripts" button, only when the setting is enabled, replacing the previous plain link approach entirely
function add_cron_button() {
    if (cfg_use['hide_what_is_cron'] === "yes") return;

    const how_to_add_scripts_container = content.querySelector(":scope > center:first-of-type");
    if (!how_to_add_scripts_container) return;

    const html = `<input type="button" id="cron-info-button" value="What Is Cron" onclick="open_cron_info();">`;
    how_to_add_scripts_container.insertAdjacentHTML("beforeend", html);
}
