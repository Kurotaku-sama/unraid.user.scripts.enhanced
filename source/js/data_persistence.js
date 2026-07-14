// ========================
// Data Persistence
// ========================

let can_save = true;
let is_saving = false;

async function perform_save(categories_to_save) {
    // If another save is already running, wait until it finishes before starting this one
    while (is_saving)
        await new Promise(resolve => setTimeout(resolve, 100));

    if (can_save == false) {
        swal("Save not possible", "The categories had changed on another instance, reload the page to be able to save again!", "error");
        return false;
    }

    is_saving = true;

    let save_success;
    try {
        const fetched_categories = await categories_load();

        if (JSON.stringify(fetched_categories) !== JSON.stringify(original_categories)) {
            can_save = false;
            swal({
                title: "Conflict Detected",
                text: "The categories have been modified already. Reload the page otherwise you can't save.",
                html: true,
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "Reload Page",
                cancelButtonText: "Cancel",
                dangerMode: true
            }, function(confirm) {
                if (confirm) location.reload();
            });
            return false;
        }

        save_success = await categories_save(categories_to_save);

        if (save_success)
            original_categories = $.extend(true, [], categories_to_save || categories);

        return save_success;
    } catch (error) {
        console.error("❌ Save preparation error:", error);
        return false;
    } finally {
        is_saving = false;
    }
}

async function categories_load() {
    try {
        const data = await $.getJSON(`/plugins/${plugin}/php/categories_load.php`);

        // Check if the response contains an error
        if (data.error)
            throw new Error(data.error); // Throw an error with the server error message

        // Handle warnings if present
        if (data.warning)
            swal({title: "Warning", text: data.warning, icon: "warning"});

        return validate_categories_order(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
        // If the request was canceled by the browser → Do NOT display
        if (error.status === 0 && error.readyState === 0) {
            console.warn("⚠️ Load was aborted or interrupted by browser reload.");
            return [];
        }

        console.error("❌ Load error:", error);
        swal("Load Failed", error || "An unknown error occurred while loading categories.", "error");
        return [];
    }
}

async function categories_save(categories_to_save) {
    if (can_save == false) {
        swal("Save not possible", "The categories had changed on another instance, reload the page to be able to save again!", "error");
        return false;
    }

    try {
        // Use the passed categories or fall back to the global `categories` variable
        const categories_data = JSON.stringify(categories_to_save || categories);
        const response = JSON.parse(await $.post(`/plugins/${plugin}/php/categories_save.php`, {
            categories: categories_data
        }));

        // Check if the response contains an error
        if (response.error)
            throw new Error(response.error); // Throw an error with the server error message

        return true;
    } catch (error) {
        console.error("❌ Save error:", error);
        swal("Save Failed", error || "An unknown error occurred while saving categories.", "error");
        return false;
    }
}