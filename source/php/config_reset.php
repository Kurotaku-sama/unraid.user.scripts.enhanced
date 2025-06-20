<?
// Check if plugin name is provided
if (!isset($_GET['plugin']))
    die(json_encode(["error" => "Plugin name is missing."]));
$plugin = $_GET['plugin'];

// Check if type is provided
if (!isset($_GET['type']))
    die(json_encode(["error" => "Type is missing."]));
$type = $_GET['type'];

// Determine file path based on type
switch ($type) {
    case 'categories':
        $target_path = "/boot/config/plugins/$plugin/categories.json";
        break;
    case 'config':
        $target_path = "/boot/config/plugins/$plugin/$plugin.cfg";
        break;
    default:
        die(json_encode(["error" => "Invalid type specified."]));
}

// Delete target file if it exists
if (file_exists($target_path)) {
    if (!unlink($target_path))
        die(json_encode(["error" => "Failed to remove file."]));
    die(json_encode(["success" => "File successfully deleted."]));
} else {
    die(json_encode(["warning" => "File does not exist, nothing to delete."]));
}
?>