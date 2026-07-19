<?
$plugin = "user.scripts.enhanced";
$cfg_use = parse_plugin_cfg($plugin);

// Decodes a base64-encoded config value, returns the raw value if not valid base64
function cfg_base64_decode($value) {
    return (base64_encode(base64_decode($value, true)) === $value) ? base64_decode($value) : $value;
}

// Prevent execution if user disabled the plugin
if ($cfg_use['enabled'] == "no")
    return;

// Build processed config array, overriding the 3 special cases before JS output
$cfg_use['view_mode_highlighting'] = explode(",", $cfg_use['view_mode_highlighting']);
$cfg_use['uncategorized_name'] = cfg_base64_decode($cfg_use['uncategorized_name']);
$cfg_use['custom_css'] = cfg_base64_decode($cfg_use['custom_css']);
?>

<script>
const plugin = "<?=$plugin?>";
const plugin_name = "User Scripts Enhanced";
const cfg_use = <?=json_encode($cfg_use)?>; // Expose the PHP config as a JS object
</script>

<link type="text/css" rel="stylesheet" href="<?=autov("/plugins/$plugin/styles/page_userscripts.css")?>">
<link type="text/css" rel="stylesheet" href="<?=autov("/plugins/$plugin/styles/donate.css")?>">

<script src="<?=autov("/plugins/$plugin/vendor/Sortable.min.js")?>"></script>

<? $js_dir = "/plugins/$plugin/js"; ?>
<script src="<?=autov("$js_dir/about.js")?>"></script>
<script src="<?=autov("$js_dir/category_controls.js")?>"></script>
<script src="<?=autov("$js_dir/data_persistence.js")?>"></script>
<script src="<?=autov("$js_dir/fixes.js")?>"></script>
<script src="<?=autov("$js_dir/helper.js")?>"></script>
<script src="<?=autov("$js_dir/management_category.js")?>"></script>
<script src="<?=autov("$js_dir/category_settings_dialog.js")?>"></script>
<script src="<?=autov("$js_dir/category_order_dialog.js")?>"></script>
<script src="<?=autov("$js_dir/management_scripts.js")?>"></script>
<script src="<?=autov("$js_dir/search_function.js")?>"></script>
<script src="<?=autov("$js_dir/ui_components.js")?>"></script>
<script src="<?=autov("$js_dir/validations.js")?>"></script>
<script src="<?=autov("$js_dir/visibility.js")?>"></script>

<script src="<?=autov("$js_dir/main.js")?>"></script>