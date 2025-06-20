// ========================
// Fixes
// ========================

function bugfixes() {
    fix_missing_user_scripts_title();
}

function fix_missing_user_scripts_title() {
    // Fix missing Title when you call the page with the Custom Tab Plugin with Built-In Page mode
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