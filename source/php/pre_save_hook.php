<?
// Convert multi-select array to single-line string writes the config
if (isset($_POST['view_mode_highlighting']) && is_array($_POST['view_mode_highlighting']))
    $_POST['view_mode_highlighting'] = implode(',', $_POST['view_mode_highlighting']);

// Convert Custom CSS to base64
if (isset($_POST['custom_css']))
    $_POST['custom_css'] = base64_encode(trim($_POST['custom_css']));
?>