// ========================
// Description visibility & Hidden Elements
// ========================

async function handle_description_visibility() {
    if (cfg_use['hide_description'] !== "no") {
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

    switch (cfg_use['hide_description']) {
        case "yes":
            // Add the .desc-hidden class to hide the text
            element.classList.add("desc-hidden");
            break;

        case "without":
            // Only hide descriptions that still contain the plugin's default placeholder text or are completely empty, a description the user actually wrote stays visible
            if (description_text.startsWith("No description") || description_text === "")
                // Add the .desc-hidden class to hide the text
                element.classList.add("desc-hidden");
            else
                // Remove the .desc-hidden class if the text no longer matches the condition
                element.classList.remove("desc-hidden");
            break;
    }
}

// Watches a description element for content changes so the "without" mode can re-evaluate visibility live, e.g. right after the user types a real description into a previously empty field
function observe_text_changes(element) {
    // Watch for changes in the element itself and its children (except <textarea>)
    const config = { childList: true, subtree: true }; // Watch for added/removed nodes and text changes

    const callback = (mutations_list, observer) => {
        for (const mutation of mutations_list) {
            // Ignore mutations originating from the <textarea>, since typing inside it fires constant DOM mutations that would otherwise trigger a visibility check on every keystroke
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

    // Hide original What is Cron and Credits
    css_rules += ".content > p:nth-of-type(2) { display: none !important; }";

    // Hide empty lines
    if (cfg_use['hide_empty_lines'] === "yes") {
        // Targets the specific empty <p> and <hr> tags that the original User Scripts page renders around its header and button rows, purely cosmetic cleanup with no functional impact
        css_rules += ".content > p:first-of-type { display: none !important; } ";
        css_rules += ".content > p:nth-of-type(3) { display: none !important; } ";
        css_rules += ".content > hr { display: none !important; } ";
        css_rules += ".content > p:nth-of-type(4) > br { display: none !important; } ";
    }

    // What is cron and how to add scripts button
    // The original User Scripts plugin renders "How To Add Scripts" as the first child and "What Is Cron" as the second child inside the same <center> container, so they can only be targeted individually by their child index; when both settings are enabled the whole container is hidden at once instead
    if (cfg_use['hide_what_is_cron'] === "yes" && cfg_use['hide_how_to_add_scripts'] === "yes")
        css_rules += ".content > center { display: none !important; }";
    else if (cfg_use['hide_how_to_add_scripts'] === "yes")
        css_rules += ".content > center > :nth-child(1) { display: none !important; }";
    else if (cfg_use['hide_what_is_cron'] === "yes")
        css_rules += ".content > center > :nth-child(2) { display: none !important; }";

    // Help section
    if (cfg_use['hide_help'] === "yes")
        css_rules += ".content > center:nth-of-type(2) { display: none !important; }";

    style.textContent = css_rules;
    document.head.appendChild(style);
}