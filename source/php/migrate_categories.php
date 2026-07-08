<?
// ========================
// One-Time Category Migration (Name-based to ID-based Schema)
// ========================
// Meant to be run from the command line during plugin install/upgrade, not via the web GUI.
// Safe to run on every install/upgrade: exits immediately if no migration is needed.

$plugin = "user.scripts.enhanced";
$plugin_dir = "/boot/config/plugins/{$plugin}";
$categories_file = "{$plugin_dir}/categories.json";
$backup_file = "{$plugin_dir}/categories_before_id_migration.json";

// Nothing to migrate on a fresh install, categories.json does not exist yet
if (!file_exists($categories_file)) {
    echo "User Scripts Enhanced: No categories.json found, nothing to migrate.\n";
    exit(0);
}

$categories_data = json_decode(file_get_contents($categories_file), true);

if ($categories_data === null) {
    // echo "User Scripts Enhanced: categories.json contains invalid JSON, skipping migration.\n";
    exit(1);
}

// Recursively checks whether any category in the tree is missing fields required by the current schema
function categories_need_migration($list) {
    foreach ($list as $category) {
        if (!isset($category['id'])) return true;
        if (!isset($category['subcategory_position'])) return true;
        if (!isset($category['scripts']) || !is_array($category['scripts'])) return true;
        if (!isset($category['subcategories']) || !is_array($category['subcategories'])) return true;

        if (!empty($category['subcategories']) && categories_need_migration($category['subcategories']))
            return true;
    }
    return false;
}

if (!categories_need_migration($categories_data)) {
    // echo "User Scripts Enhanced: categories.json is already up to date, no migration needed.\n";
    exit(0);
}

echo "User Scripts Enhanced: Migrating categories.json to the id based schema...\n";

// Keep the very first pre-migration backup, never overwrite it on a later run
if (!file_exists($backup_file)) {
    if (!copy($categories_file, $backup_file)) {
        echo "User Scripts Enhanced: Failed to create a backup of categories.json, aborting migration.\n";
        exit(1);
    }
    echo "User Scripts Enhanced: Backup created at categories_before_id_migration.json\n";
}

// Recursively collects every already existing id in the tree into a lookup set, used to avoid collisions with newly generated ids
function collect_existing_ids($list, &$existing_ids) {
    foreach ($list as $category) {
        if (isset($category['id']))
            $existing_ids[$category['id']] = true;

        if (!empty($category['subcategories']) && is_array($category['subcategories']))
            collect_existing_ids($category['subcategories'], $existing_ids);
    }
}

// Generates a new category id based on the current millisecond timestamp plus a running counter, retrying until an id is found that does not collide with any existing or already generated id
function generate_unique_migration_id(&$id_counter, &$existing_ids) {
    do {
        $timestamp = (string) round(microtime(true) * 1000);
        $id = "{$timestamp}{$id_counter}";
        $id_counter++;
    } while (isset($existing_ids[$id]));

    $existing_ids[$id] = true;
    return $id;
}

// Recursively rebuilds every category with a fixed field order, generating a stable id where missing
// New ids are checked against the global existing_ids set to guarantee uniqueness across the entire tree, not just within the current level
function migrate_categories($list, &$id_counter, &$existing_ids) {
    $migrated = [];

    foreach ($list as $category) {
        $id = $category['id'] ?? null;
        if (!$id)
            $id = generate_unique_migration_id($id_counter, $existing_ids);

        $subcategories = (isset($category['subcategories']) && is_array($category['subcategories'])) ? $category['subcategories'] : [];

        $migrated[] = [
            "id" => $id,
            "name" => $category['name'] ?? "",
            "order" => $category['order'] ?? 0,
            "view_mode" => $category['view_mode'] ?? "list",
            "collapsed" => $category['collapsed'] ?? "no",
            "custom_class" => $category['custom_class'] ?? "",
            "subcategory_position" => $category['subcategory_position'] ?? "default",
            "scripts" => (isset($category['scripts']) && is_array($category['scripts'])) ? $category['scripts'] : [],
            "subcategories" => migrate_categories($subcategories, $id_counter, $existing_ids)
        ];
    }

    return $migrated;
}

$id_counter = 0;
$existing_ids = [];
collect_existing_ids($categories_data, $existing_ids);
$migrated_data = migrate_categories($categories_data, $id_counter, $existing_ids);

if (file_put_contents($categories_file, json_encode($migrated_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) === false) {
    echo "User Scripts Enhanced: Failed to write the migrated categories.json file.\n";
    exit(1);
}

echo "User Scripts Enhanced: Migration completed successfully.\n";
exit(0);
?>