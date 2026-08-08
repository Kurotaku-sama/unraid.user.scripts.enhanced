<?
// Iterates over every script folder inside the given scripts directory, skipping "." / ".." entries and anything that is not a directory
// The callback receives the folder name and its full path for every valid script folder found
function iterate_script_folders($dir_scripts, $callback) {
    $scripts = scandir($dir_scripts);

    foreach ($scripts as $script_folder) {
        if ($script_folder === "." || $script_folder === "..") continue;

        $script_path = "$dir_scripts/$script_folder";
        if (!is_dir($script_path)) continue;

        $callback($script_folder, $script_path);
    }
}
?>