<?
require_once __DIR__ . "/script_helper.php";

// Define directories
$dir_userscripts = "/boot/config/plugins/user.scripts";
$dir_scripts = "$dir_userscripts/scripts";

// Array to store script names and their counts
$script_names = [];
$duplicates = [];

// Iterate through all script folders
iterate_script_folders($dir_scripts, function($script_folder, $script_path) use (&$script_names) {
    // Check if "name" file exists
    $name_file = "$script_path/name";
    if (!file_exists($name_file)) return;

    // Read and clean the name from the "name" file
    $name_content = trim(file_get_contents($name_file));
    $cleaned_name_content = preg_replace('/\s+/', ' ', $name_content); // Replace multiple spaces with a single space

    // Track script names and their folder names
    if (isset($script_names[$cleaned_name_content]))
        $script_names[$cleaned_name_content]['folders'][] = $script_folder;
    else
        $script_names[$cleaned_name_content] = ["folders" => [$script_folder]];
});

// Find duplicates
foreach ($script_names as $name => $data)
    if (count($data["folders"]) > 1)
        $duplicates[$name] = $data["folders"];

// Return the results
echo json_encode([
    "success" => true,
    "duplicates" => $duplicates
]);
