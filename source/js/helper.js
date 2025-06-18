// ========================
// Helper Functions
// ========================

function wait_for_element(selector) {
    return new Promise(resolve => {
        const node = document.querySelector(selector);
        if (node) return resolve(node);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function toggle_category_visibility(event) {
    let category = event.target.closest(".category");
    let content = category.querySelector(".category-content");

    if (content.dataset.animating) return; // Block spam clicks

    content.dataset.animating = "true"; // Lock for animation
    setTimeout(() => delete content.dataset.animating, 500); // Unlock after 0.5s

    if (category.classList.contains("collapsed")) {
        // Open the category with animation if it's collapsed
        category.classList.remove("collapsed");
        content.style.maxHeight = content.scrollHeight + "px"; // Initial opening
        setTimeout(() => content.style.maxHeight = null, 500); // Reset max-height after animation
    } else {
        // Collapse the category with animation if it's open
        content.style.maxHeight = content.scrollHeight + "px";
        setTimeout(() => {
            category.classList.add("collapsed");
            content.style.maxHeight = "0"; // Collapse with animation
        }, 10);
    }
}

function insert_custom_css() {
    let style = document.createElement("style");
    style.textContent = cfg_custom_css;
    document.head.appendChild(style);
}