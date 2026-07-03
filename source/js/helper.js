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
    style.textContent = cfg_use['custom_css'];
    document.head.appendChild(style);
}

function escape_html(string) {
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };
    return string.replace(/[&<>"']/g, character => map[character]);
}

// Finds the DOM element of a category by its name without relying on CSS attribute selectors, since category names can contain characters that would break selector syntax (quotes, brackets, etc.)
function get_category_element(category_name) {
    for (const element of content.querySelectorAll(".category"))
        if (element.dataset.category === category_name)
            return element;
    return null;
}

// Returns all elements (category container and its control buttons) that share the given category name in their data-category attribute, used when renaming a category to update every related element at once
function get_elements_by_category(category_name) {
    const elements = [];
    for (const element of content.querySelectorAll("[data-category]"))
        if (element.dataset.category === category_name)
            elements.push(element);
    return elements;
}