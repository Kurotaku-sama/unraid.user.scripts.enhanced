<?
if (!isset($_GET['plugin'])) {
    http_response_code(400); // Bad request
    die("Error: 'plugin' parameter is required.");
}
$plugin = $_GET['plugin'];

// Define paths
$source_dir = "/boot/config/plugins/user.scripts";
$plugin_dir = "/boot/config/plugins/$plugin";
$export_dir = "/tmp/$plugin";

// Get the type parameter
if (!isset($_GET['type'])) {
    http_response_code(400); // Bad request
    die("Error: 'type' parameter is required.");
}
$type = $_GET['type'];

// Validate the type
$allowed_types = ["raw", "bash", "config", "categories"];
if (!in_array($type, $allowed_types)) {
    http_response_code(400); // Bad request
    die("Error: Invalid type. Allowed values are 'raw', 'bash', 'config', or 'categories'.");
}

// Function to ensure a directory exists
function ensure_directory_exists($dir, $error_message) {
    if (!is_dir($dir)) {
        http_response_code(500);
        die($error_message);
    }
}

// Function to create a directory if it doesn't exist
function create_directory($dir, $error_message) {
    if (!is_dir($dir) && !mkdir($dir, 0777, true)) {
        http_response_code(500);
        die($error_message);
    }
}

// Function to generate the ZIP file path
function generate_zip_file_path() {
    global $export_dir, $type; // Access global variables

    $max_attempts = 3; // Maximum number of attempts
    $attempt = 0;

    while ($attempt < $max_attempts) {
        // Generate the filename with the current date and time in yyyy_mm_dd_hh_mm_ss format
        $timestamp = date("Y_m_d_H_i_s"); // Example: 2023_10_11_14_30_00
        $filename = "{$timestamp}_userscripts_{$type}.zip";
        $zip_file_path = "{$export_dir}/{$filename}";

        // Check if the file already exists
        if (!file_exists($zip_file_path))
            return $zip_file_path; // Return the unique file path

        $attempt++; // Increment attempt counter
        sleep(1); // Wait 1 second to update the timestamp
    }

    // If no unique filename is found after 3 attempts
    http_response_code(409); // Conflict status code
    die("Error: Could not generate a unique filename after {$max_attempts} attempts. Please try again.");
}

// Function to send a file to the browser
function send_file($file_path, $content_type) {
    if (!file_exists($file_path)) {
        http_response_code(500);
        die("Error: File not found.");
    }
    header("Content-Type: {$content_type}");
    header("Content-Disposition: attachment; filename=" . basename($file_path));
    header("Content-Length: " . filesize($file_path));
    die(readfile($file_path));
}

// Function to create a ZIP file
function create_zip($zip_file_path, $items_to_add, $source_dir) {
    chdir($source_dir); // Change to the source directory to ensure relative paths
    foreach ($items_to_add as $item) {
        if (file_exists($item[1])) {
            if ($item[0] === "file")
                $command = "zip -j {$zip_file_path} " . escapeshellarg($item[1]) . " 2>&1";  // Add files with -j (junk paths)
            elseif ($item[0] === "folder")
                $command = "zip -r {$zip_file_path} " . escapeshellarg($item[1]) . " 2>&1";  // Add folders with -r (recursive, preserve structure)

            // Execute the command
            exec($command, $output, $return_var);

            // Check if the command failed
            if ($return_var !== 0) {
                http_response_code(500);
                die("Error: Failed to add item to the ZIP file: {$item[1]}");
            }
        }
    }
}

// Function to delete the ZIP file, the temp directory with sh scripts and the /tmp/user.scripts.enhanced folder itself if not empty
function cleanup_after_download($zip_file_path, $temp_dir = null) {
    global $export_dir; // Use the global $export_dir variable
    $delete_delay = 60; // Delay in seconds before deletion starts

    // Build the cleanup command
    $command = "(sleep {$delete_delay}"; // Start the command with a delay (sleep for $delete_delay seconds)
    if ($temp_dir !== null) // Check if a temporary directory is provided
        $command .= " && rm -rf " . escapeshellarg($temp_dir); // If provided, add a command to delete the temporary directory and its contents
    $command .= " && rm -f " . escapeshellarg($zip_file_path); // Add a command to forcefully delete the ZIP file
    $command .= " && [ -z \"$(ls -A " . escapeshellarg($export_dir) . ")\" ]"; // Check if the export directory is empty (no files or subdirectories)
    $command .= " && rm -rf " . escapeshellarg($export_dir); // If the export directory is empty, delete it and its contents
    $command .= ") > /dev/null 2>&1 &"; // Suppress all output (stdout and stderr) and run the command in the background
    // Execute the command in the background using nohup
    exec("nohup bash -c '{$command}' > /dev/null 2>&1 &");
}

