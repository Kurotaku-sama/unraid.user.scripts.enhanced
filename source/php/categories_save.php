<?
// Check if plugin name is provided
if (!isset($_POST['plugin']))
    die(json_encode(["error" => "Plugin name is missing."]));
$plugin = $_POST['plugin'];

// Define paths
$plugin_dir = "/boot/config/plugins/{$plugin}";
$categories_file = "{$plugin_dir}/categories.json";

// Ensure plugin directory exists
if (!is_dir($plugin_dir)) {
    if (!mkdir($plugin_dir, 0755, true))
        die(json_encode(["error" => "Failed to create plugin directory."]));
}

// Correctly read POST data
$categories_data = isset($_POST['categories']) ? json_decode($_POST['categories'], true) : null;

// Validate received data
if ($categories_data === null || !is_array($categories_data))
    die(json_encode(["error" => "Invalid data received."]));

// Save new configuration
file_put_contents($categories_file, json_encode($categories_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
die(json_encode(["success" => "Configuration saved successfully!"]));
?>