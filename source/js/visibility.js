
// ========================
// Description visibility & Hidden Elements
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

function hide_elements() {
    const style = document.createElement("style");
    style.id = "dynamic-hide-styles";
    let css_rules = "";

    // Hide empty lines
    if (cfg_hide_empty_lines === "yes") {
        css_rules += ".content > p:first-of-type { display: none !important; } ";
        css_rules += ".content > p:nth-of-type(3) { display: none !important; } ";
        css_rules += ".content > hr { display: none !important; } ";
        css_rules += ".content > p:nth-of-type(4) > br { display: none !important; } ";
    }

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