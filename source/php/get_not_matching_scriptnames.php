<?
// Define directories
$dir_userscripts = "/boot/config/plugins/user.scripts";
$dir_scripts = "$dir_userscripts/scripts";

// Array to store not matching script names
$not_matching = [];

// Iterate through all script folders
$scripts = scandir($dir_scripts);
foreach ($scripts as $script_folder) {
    if ($script_folder === "." || $script_folder === "..") continue;

    $script_path = "$dir_scripts/$script_folder";
    if (!is_dir($script_path)) continue;

    // Check if "name" file exists
    $name_file = "$script_path/name";
    if (!file_exists($name_file)) {
        $not_matching[] = [
            "old_name" => $script_folder,
            "new_name" => "No 'name' file found"
        ];
        continue;
    }

    // Read and clean the name from the "name" file
    $name_content = trim(file_get_contents($name_file));
    $cleaned_name_content = preg_replace('/\s+/', ' ', $name_content); // Replace multiple spaces with a single space

    // If folder name does not match the cleaned name, add to the list
    if ($script_folder !== $cleaned_name_content) {
        $not_matching[] = [
            "old_name" => $script_folder,
            "new_name" => $cleaned_name_content
        ];
    }
}

// Return the results
echo json_encode([
    "success" => true,
    "not_matching" => $not_matching
]);