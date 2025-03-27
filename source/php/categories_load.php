<?
// Check if plugin name is provided
if (!isset($_GET['plugin']))
    die(json_encode(["error" => "Plugin name is missing."]));
$plugin = $_GET['plugin'];

// Define paths
$plugin_dir = "/boot/config/plugins/{$plugin}";
$categories_file = "{$plugin_dir}/categories.json";

// Ensure plugin directory exists
if (!is_dir($plugin_dir)) {
    if (!mkdir($plugin_dir, 0755, true))
        die(json_encode(["error" => "Failed to create plugin directory."]));
}

// Default value: empty array
$default_config = [];
$backup_created = false;
$backup_path = '';

// Check if file exists and handle invalid JSON
if (file_exists($categories_file)) {
    $categories_data = json_decode(file_get_contents($categories_file), true);

    if ($categories_data === null) {
        // Create backup of invalid file
        $timestamp = time();
        $backup_path = "{$plugin_dir}/{$timestamp}-categories.json";

        if (rename($categories_file, $backup_path))
            $backup_created = true;
        else
            die(json_encode(["error" => "Failed to create backup of invalid file."]));
    }
}

// If file doesn't exist (or was invalid and moved), create new one
if (!file_exists($categories_file)) {
    if (file_put_contents($categories_file, json_encode($default_config, JSON_PRETTY_PRINT)) === false)
        die(json_encode(["error" => "Failed to create new categories file."]));

    // Reload data after creation
    $categories_data = $default_config;

    // If we created a backup, include that info in response
    if ($backup_created)
        die(json_encode([
            "data" => $categories_data,
            "warning" => "Invalid JSON detected. Original file backed up to: {$backup_path}"
        ]));
}

// Output JSON
die(json_encode(["data" => $categories_data]));
?>