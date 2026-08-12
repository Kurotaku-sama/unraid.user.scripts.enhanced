<?
// Renders a labeled <select> field for the settings page, generic enough to build every dropdown on the page from a single function, the currently active value gets the "selected" attribute so the saved setting shows up pre-selected on page load
function render_select_field($title, $id, $variable, $options = ["yes" => "Yes", "no" => "No"], $class = "narrow") {
    echo "
    <dl>
        <dt>{$title}:</dt>
        <dd>
            <select id=\"{$id}\" name=\"{$id}\" class=\"{$class}\">";

    foreach ($options as $value => $label) {
        $selected = ($variable == $value) ? "selected" : "";
        echo "
                <option value=\"{$value}\" {$selected}>{$label}</option>";
    }

    echo "
            </select>
        </dd>
    </dl>";
}

// Decodes a base64-encoded config value, returns the raw value if not valid base64
function cfg_base64_decode($value) {
    return (base64_encode(base64_decode($value, true)) === $value) ? base64_decode($value) : $value;
}

if (!is_dir("/usr/local/emhttp/plugins/user.scripts")) {
    echo "<div class='plugin-warning'>
            <strong>IMPORTANT:</strong> This Plugin is an <u>UI Enhancement</u> of the Plugin <a href='/Apps?search=User Scripts Andrew Zawadzki'>\"User Scripts\" by Andrew Zawadzki (Squidly271).</a><br>
            The original \"User Scripts\" plugin <u>must be installed</u> for this to work!
          </div>";
}