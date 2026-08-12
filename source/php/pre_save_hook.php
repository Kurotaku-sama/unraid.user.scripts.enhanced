<?
// Convert multi-select array to single-line string writes the config
if (isset($_POST["view_mode_highlighting"]) && is_array($_POST["view_mode_highlighting"]))
    $_POST["view_mode_highlighting"] = implode(",", $_POST["view_mode_highlighting"]);

// Read the raw disabled_limits selection before it gets flattened into a string below, needed to decide whether the uncategorized name length check further down still applies
$disabled_limits = isset($_POST["disabled_limits"]) && is_array($_POST["disabled_limits"]) ? $_POST["disabled_limits"] : [];
$name_limit_disabled = in_array("category_name_length", $disabled_limits, true);

// Convert multi-select array to single-line string writes the config
if (isset($_POST["disabled_limits"]) && is_array($_POST["disabled_limits"]))
    $_POST["disabled_limits"] = implode(",", $_POST["disabled_limits"]);

// Trim Uncategorized Userscripts name field and reset to default if empty, or longer than 40 characters unless the category name length limit was disabled
if (isset($_POST["uncategorized_name"])) {
    $name = trim($_POST["uncategorized_name"]);
    $name = ($name === "" || (!$name_limit_disabled && mb_strlen($name) > 40)) ? "Uncategorized Userscripts" : $name;
    $_POST["uncategorized_name"] = base64_encode($name);
}

// Convert Custom CSS to base64
if (isset($_POST["custom_css"]))
    $_POST["custom_css"] = base64_encode(trim($_POST["custom_css"]));

// Validate max_category_depth: must be a whole number between 1 and 10, otherwise fallback to 3
if (isset($_POST["max_category_depth"])) {
    $raw_depth = $_POST["max_category_depth"];
    $is_valid_depth = is_numeric($raw_depth) && intval($raw_depth) == $raw_depth && $raw_depth >= 1 && $raw_depth <= 10;
    $_POST["max_category_depth"] = $is_valid_depth ? intval($raw_depth) : 3;
}