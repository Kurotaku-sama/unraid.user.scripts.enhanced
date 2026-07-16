// ========================
// Validations
// ========================

// Validates a category name, uniqueness is only checked within the given sibling list (same level of the tree), not globally
function validate_category_name(input, sibling_list, original_name = null) {
    let category_name = input.trim();
    if (!category_name) {
        swal.showInputError("❌ The category name cannot be empty!");
        return false;
    }
    if (category_name.length > 40) {
        swal.showInputError("❌ The category name cannot be longer than 40 characters!");
        return false;
    }
    if (category_name.toLowerCase() === "uncategorized") {
        swal.showInputError(`❌ The category name cannot be "${category_name}"!`);
        return false;
    }
    if (original_name && original_name === category_name) {
        swal.showInputError("❌ The new category name cannot be the same as the original name!");
        return false;
    }
    // Checks case insensitively whether a sibling with the same name already exists, since category names only need to be unique among their own siblings, not across the whole tree
    let category_exists = sibling_list.some(cat => cat.name.toLowerCase() === category_name.toLowerCase());
    if (category_exists) {
        swal.showInputError("❌ A category with this name already exists on this level!");
        return false;
    }
    return category_name;
}

// Normalizes the order field at every level of the category tree, reordering and persisting only if any level was not sequential
function validate_categories_order(data) {
    const { list, changed } = normalize_category_level(data);

    if (changed) {
        console.log("🔄 Reordering categories to maintain correct order...");
        perform_save(list);
    }

    return list;
}

// Recursively normalizes the "order" field of a single level of the category tree so it always forms a gapless sequence starting at 1
// A level is only rewritten when needed: the current order values are checked for being already sequential first, avoiding an unnecessary sort and save on every page load
// Sorting is done by the existing order value so the relative order the user last saved is preserved, only the numeric values themselves get corrected
function normalize_category_level(list) {
    // Assume the level is already sequential until a mismatch is found
    let is_sequential = true;
    for (let i = 0; i < list.length; i++) {
        // A sequential level means every category's order field matches its zero based array index plus one
        if (list[i].order !== i + 1) {
            is_sequential = false;
            break;
        }
    }

    let sorted_list = list;
    let level_changed = false;

    if (!is_sequential) {
        // Sort by the existing (possibly gappy or duplicated) order value first, then overwrite it with a clean sequential value based on the resulting position
        sorted_list = [...list].sort((a, b) => a.order - b.order);
        sorted_list.forEach((category, index) => (category.order = index + 1));
        level_changed = true;
    }

    // Recurse into every subcategory list, a child level being reordered also counts as a change on the overall tree
    sorted_list.forEach(category => {
        if (Array.isArray(category.subcategories) && category.subcategories.length) {
            const child_result = normalize_category_level(category.subcategories);
            category.subcategories = child_result.list;
            if (child_result.changed) 
                level_changed = true;
        }
    });

    return { list: sorted_list, changed: level_changed };
}

// Sanitizes a space separated list of custom CSS classes entered by the user before it is applied as a category's custom_class value
function sanitize_category_classes(input) {
    // Strips every character that is not a letter, digit, hyphen, underscore or space, since those are the only characters allowed inside a valid CSS class name
    const cleaned = input.replace(/[^a-zA-Z0-9_\- ]/g, "");
    // Splits the cleaned string into individual class names and strips any leading digits from each one, since a CSS class name is not allowed to start with a number
    const classes = cleaned.split(" ").map(class_name => class_name.replace(/^[0-9]+/, ""));
    // Rejoins the sanitized class names back into a single string and enforces the overall 30 character limit
    return classes.join(" ").substring(0, 30);
}
