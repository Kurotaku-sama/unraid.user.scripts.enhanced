// ========================
// Search Function
// ========================

function search_script(query) {
    // Normalize the search query: lowercase and remove leading/trailing spaces
    query = query.toLowerCase().trim()

    // Get all category containers
    var cats = document.querySelectorAll('.category')

    cats.forEach(function(cat) {
        var visible = false // Tracks if at least one script in this category matches

        // Iterate over each script row inside the category
        cat.querySelectorAll('.category-scripts tr').forEach(function(tr) {
            // Get all spans that contain the script name
            const spans = tr.querySelectorAll('span[data-namename]')
            let match = false

            // Check if any span's data-namename matches the search query
            spans.forEach(span => {
                const val = span.getAttribute("data-namename")?.toLowerCase() || ""
                if (val.includes(query)) match = true
            })

            // Show or hide the script row based on the match
            tr.style.display = match ? "" : "none"
            if (match) visible = true // Mark the category as visible if any row matches
        })

        // Show or hide the entire category based on whether it has matching rows
        cat.style.display = query === "" || visible ? "" : "none"
    })
}