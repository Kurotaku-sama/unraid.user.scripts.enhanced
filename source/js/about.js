function about_plugin() {
    const paypal = `
        <a href="https://www.paypal.me/Kurotaku1337" target="_blank" rel="noopener" class="donation-button link-paypal">
            <img src="https://www.paypalobjects.com/webstatic/de_DE/i/de-pp-logo-200px.png" alt="PayPal" class="donation-icon" />
            <div class="donation-shine"></div>
        </a>
    `;

    const ko_fi = `
        <a href="https://ko-fi.com/kurotaku1337" target="_blank" rel="noopener" class="donation-button link-kofi">
            <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="Ko-fi" class="donation-icon" />
            <span class="donation-text">Ko-fi</span>
            <div class="donation-shine"></div>
        </a>
    `;

    const html = `
        <strong>Author:</strong> Kurotaku<br>
        <strong>Homepage:</strong> <a href="https://kurotaku.de" target="_blank">kurotaku.de</a><br><br>
        <strong>More Projects:</strong> <a href="https://github.com/Kurotaku-sama" target="_blank">GitHub</a><br><br>
        <em>If you enjoy my work, please consider leaving a star!</em><br>
        <em>For support or bug reports, check out the <a href="https://forums.unraid.net/topic/191294-plugin-user-scripts-enhanced/" target="_blank">Unraid forum thread</a>.</em><br><br>
        <b>Contact:</b> Discord – <strong>Kurotaku</strong><br><br>
        <b>If you like my work feel free to support me:</b>
        <div class="donation-wrapper">
            ${paypal}
            ${ko_fi}
        </div>
    `;

    swal({
        title: plugin_name,
        html: true,
        text: html,
        confirmButtonText: "Close",
        imageUrl: `/plugins/${plugin}/images/user.scripts.enhanced.png`,
        customClass: "swal-responsive-fix",
    });
}