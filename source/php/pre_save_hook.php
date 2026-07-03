<?
// Convert multi-select array to single-line string writes the config
if (isset($_POST["view_mode_highlighting"]) && is_array($_POST["view_mode_highlighting"]))
    $_POST["view_mode_highlighting"] = implode(",", $_POST["view_mode_highlighting"]);

// Trim Uncategorized Userscripts name field and reset to default if empty or longer than 40 characters
if (isset($_POST["uncategorized_name"])) {
    $name = trim($_POST["uncategorized_name"]);
    $name = ($name === "" || mb_strlen($name) > 40) ? "Uncategorized Userscripts" : $name;
    $_POST["uncategorized_name"] = base64_encode($name);
}

// Convert Custom CSS to base64
if (isset($_POST["custom_css"]))
    $_POST["custom_css"] = base64_encode(trim($_POST["custom_css"]));
?>