<?
require_once __DIR__ . "/script_helper.php";

// Define directories
$dir_userscripts = "/boot/config/plugins/user.scripts";
$dir_scripts = "$dir_userscripts/scripts";

// Array to store deleted files
$deleted_files = [];

// Iterate through all script folders
iterate_script_folders($dir_scripts, function($script_folder, $script_path) use (&$deleted_files) {
    // Check if "description" file exists
    $description_file = "$script_path/description";
    if (!file_exists($description_file)) return;

    // Read the content of the "description" file
    $description_content = trim(file_get_contents($description_file));

    // If the content matches the default text, delete the file
    if (strpos($description_content, "No description<br>(/boot/config/plugins/user.scripts/scripts/") === 0) {
        unlink($description_file);
        $deleted_files[] = "$script_folder/description";
    }
});

// Return the results
echo json_encode([
    "success" => true,
    "deleted_files" => $deleted_files
]);
