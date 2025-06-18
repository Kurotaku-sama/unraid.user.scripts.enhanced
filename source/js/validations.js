// ========================
// Validations
// ========================

function validate_category_name(input, original_name = null) {
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
    let category_exists = categories.some(cat => cat.name.toLowerCase() === category_name.toLowerCase());
    if (category_exists) {
        swal.showInputError("❌ A category with this name already exists!");
        return false;
    }
    if (/["\\]/.test(category_name)) {
        swal.showInputError("❌ The category name cannot contain double quotes (\") or backslashes (\\)!");
        return false;
    }
    return category_name;
}

function validate_categories_order(data) {
    // Check if the order values are already sequential and start from 1
    let is_sequential = true;
    for (let i = 0; i < data.length; i++) {
        if (data[i].order !== i + 1) {
            is_sequential = false;
            break;
        }
    }
    // If not sequential, reorder the categories
    if (!is_sequential) {
        console.log("🔄 Reordering categories to maintain correct order...");
        // Sort the categories by their current order
        let sorted_categories = [...data].sort((a, b) => a.order - b.order);

        // Assign new sequential order starting from 1
        sorted_categories.forEach((category, index) => {
            category.order = index + 1;
        });
        categories_prepare_save(sorted_categories);
        return sorted_categories;
    }
    // If already sequential, return the original data
    return data;
}