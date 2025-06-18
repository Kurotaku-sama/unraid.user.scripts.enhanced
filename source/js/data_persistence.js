// ========================
// Data Persistence
// ========================

let is_saving = false;
let can_save = true;
let countdown_interval = null;

function stop_saving() {
    if (countdown_interval) {
        clearInterval(countdown_interval);
        countdown_interval = null;
    }

    const save_panel = document.getElementById('save-panel');
    if (save_panel) {
        save_panel.style.opacity = 0;
        setTimeout(() => save_panel.remove(), 300);
    }

    is_saving = false;
}

async function categories_prepare_save(categories_to_save) {
    if (is_saving) return;
    is_saving = true;

    if(can_save == false) {
        swal("Save not possible", "The categories had changed on another instance, reload the page to be able to save again!", "error");
        is_saving = false;
        return false;
    }

    let delay = parseInt(cfg_save_delay);

    if (delay === 0) {
        await perform_save(categories_to_save);
        return;
    }

    const html = `
        <div id="save-panel">
            Saving in: <span id="save-timer">${delay}</span> Seconds
        </div>
    `;

    content.insertAdjacentHTML("beforeend", html);
    const save_panel = document.getElementById("save-panel");
    save_panel.style.opacity = 0;
    setTimeout(() => save_panel.style.opacity = 1, 10);

    const timer_element = document.getElementById("save-timer");
    countdown_interval = setInterval(async () => {
        delay--;
        timer_element.textContent = delay;

        if (delay <= 0) {
            await perform_save(categories_to_save);
            stop_saving();
        }
    }, 1000);
}

async function perform_save(categories_to_save) {
    stop_saving();

    if(can_save == false) {
        swal("Save not possible", "The categories had changed on another instance, reload the page to be able to save again!", "error");
        return false;
    }

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
    }
}

async function categories_load() {
    try {
        const data = await $.getJSON(`/plugins/${cfg_plugin}/php/categories_load.php?plugin=${cfg_plugin}`);
        // Check if the response contains an error
        if (data.error)
            throw new Error(data.error); // Throw an error with the server error message

        // Handle warnings if present
        if (data.warning)
            swal({title: "Warning", text: data.warning, icon: "warning"});
        return validate_categories_order(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
        console.error("❌ Load error:", error);
        swal("Load Failed", error || "An unknown error occurred while loading categories.", "error");
        return [];
    }
}

async function categories_save(categories_to_save) {
    if(can_save == false) {
        swal("Save not possible", "The categories had changed on another instance, reload the page to be able to save again!", "error");
        return false;
    }

    try {
        // Use the passed categories or fall back to the global `categories` variable
        const categories_data = JSON.stringify(categories_to_save || categories);
        const response = JSON.parse(await $.post(`/plugins/${cfg_plugin}/php/categories_save.php`, {
            plugin: cfg_plugin,
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