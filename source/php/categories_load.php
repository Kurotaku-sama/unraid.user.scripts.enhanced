<?
$plugin = "user.scripts.enhanced";

// Define paths
$plugin_dir = "/boot/config/plugins/{$plugin}";
$categories_file = "{$plugin_dir}/categories.json";

// Ensure plugin directory exists
if (!is_dir($plugin_dir))
    if (!mkdir($plugin_dir, 0755, true))
        die(json_encode(["error" => "Failed to create plugin directory."]));

// Default value: empty array
$default_config = [];
$backup_created = false;
$backup_path = '';

// Check if file exists and handle invalid JSON
if (file_exists($categories_file)) {
    $categories_data = json_decode(file_get_contents($categories_file), true);

    if ($categories_data === null) {
        // The stored file is corrupted or not valid JSON, it is renamed instead of deleted so the original content is never lost and can still be inspected or recovered manually later
        $timestamp = time();
        $backup_path = "{$plugin_dir}/{$timestamp}-categories.json";

        if (rename($categories_file, $backup_path))
            $backup_created = true;
        else
            die(json_encode(["error" => "Failed to create backup of invalid file."]));
    }
}

// Runs both for a fresh install where the file never existed, and for the case above where the invalid file was just renamed away, in both cases a fresh empty categories file needs to exist afterward
if (!file_exists($categories_file)) {
    if (file_put_contents($categories_file, json_encode($default_config, JSON_PRETTY_PRINT)) === false)
        die(json_encode(["error" => "Failed to create new categories file."]));

    // Reload data after creation
    $categories_data = $default_config;

    // Only reached if the file was missing because of the invalid JSON backup above, includes the warning in the response so the frontend can inform the user their old categories got backed up instead of lost
    if ($backup_created)
        die(json_encode([
            "data" => $categories_data,
            "warning" => "Invalid JSON detected. Original file backed up to: {$backup_path}"
        ]));
}

// Output JSON
die(json_encode(["data" => $categories_data]));
?>