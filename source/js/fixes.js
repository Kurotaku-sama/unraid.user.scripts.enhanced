// ========================
// Fixes
// ========================

function bugfixes() {
    fix_missing_user_scripts_title();
    fix_toggle_button();
}

function fix_missing_user_scripts_title() {
    // Fix missing Title when you call the page with the Custom Tab Plugin
    const span_left = document.querySelector('.title > span.left');
    if (!span_left) return; // nothing to fix if element missing

    // Check if the span contains only the icon element and no meaningful text
    const hasText = Array.from(span_left.childNodes).some(node =>
        node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
    );

    if (!hasText) {
        // Add the missing text after the icon element
        const textNode = document.createTextNode('User Scripts');
        span_left.appendChild(textNode);
    }
}

function fix_toggle_button() {
    // Get the button with the specific onclick handler
    const button = document.querySelector('input[onclick*="#howToAdd"]');

    // If the button exists and uses .show(), replace it with .toggle()
    if (button) {
        const onclick_code = button.getAttribute('onclick');
        if (onclick_code.includes('.show()')) {
            const fixed_code = onclick_code.replace('.show()', '.toggle()');
            button.setAttribute('onclick', fixed_code);
        }
    }
}