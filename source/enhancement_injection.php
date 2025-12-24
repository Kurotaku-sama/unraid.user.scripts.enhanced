<?
require_once "/usr/local/emhttp/plugins/user.scripts.enhanced/php/config_loader.php";

if ($cfg_enabled == "no")
    return;
?>

<script>
// Use PHP Variables in JavaScript
const cfg_plugin = "<?=$plugin?>";
const cfg_default_view_mode = "<?=$cfg_view_mode?>";
const cfg_default_collapsed = "<?=$cfg_default_collapsed?>";
const cfg_uncategorized_collapsed = "<?=$cfg_uncategorized_collapsed?>";
const cfg_capitalized = "<?=$cfg_capitalized?>";
const cfg_list_view_separators = "<?=$cfg_list_view_separators?>";
const cfg_view_mode_highlighting = <?=json_encode($cfg_view_mode_highlighting ?? [])?>;
const cfg_enable_search = "<?=$cfg_enable_search?>";
const cfg_save_delay = "<?=$cfg_save_delay?>";
const cfg_custom_css = <?=json_encode($cfg_custom_css)?>;
const cfg_hide_description = "<?=$cfg_hide_description?>";
const cfg_hide_empty_lines = "<?=$cfg_hide_empty_lines?>";
const cfg_hide_what_is_cron = "<?=$cfg_hide_what_is_cron?>";
const cfg_hide_credits = "<?=$cfg_hide_credits?>";
const cfg_hide_how_to_add_scripts = "<?=$cfg_hide_how_to_add_scripts?>";
const cfg_hide_help = "<?=$cfg_hide_help?>";
</script>

<link type="text/css" rel="stylesheet" href="<?=autov("/plugins/$plugin/styles/page_userscripts.css")?>">

<? $js_dir = "/plugins/$plugin/js"; ?>
<script src="<?=autov("$js_dir/category_controls.js")?>"></script>
<script src="<?=autov("$js_dir/data_persistence.js")?>"></script>
<script src="<?=autov("$js_dir/fixes.js")?>"></script>
<script src="<?=autov("$js_dir/helper.js")?>"></script>
<script src="<?=autov("$js_dir/management_category.js")?>"></script>
<script src="<?=autov("$js_dir/management_scripts.js")?>"></script>
<script src="<?=autov("$js_dir/search_function.js")?>"></script>
<script src="<?=autov("$js_dir/ui_components.js")?>"></script>
<script src="<?=autov("$js_dir/validations.js")?>"></script>
<script src="<?=autov("$js_dir/visibility.js")?>"></script>

<script src="<?=autov("$js_dir/main.js")?>"></script>