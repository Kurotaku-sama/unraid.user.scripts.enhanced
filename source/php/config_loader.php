<?
$plugin = "user.scripts.enhanced";
$cfg = parse_plugin_cfg($plugin);

// Get config variables or default values
$cfg_enabled = $cfg['enabled'] ?? "yes";

// Categories Section
$cfg_view_mode = $cfg['default_view_mode'] ?? "list";
$cfg_default_collapsed = $cfg['default_collapsed'] ?? "yes";
$cfg_uncategorized_collapsed = $cfg['uncategorized_collapsed'] ?? "yes";
$cfg_capitalized = $cfg['capitalized'] ?? "no";
$cfg_enable_search = $cfg['enable_search'] ?? "yes";
$cfg_save_delay = $cfg['save_delay'] ?? "5";
$cfg_custom_css = $cfg['custom_css'] ?? "";

// Hide default Elements Section
$cfg_hide_description = $cfg['hide_description'] ?? "without";
$cfg_hide_empty_lines = $cfg['cfg_hide_empty_lines'] ?? "yes";
$cfg_hide_what_is_cron = $cfg['hide_what_is_cron'] ?? "no";
$cfg_hide_credits = $cfg['hide_credits'] ?? "no";
$cfg_hide_how_to_add_scripts = $cfg['hide_how_to_add_scripts'] ?? "no";
$cfg_hide_help = $cfg['hide_help'] ?? "no";

// URLs Section
$cfg_url_default = $cfg['url_default'] ?? "/Settings/Userscripts";
$cfg_url_custom_1 = $cfg['url_custom_1'] ?? "";
$cfg_url_custom_2 = $cfg['url_custom_2'] ?? "";
?>