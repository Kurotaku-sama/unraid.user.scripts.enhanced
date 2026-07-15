// ========================
// Helper Functions
// ========================
// Generic utilities shared across multiple scripts, script specific logic belongs in its own dedicated file instead

function wait_for_element(selector, container = document.documentElement) {
    return new Promise(resolve => {
        const node = container.querySelector(selector)
        if (node) return resolve(node)

        const observer = new MutationObserver(() => {
            const el = container.querySelector(selector)
            if (el) {
                observer.disconnect()
                resolve(el)
            }
        })

        observer.observe(container, {
            childList: true,
            subtree: true
        })
    })
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

// Recursively calculates how many additional levels a category's deepest nested subcategory occupies relative to the category itself, a category without subcategories returns 0
function get_subtree_relative_depth(category) {
    if (!category.subcategories.length) return 0;
    return 1 + Math.max(...category.subcategories.map(get_subtree_relative_depth));
}

// Recursively flattens the entire category tree into a Map keyed by category id, used to look up the full category object while rebuilding the tree from a DOM structure
function build_category_id_map(list, map = new Map()) {
    for (const category of list) {
        map.set(category.id, category);
        if (category.subcategories.length)
            build_category_id_map(category.subcategories, map);
    }
    return map;
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

// Opens a popup explaining the custom cron schedule format, content is static and therefore safe to hardcode without escaping
function open_cron_info() {
    const html = `
        Custom schedule format (standard cron entry):<br>
        <tt>┌───────────── minute (0 - 59)<br></tt>
        <tt>│ ┌───────────── hour (0 - 23)<br></tt>
        <tt>│ │ ┌───────────── day of month (1 - 31)<br></tt>
        <tt>│ │ │ ┌───────────── month (1 - 12)<br></tt>
        <tt>│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)<br></tt>
        <tt>│ │ │ │ │<br></tt>
        <tt>│ │ │ │ │<br></tt>
        <tt>│ │ │ │ │<br></tt>
        <tt>* * * * *</tt><br>
        See <a href="https://en.wikipedia.org/wiki/Cron" target="_blank">here</a> for examples, or <a href="https://crontab.guru/" target="_blank">here</a> for an online generator.
    `;

    swal({
        title: "What is Cron",
        text: html,
        html: true,
        customClass: "swal-responsive-fix cron-info-swal",
    });
}

// Rebuilds the original "User Scripts" credits popup as a native styled swal, content is static and mirrors the original plugin's tooltip exactly
function open_credits() {
    const html = `
        <table align="center" style="background-color:initial;">
            <tr>
                <td><img src="https://github.com/Squidly271/plugin-repository/raw/master/Chode_300.gif" width="50px" height="48px"></td>
                <td style="background-color:initial;"><strong>Andrew Zawadzki</strong></td>
                <td>Main Development</td>
            </tr>
        </table>
        <br>
        <em><font size="1">Copyright 2016-2024 Andrew Zawadzki</font></em><br>
        <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7M7CBCVU732XG" target="_blank">
            <img src="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif">
        </a>
        <br><br>
        <a href="https://forums.lime-technology.com/topic/48286-plugin-ca-user-scripts/" target="_blank">Plugin Support Thread</a>
    `;

    swal({
        title: "CA User Scripts",
        text: html,
        html: true,
        imageUrl: `/plugins/user.scripts/images/user.scripts.png`,
        customClass: "swal-responsive-fix",
    });
}