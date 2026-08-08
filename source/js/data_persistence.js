// ========================
// Data Persistence
// ========================

let can_save = true;
let is_saving = false;

// Central save entry point used by every feature that mutates the category tree, prevents overlapping saves and detects if another browser tab or instance already changed the data on the server before this save can go through
async function perform_save(categories_to_save) {
    // If another save is already running, wait until it finishes before starting this one
    while (is_saving)
        await new Promise(resolve => setTimeout(resolve, 100));

    if (can_save === false) {
        swal("Save not possible", "The categories had changed on another instance, reload the page to be able to save again!", "error");
        return false;
    }

    is_saving = true;

    let save_success;
    try {
        // Re-fetches the currently stored categories and compares them against the snapshot taken the last time this tab successfully loaded or saved, if they differ someone else has written to the file in the meantime and this save must be blocked to avoid silently overwriting their changes
        const { list: fetched_categories } = await load_and_normalize_categories();

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
                if (confirm)
                    location.reload();
            });
            return false;
        }

        save_success = await categories_save(categories_to_save);

        // Only refresh the comparison snapshot after a confirmed successful write, updating it earlier (e.g. right when the save starts) would make a legitimate concurrent change on another tab go undetected
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

// Fetches the saved category tree from the server and normalizes its order field, returns both the resulting list and whether any level had to be corrected
// Used by the initial page load and by perform_save's conflict check, the caller decides when it is safe to persist a correction, persisting it before original_categories is assigned would make the conflict check above compare against a stale empty snapshot and raise a false "Conflict Detected" warning
async function load_and_normalize_categories() {
    try {
        const data = await $.getJSON(`/plugins/${plugin}/php/categories_load.php`);

        // Check if the response contains an error
        if (data.error)
            throw new Error(data.error); // Throw an error with the server error message

        // Handle warnings if present
        if (data.warning)
            swal({title: "Warning", text: data.warning, icon: "warning"});

        return normalize_category_level(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
        // If the request was canceled by the browser → Do NOT display
        if (error.status === 0 && error.readyState === 0) {
            console.warn("⚠️ Load was aborted or interrupted by browser reload.");
            return { list: [], changed: false };
        }

        console.error("❌ Load error:", error);
        swal("Load Failed", error || "An unknown error occurred while loading categories.", "error");
        return { list: [], changed: false };
    }
}

async function categories_save(categories_to_save) {
    if (can_save === false) {
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