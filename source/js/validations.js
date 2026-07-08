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
    let category_exists = sibling_list.some(cat => cat.name.toLowerCase() === category_name.toLowerCase());
    if (category_exists) {
        swal.showInputError("❌ A category with this name already exists on this level!");
        return false;
    }
    return category_name;
}

// Recursively normalizes the order field at every level of the category tree, reordering and persisting only if a level was not sequential
function validate_categories_order(data) {
    let needs_save = false;

    function normalize_level(list) {
        let is_sequential = true;
        for (let i = 0; i < list.length; i++) {
            if (list[i].order !== i + 1) {
                is_sequential = false;
                break;
            }
        }

        let sorted_list = list;
        if (!is_sequential) {
            sorted_list = [...list].sort((a, b) => a.order - b.order);
            sorted_list.forEach((category, index) => (category.order = index + 1));
            needs_save = true;
        }

        sorted_list.forEach(category => {
            if (Array.isArray(category.subcategories) && category.subcategories.length)
                category.subcategories = normalize_level(category.subcategories);
        });

        return sorted_list;
    }

    const result = normalize_level(data);

    if (needs_save) {
        console.log("🔄 Reordering categories to maintain correct order...");
        perform_save(result);
    }

    return result;
}

// Sanitizes a space separated list of custom CSS classes: keeps only letters, numbers, hyphens, underscores and spaces, then strips leading digits from every individual class name since CSS class names cannot start with a number, also enforces the 30 character limit
function sanitize_category_classes(input) {
    const cleaned = input.replace(/[^a-zA-Z0-9_\- ]/g, "");
    const classes = cleaned.split(" ").map(class_name => class_name.replace(/^[0-9]+/, ""));
    return classes.join(" ").substring(0, 30);
}
