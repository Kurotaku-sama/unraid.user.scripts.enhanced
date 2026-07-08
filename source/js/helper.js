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
    let content_element = category.querySelector(":scope > .category-content");

    if (content_element.dataset.animating) return; // Block spam clicks

    content_element.dataset.animating = "true"; // Lock for animation
    setTimeout(() => delete content_element.dataset.animating, 500); // Unlock after 0.5s

    if (category.classList.contains("collapsed")) {
        // Open the category with animation if it's collapsed
        category.classList.remove("collapsed");
        content_element.style.maxHeight = `${content_element.scrollHeight}px`; // Initial opening
        setTimeout(() => content_element.style.maxHeight = null, 500); // Reset max-height after animation
    } else {
        // Collapse the category with animation if it's open
        content_element.style.maxHeight = `${content_element.scrollHeight}px`;
        setTimeout(() => {
            category.classList.add("collapsed");
            content_element.style.maxHeight = "0"; // Collapse with animation
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

// Finds the DOM element of a category by its id without relying on CSS attribute selectors, since ids can theoretically contain characters that would break selector syntax
function get_category_element(category_id) {
    for (const element of content.querySelectorAll(".category"))
        if (element.dataset.category === category_id)
            return element;
    return null;
}

// Returns all elements (category container and its control buttons) that share the given category id in their data-category attribute
function get_elements_by_category(category_id) {
    const elements = [];
    for (const element of content.querySelectorAll("[data-category]"))
        if (element.dataset.category === category_id)
            elements.push(element);
    return elements;
}

// Recursively searches the category tree for a category with the given id, returns the category object or null
function find_category_by_id(category_id, list = categories) {
    for (const category of list) {
        if (category.id === category_id) return category;

        if (category.subcategories?.length) {
            const found = find_category_by_id(category_id, category.subcategories);
            if (found) return found;
        }
    }
    return null;
}

// Recursively searches the category tree and returns the array that directly contains the category with the given id, either the top level categories array or a parent's subcategories array
function get_category_siblings(category_id, list = categories) {
    for (const category of list) {
        if (category.id === category_id) return list;

        if (category.subcategories?.length) {
            const found = get_category_siblings(category_id, category.subcategories);
            if (found) return found;
        }
    }
    return null;
}

// Recursively calculates the nesting depth of a category, top level categories are depth 1
function get_category_depth(category_id, list = categories, depth = 1) {
    for (const category of list) {
        if (category.id === category_id) return depth;

        if (category.subcategories?.length) {
            const found_depth = get_category_depth(category_id, category.subcategories, depth + 1);
            if (found_depth) return found_depth;
        }
    }
    return null;
}

// Recursively flattens every descendant subcategory of a category into a single array, used when cascading operations like deletion
function flatten_subcategories(category) {
    let result = [];
    for (const subcategory of category.subcategories || []) {
        result.push(subcategory);
        result = result.concat(flatten_subcategories(subcategory));
    }
    return result;
}

// Resolves the effective subcategory position of a category, falling back to the global plugin default when set to "default"
function resolve_subcategory_position(category) {
    return category.subcategory_position === "default" ? cfg_use['default_subcategory_position'] : category.subcategory_position;
}

// Recursively checks whether the given id already exists anywhere in the category tree, top level categories or nested subcategories at any depth
function is_id_taken(id, list = categories) {
    for (const category of list) {
        if (category.id === id) return true;

        if (category.subcategories?.length && is_id_taken(id, category.subcategories))
            return true;
    }
    return false;
}

// Generates a new category id based on the current timestamp, retrying until an id is found that is not already used anywhere in the category tree
function generate_unique_category_id() {
    let new_id = `${Date.now()}`;
    while (is_id_taken(new_id))
        new_id = `${Date.now()}`;
    return new_id;
}