<?
function render_select_field($title, $id, $variable, $options = ["yes" => "Yes", "no" => "No"], $class = "narrow setting") {
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

if (!is_dir("/usr/local/emhttp/plugins/user.scripts")) {
    echo "<div class='plugin-warning'>
            <strong>IMPORTANT:</strong> This Plugin is an <u>UI Enhancement</u> of the Plugin <a href='/Apps?search=User Scripts Andrew Zawadzki'>\"User Scripts\" by Andrew Zawadzki (Squidly271).</a><br>
            The original \"User Scripts\" plugin <u>must be installed</u> for this to work!
          </div>";
}
?>