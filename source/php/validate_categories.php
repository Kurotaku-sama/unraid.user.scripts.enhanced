<?
// ========================
// Category Schema Validation
// ========================
// Meant to be run from the command line during plugin install/upgrade, not via the web GUI.
// Validates and repairs the entire categories.json against the schema below on every run, not just missing fields.
// Any missing field, invalid value, wrong type, wrong key order, duplicate id, or malformed id gets automatically corrected.
// Safe to run on every install/upgrade: exits immediately if the file already matches the schema.

// Defines the exact schema every category must follow, including the required key order
// "type" determines how the value is validated and corrected if invalid, "default" is used as a fallback whenever a field is missing or invalid
$category_schema = [
    "id" => ["type" => "id", "default" => null],
    "name" => ["type" => "string", "default" => ""],
    "order" => ["type" => "int", "default" => 0],
    "expanded" => ["type" => "enum", "default" => "no", "values" => ["yes", "no"]],
    "view_mode" => ["type" => "enum", "default" => "list", "values" => ["list", "panel"]],
    "subcategory_position" => ["type" => "enum", "default" => "default", "values" => ["default", "above", "below"]],
    "scripts" => ["type" => "string_array", "default" => []],
    "custom_class" => ["type" => "string", "default" => ""],
    "subcategories" => ["type" => "subcategories", "default" => []],
];

$plugin = "user.scripts.enhanced";
$plugin_dir = "/boot/config/plugins/{$plugin}";
$categories_file = "{$plugin_dir}/categories.json";

// Nothing to validate on a fresh install, categories.json does not exist yet
if (!file_exists($categories_file))
    exit(0);

$categories_data = json_decode(file_get_contents($categories_file), true);

// Invalid JSON is left untouched here, categories_load.php already handles this case at runtime by backing up the corrupted file and creating a fresh empty one
if ($categories_data === null || !is_array($categories_data)) {
    echo "User Scripts Enhanced: categories.json contains invalid JSON, skipping validation.\n";
    exit(1);
}

// Checks whether a given id matches the expected format, ids are always purely numeric since they are generated from Date.now() or microtime()
function is_valid_id_format($id) {
    return is_string($id) && $id !== "" && ctype_digit($id);
}

// Generates a new unique category id based on the current millisecond timestamp plus a running counter, retrying until an id is found that is not already reserved
function generate_unique_id(&$id_counter, &$reserved_ids) {
    do {
        $timestamp = (string) round(microtime(true) * 1000);
        $id = "{$timestamp}{$id_counter}";
        $id_counter++;
    } while (isset($reserved_ids[$id]));

    $reserved_ids[$id] = true;
    return $id;
}

// Validates and normalizes a single field value according to its schema definition, sets $changed to true if the value had to be corrected
function normalize_field($value, $definition, &$changed) {
    switch ($definition['type']) {
        case "string":
            if (!is_string($value)) {
                $changed = true;
                return $definition['default'];
            }
            return $value;

        case "int":
            if (!is_int($value) && !(is_numeric($value) && (int) $value == $value)) {
                $changed = true;
                return $definition['default'];
            }
            return (int) $value;

        case "enum":
            if (!is_string($value) || !in_array($value, $definition['values'], true)) {
                $changed = true;
                return $definition['default'];
            }
            return $value;

        case "string_array":
            if (!is_array($value)) {
                $changed = true;
                return $definition['default'];
            }

            $normalized = [];
            foreach ($value as $entry) {
                if (!is_string($entry)) {
                    $changed = true;
                    continue;
                }
                $normalized[] = $entry;
            }

            // Removes duplicate script ids, a script should never be assigned to the same category twice
            $deduplicated = array_values(array_unique($normalized));
            if (count($deduplicated) !== count($normalized))
                $changed = true;

            return $deduplicated;

        default:
            return $value;
    }
}

// Recursively validates and normalizes a full list of categories against the schema, rebuilding every category in the exact defined key order, regenerating missing, duplicate, or malformed ids along the way
function normalize_categories($list, $schema, &$reserved_ids, &$id_counter, &$changed) {
    if (!is_array($list)) {
        $changed = true;
        return [];
    }

    $normalized_list = [];

    foreach ($list as $category) {
        if (!is_array($category)) {
            $changed = true;
            continue;
        }

        // Detects if any key exists that does not belong to the schema, such fields get dropped silently since they rebuild below
        if (array_diff_key($category, $schema))
            $changed = true;

        // Detects if the present schema keys are not in the exact order the schema requires
        $expected_key_order = [];
        foreach ($schema as $key => $_)
            if (array_key_exists($key, $category))
                $expected_key_order[] = $key;

        if (array_keys(array_intersect_key($category, $schema)) !== $expected_key_order)
            $changed = true;

        $normalized_category = [];

        foreach ($schema as $key => $definition) {
            if ($definition['type'] === "id") {
                $id = $category['id'] ?? null;
                $is_invalid = !is_valid_id_format($id) || isset($reserved_ids[$id]);

                if ($is_invalid) {
                    $changed = true;
                    $id = generate_unique_id($id_counter, $reserved_ids);
                } else
                    $reserved_ids[$id] = true;

                $normalized_category[$key] = $id;
                continue;
            }

            if ($definition['type'] === "subcategories") {
                $subcategories = $category['subcategories'] ?? [];
                $normalized_category[$key] = normalize_categories($subcategories, $schema, $reserved_ids, $id_counter, $changed);
                continue;
            }

            $has_key = array_key_exists($key, $category);
            if (!$has_key)
                $changed = true;

            $normalized_category[$key] = normalize_field($has_key ? $category[$key] : $definition['default'], $definition, $changed);
        }

        $normalized_list[] = $normalized_category;
    }

    return $normalized_list;
}

$reserved_ids = [];
$id_counter = 0;
$changed = false;

$normalized_data = normalize_categories($categories_data, $category_schema, $reserved_ids, $id_counter, $changed);

if (!$changed) {
    // echo "User Scripts Enhanced: categories.json already matches the schema, nothing to do.\n";
    exit(0);
}

echo "User Scripts Enhanced: categories.json does not match the current schema, repairing it...\n";

if (file_put_contents($categories_file, json_encode($normalized_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) === false) {
    echo "User Scripts Enhanced: Failed to write the repaired categories.json file.\n";
    exit(1);
}

echo "User Scripts Enhanced: Schema repair completed successfully.\n";
exit(0);
?>