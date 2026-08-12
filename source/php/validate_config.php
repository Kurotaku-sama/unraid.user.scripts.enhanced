<?
// ========================
// Plugin Config Validation
// ========================
// Meant to be run from the command line during plugin install/upgrade, not via the web GUI.
// Reconciles the saved .cfg file against default.cfg on every run: keys no longer present in default.cfg get dropped, keys missing from the saved file get added with their default value, and every remaining key gets reordered to match the exact order default.cfg defines.
// Safe to run on every install/upgrade: exits immediately if the file already matches default.cfg.

$plugin = "user.scripts.enhanced";
$install_dir = "/usr/local/emhttp/plugins/{$plugin}";
$config_dir = "/boot/config/plugins/{$plugin}";

$default_config_file = "{$install_dir}/default.cfg";
$config_file = "{$config_dir}/{$plugin}.cfg";

// Nothing to validate if the plugin has never been configured yet, a fresh cfg gets written from default.cfg on first save anyway
if (!file_exists($config_file))
    exit(0);

if (!file_exists($default_config_file)) {
    echo "User Scripts Enhanced: default.cfg not found, skipping config validation.\n";
    exit(1);
}

// Parses a simple key="value" per line cfg file into an associative array, preserving the exact insertion order of the source file, lines that do not match the expected format are ignored
function parse_cfg_file($path) {
    $values = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        if (!preg_match('/^([a-zA-Z0-9_]+)="(.*)"$/', $line, $matches))
            continue;

        $values[$matches[1]] = $matches[2];
    }

    return $values;
}

$default_values = parse_cfg_file($default_config_file);
$current_values = parse_cfg_file($config_file);

$changed = false;

// Detects keys saved in the current config that no longer exist in default.cfg, these get dropped during the rebuild below
if (array_diff_key($current_values, $default_values))
    $changed = true;

// Detects keys default.cfg expects that are missing from the current config, these get added with their default value during the rebuild below
if (array_diff_key($default_values, $current_values))
    $changed = true;

// Detects if the keys shared by both files are not already in the same relative order, array_intersect preserves the order of its first argument while filtering down to values also present in the second, so comparing both directions against each other's order exposes any mismatch
$current_order_filtered = array_values(array_intersect(array_keys($current_values), array_keys($default_values)));
$default_order_filtered = array_values(array_intersect(array_keys($default_values), array_keys($current_values)));
if ($current_order_filtered !== $default_order_filtered)
    $changed = true;

if (!$changed) {
    // echo "User Scripts Enhanced: {$plugin}.cfg already matches default.cfg, nothing to do.\n";
    exit(0);
}

echo "User Scripts Enhanced: {$plugin}.cfg does not match default.cfg, repairing it...\n";

// Rebuilds the config in the exact order default.cfg defines, keeping every existing value that is still valid and falling back to the default value for anything missing, unused keys are dropped simply by never being copied over into the rebuilt list
$rebuilt_lines = [];
foreach ($default_values as $key => $default_value) {
    $value = array_key_exists($key, $current_values) ? $current_values[$key] : $default_value;
    $rebuilt_lines[] = "{$key}=\"{$value}\"";
}

if (file_put_contents($config_file, implode("\n", $rebuilt_lines) . "\n") === false) {
    echo "User Scripts Enhanced: Failed to write the repaired {$plugin}.cfg file.\n";
    exit(1);
}

echo "User Scripts Enhanced: Config repair completed successfully.\n";
exit(0);