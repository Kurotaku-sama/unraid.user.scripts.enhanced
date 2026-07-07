$(function() {
    // Update Check
    if (typeof caPluginUpdateCheck === "function")
        caPluginUpdateCheck("user.scripts.enhanced.plg",{name:"User Scripts Enhanced"});

    // Turn View Mode Highlighing to multi select
    $("#view_mode_highlighting").dropdownchecklist({
        emptyText: "None",
        width: "auto",
    });

    // CodeMirror
    let custom_css = CodeMirror.fromTextArea(document.getElementById("custom_css"), {
        lineNumbers: true,
        mode: "css",
        theme: theme,
        indentUnit: 2,
    });
    custom_css.setSize(300, 100);
});

async function export_data(trigger, type) {
    disable_button(trigger);
    const url = `/plugins/${plugin}/php/export.php?plugin=${plugin}&type=${type}`;
    try {
        const response = await fetch(url);
        if (!response.ok) return;
        const blob = await response.blob();
        const object_url = URL.createObjectURL(blob);
        const filename = response.headers.get("Content-Disposition")?.split("filename=")[1] ?? `export_${type}`;
        document.body.insertAdjacentHTML("beforeend", `<a id="tmp-export-link" href="${object_url}" download="${filename}" style="display:none;"></a>`);
        document.getElementById("tmp-export-link").click();
        document.getElementById("tmp-export-link").remove();
        URL.revokeObjectURL(object_url);
    } catch (error) {
        console.error("❌ Export error:", error);
    }
}

function confirmation_swal(title, text, callback) {
    swal({
        title: title,
        text: text,
        html: true,
        type: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No",
        closeOnConfirm: false,
        dangerMode: true,
        customClass: "swal-responsive-fix",
    }, function(confirm) {
        if (!confirm) return;
        callback();
    });
}

function reset_plugin_data(trigger, type) {
    disable_button(trigger);
    let title = "Are you sure?"
    let text;
    switch (type) {
        case "config":
            text = "Do you really want to reset the configuration to default?<br>This action cannot be undone!";
            break;
        case "categories":
            text = "Do you really want to reset all categories?<br>This action cannot be undone!";
            break;
        default:
            console.error("Invalid type:", type);
            return;
    }

    confirmation_swal(title, text, async function() {
        try {
            const response = JSON.parse(await $.get(`/plugins/${plugin}/php/config_reset.php`, {
                plugin: plugin,
                type: type
            }));
            if (response.error)
                throw new Error(response.error);
            else if (response.success)
                swal("Success", response.success, "success");
            else if (response.warning)
                swal("Warning", response.warning, "warning");
            else
                throw new Error("Invalid response from server");
        } catch (error) {
            console.error("❌ Error:", error);
            swal("Error", error || "An unknown error occurred.", "error");
        }
    });
}

function delete_tmp_userscripts(trigger) {
    disable_button(trigger);
    confirmation_swal(
        "Are you sure?",
        "Do you really want to delete the /tmp/user.scripts/ folder?<br>This action cannot be undone!",
        async function() {
            try {
                const response = JSON.parse(await $.get(`/plugins/${plugin}/php/tmp_delete.php`));
                if (response.error)
                    throw new Error(response.error);

                swal("Success", "The folder was deleted successfully.", "success");
            } catch (error) {
                console.error("❌ Error:", error);
                swal("Error", error || "An unknown error occurred.", "error");
            }
        }
    );
}

async function delete_description_files_without_description(trigger) {
    disable_button(trigger);
    confirmation_swal(
        "Are you sure?",
        "Do you really want to delete description files without description?<br>This action cannot be undone!",
        async function() {
            try {
                swal({
                    title: "Please wait...",
                    text: "Deleting description files without description.",
                    type: "info",
                });

                const response = JSON.parse(await $.get(`/plugins/${plugin}/php/delete_description_files_without_description.php`));
                if (response.error)
                    throw new Error(response.error);

                // Determine the icon and message based on the results
                const icon = response.deleted_files.length > 0 ? "success" : "info";
                const message = response.deleted_files.length > 0
                    ? `The following description files were deleted:\n\n${response.deleted_files.map(file => `${file}`).join("\n")}`
                    : "No description files without description were found.";

                swal({
                    title: icon === "success" ? "Success" : "Info",
                    text: message,
                    type: icon,
                    customClass: "swal-responsive-fix",
                });
            } catch (error) {
                console.error("❌ Error:", error);
                swal("Error", error || "An unknown error occurred.", "error");
            }
        }
    );
}

async function get_not_matching_scriptnames(trigger) {
    disable_button(trigger);
    try {
        swal({
            title: "Please wait...",
            text: "Checking for script folders that do not match their 'name' file.",
            type: "info"
        });

        const response = JSON.parse(await $.get(`/plugins/${plugin}/php/get_not_matching_scriptnames.php`));
        if (response.error)
            throw new Error(response.error);

        // Create list items for not matching script names
        if (response.not_matching.length > 0) {
            let not_matching = response.not_matching.map(folder => {
                const safe_old_name = escape_html(folder.old_name);
                const safe_new_name = escape_html(folder.new_name);
                return `<li>"${safe_old_name}" <span class="li-arrow">→</span> "${safe_new_name}"</li>`;
            }).join("");

            swal({
                title: "Not Matching Script Names",
                text: `
                    The following script folders do not match their 'name' file:<br><br>
                    <ul id="ul-output"><li class="li-headline">Folder Name → Name of Script</li>${not_matching}</ul>
                `,
                html: true,
                type: "info",
                customClass: "swal-responsive-fix",
            });
        }
        else
        swal({
            title: "No mismatches found",
            text: `All folder names correctly match their corresponding script names.`,
            type: "success"
        });
    } catch (error) {
        console.error("❌ Error:", error);
        swal("Error", error || "An unknown error occurred.", "error");
    }
}

async function get_duplicate_scriptnames(trigger) {
    disable_button(trigger);
    try {
        swal({
            title: "Please wait...",
            text: "Checking for duplicate script names.",
            type: "info"
        });

        const response = JSON.parse(await $.get(`/plugins/${plugin}/php/get_duplicate_scriptnames.php`));
        if (response.error)
            throw new Error(response.error);

        // Determine the icon and message based on the results
        const icon = Object.keys(response.duplicates).length > 0 ? "success" : "info";
        let message = Object.keys(response.duplicates).length > 0
            ? "The following script names are duplicated:<br><br>"
            : "No duplicate script names found.";

        // Build the message with script names and folder names
        if (Object.keys(response.duplicates).length > 0) {
            message += `<ul id="ul-output">`;
            for (const [script_name, folders] of Object.entries(response.duplicates)) {
                const safe_script_name = escape_html(script_name);
                message += `<ul><li class="li-headline">Name: ${safe_script_name}</li>`;
                folders.forEach(folder => {
                    const safe_folder = escape_html(folder);
                    message += `<li>&nbsp;- ${safe_folder}</li>`;
                });
                message += `</ul></li>`;
            }
        }

        swal({
            title: "Duplicate Script Names",
            text: message,
            html: true,
            type: icon
        });
    } catch (error) {
        console.error("❌ Error:", error);
        swal("Error", error.message || "An unknown error occurred.", "error");
    }
}

function disable_button(trigger) {
    const btn = $(trigger);
    btn.prop("disabled", true);
    btn.removeAttr("onclick");
}