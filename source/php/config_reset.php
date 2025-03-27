<?
// Check if plugin name is provided
if (!isset($_GET['plugin']))
    die(json_encode(["error" => "Plugin name is missing."]));
$plugin = $_GET['plugin'];

// Check if type is provided
if (!isset($_GET['type']))
    die(json_encode(["error" => "Type is missing."]));
$type = $_GET['type'];

// Ensure plugin directory exists
$plugin_dir = "/boot/config/plugins/$plugin";
if (!is_dir($plugin_dir)) {
    if (!mkdir($plugin_dir, 0755, true))
        die(json_encode(["error" => "Failed to create plugin directory."]));
}

// Determine file paths based on type
switch ($type) {
    case 'categories':
        $target_path = "/boot/config/plugins/$plugin/categories.json";
        $source_path = "/usr/local/emhttp/plugins/$plugin/default_config/categories.json";
        $default_content = "[]";
        break;
    case 'config':
        $target_path = "/boot/config/plugins/$plugin/$plugin.cfg";
        $source_path = "/usr/local/emhttp/plugins/$plugin/default_config/$plugin.cfg";
        $default_content = null;
        break;
    default:
        die(json_encode(["error" => "Invalid type specified."]));
}

// Delete target file if it exists
if (file_exists($target_path) && !unlink($target_path))
    die(json_encode(["error" => "Failed to remove existing file."]));

// Handle different scenarios
if (file_exists($source_path)) {
    // Case 1: Source exists - copy it
    if (!copy($source_path, $target_path))
        die(json_encode(["error" => "Failed to reset file."]));

    die(json_encode(["success" => "File successfully reset to default."]));
}
elseif ($type === 'categories') {
    // Case 2: Missing categories - create empty
    if (file_put_contents($target_path, $default_content) === false)
        die(json_encode(["error" => "Failed to create empty categories file."]));

    die(json_encode(["warning" => "Reset completed with empty categories (original file not found)."]));
}
else {
    // Case 3: Missing config - just report deletion
    die(json_encode(["warning" => "Config file removed. It will be recreated with default values when the plugin settings are saved next time."]));
}
?>