// Process based on the type
switch ($type) {
    case "raw":
        // Ensure the source directory exists
        ensure_directory_exists($source_dir, "Error: The 'user.scripts' directory does not exist. Please ensure the 'User Scripts' plugin is installed.");
        // Ensure the export directory exists
        create_directory($export_dir, "Error: Failed to create export directory.");
        $zip_file_path = generate_zip_file_path();

        // Raw mode: Add files and folders as-is
        $items_to_add = [
            ["file", "customSchedule.cron"],
            ["file", "schedule.json"],
            ["folder", "scripts"]
        ];
        create_zip($zip_file_path, $items_to_add, $source_dir);
        // Schedule cleanup in the background
        cleanup_after_download($zip_file_path, null);
        // Send the ZIP file to the browser
        send_file($zip_file_path, "application/zip");
        break;

    case "bash":
        // Ensure the source directory exists
        ensure_directory_exists($source_dir, "Error: The 'user.scripts' directory does not exist. Please ensure the 'User Scripts' plugin is installed.");

        // Ensure the export directory exists
        create_directory($export_dir, "Error: Failed to create export directory.");
        $zip_file_path = generate_zip_file_path();

        // Create a temporary directory for .sh files
        $timestamp = date("Y_m_d_H_i_s");
        $temp_dir = "{$export_dir}/temp_{$timestamp}";
        create_directory($temp_dir, "Error: Failed to create temporary directory.");

        // Bash mode: Process scripts and create .sh files
        $scripts_dir = "{$source_dir}/scripts";
        if (is_dir($scripts_dir) && is_readable($scripts_dir)) {
            $script_folders = new DirectoryIterator($scripts_dir);
            foreach ($script_folders as $folder) {
                if ($folder->isDir() && !$folder->isDot()) {
                    $folder_path = $folder->getPathname();
                    $name_file = "{$folder_path}/name";
                    $script_file = "{$folder_path}/script";

                    if (file_exists($name_file) && file_exists($script_file)) {
                        // Read the name and script content
                        $script_name = trim(file_get_contents($name_file));
                        $script_content = file_get_contents($script_file);
                        // Shorten the script name to a maximum of 50 characters
                        $script_name = substr($script_name, 0, 50);
                        $script_name = str_replace(" ", "_", $script_name); // Replace spaces with underscores

                        // Generate a unique filename
                        $sh_filename = "{$script_name}.sh";
                        $sh_file_path = "{$temp_dir}/{$sh_filename}";

                        // Check if the file already exists
                        $counter = 1;
                        while (file_exists($sh_file_path)) {
                            $sh_filename = "{$script_name}_" . microtime(true) . ".sh"; // Add microtime to ensure uniqueness
                            $sh_file_path = "{$temp_dir}/{$sh_filename}";
                        }

                        // Create the .sh file
                        if (file_put_contents($sh_file_path, $script_content) === false) {
                            http_response_code(500);
                            die("Error: Failed to create .sh file: {$sh_filename}");
                        }
                    }
                }
            }
        } else {
            http_response_code(500);
            die("Error: The 'scripts' directory is not accessible.");
        }

        // Create the ZIP file using the `zip` command
        $command = "zip -rj " . escapeshellarg($zip_file_path) . " " . escapeshellarg($temp_dir) . " 2>&1";
        exec($command, $output, $return_var);

        // Check if the ZIP file was created successfully
        if ($return_var !== 0 || !file_exists($zip_file_path)) {
            http_response_code(500);
            die("Error: Failed to create the ZIP file.");
        }
        // Schedule cleanup in the background
        cleanup_after_download($zip_file_path, $temp_dir);
        // Send the ZIP file to the browser
        send_file($zip_file_path, "application/zip");
        break;

    case "config":
        // Config mode: Download the config file directly
        $config_file = "{$plugin_dir}/{$plugin}.cfg";
        send_file($config_file, "application/octet-stream");
        break;

    case "categories":
        // Categories mode: Download the categories file directly
        $categories_file = "{$plugin_dir}/categories.json";
        send_file($categories_file, "application/json");
        break;
}
?>