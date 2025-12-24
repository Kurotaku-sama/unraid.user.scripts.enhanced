<?
// Define the target directory
$tmp_directory = "/tmp/user.scripts";
$running_directory = "{$tmp_directory}/running";
$finished_directory = "{$tmp_directory}/finished";

// Check if the running or finished directories exist and contain files
if (is_dir($running_directory) && count(scandir($running_directory)) > 2)
    die(json_encode(["error" => "Cannot delete folder. Files exist in 'running' directory."]));

if (is_dir($finished_directory) && count(scandir($finished_directory)) > 2)
    die(json_encode(["error" => "Cannot delete folder. Files exist in 'finished' directory."]));

// Check if the /tmp/user.scripts directory exists before attempting deletion
if (!is_dir($tmp_directory))
    die(json_encode(["error" => "Directory does not exist."]));

// Directly delete the entire /tmp/user.scripts directory
exec("rm -rf " . escapeshellarg($tmp_directory), $output, $return_var);

die(json_encode(["success" => !file_exists($tmp_directory) ? "Directory deleted successfully." : "Failed to delete directory."]));
?>
