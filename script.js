/* --- DOM Elements --- */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch"); 
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

/* --- Configuration --- */
// Using your established Cloudflare Worker URL from Project 8
const workerUrl = "https://mute-math-5738.dtshibam.workers.dev"; 

/* --- State Management --- */
let allProducts = [];
// Save Selected Products Logic (10 pts) - Load from LocalStorage
let selectedProducts = JSON.parse(localStorage.getItem("loreal_selected")) || [];

// Follow-Up Chat Logic (10 pts) - Conversation History
let history = [
    { 
      role: "system", 
      content: "You are a L'Oréal Beauty Advisor. Help the user build a routine using the specific products they have selected. Stay strictly on the topic of beauty, skincare, and L'Oréal products." 
    }
];

/* --- 1. Initialize & Load Data --- */
async function init() {
    try {
        const response = await fetch("products.json");
        const data = await response.json();
        allProducts = data.products;
        
        // Render existing selections and the product grid
        updateSelectedUI();
        displayProducts(allProducts);
    } catch (error) {
        console.error("Error loading products.json:", error);
        productsContainer.innerHTML = `<p class="placeholder-message">Unable to load products. Ensure products.json is in the root folder.</p>`;
    }
}

/* --- 2. Display Products Grid (Product Selection Logic - 10 pts) --- */
function displayProducts(products) {
    if (products.length === 0) {
        productsContainer.innerHTML = `<p class="placeholder-message">No matching L'Oréal products found.</p>`;
        return;
    }

    productsContainer.innerHTML = products.map(product => {
        const isSelected = selectedProducts.some(p => p.id === product.id);
        
        return `
            <div class="product-card ${isSelected ? 'selected' : ''}" id="card-${product.id}">
                <img src="${product.image}" alt="${product.name}">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p><strong>${product.brand}</strong></p>
                    
                    <button class="details-btn" onclick="toggleDetails(${product.id})">View Details</button>
                    <div id="desc-${product.id}" class="product-desc" style="display:none;">
                        ${product.description}
                    </div>

                    <button class="select-btn" onclick='toggleSelection(${JSON.stringify(product).replace(/'/g, "&apos;")})'>
                        ${isSelected ? 'Remove' : 'Select Product'}
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

/* --- 3. Selection & LocalStorage Persistence (10 pts) --- */
window.toggleSelection = (product) => {
    const index = selectedProducts.findIndex(p => p.id === product.id);
    
    if (index > -1) {
        selectedProducts.splice(index, 1); // Remove if already there
    } else {
        selectedProducts.push(product); // Add if new
    }

    // Save to LocalStorage so it persists on reload
    localStorage.setItem("loreal_selected", JSON.stringify(selectedProducts));
    
    updateSelectedUI();
    displayProducts(allProducts); // Refresh grid for visual feedback (border/highlight)
};

/* --- 4. Selected Products List UI --- */
function updateSelectedUI() {
    selectedProductsList.innerHTML = selectedProducts.map(p => `
        <div class="selected-item">
            <span>${p.name}</span>
            <i class="fa-solid fa-circle-xmark" onclick="removeProduct(${p.id})" title="Remove item"></i>
        </div>
    `).join("");
}

window.removeProduct = (id) => {
    selectedProducts = selectedProducts.filter(p => p.id !== id);
    localStorage.setItem("loreal_selected", JSON.stringify(selectedProducts));
    updateSelectedUI();
    displayProducts(allProducts);
};

/* --- 5. Toggle Details (Description Visibility) --- */
window.toggleDetails = (id) => {
    const el = document.getElementById(`desc-${id}`);
    el.style.display = el.style.display === "none" ? "block" : "none";
};

/* --- 6. Filtering & LevelUp: Product Search (10 pts) --- */
categoryFilter.addEventListener("change", (e) => {
    const selectedCat = e.target.value.toLowerCase();
    const filtered = selectedCat === "all" ? allProducts : allProducts.filter(p => {
        const productCat = p.category.toLowerCase();
        // Ensuring "moisturizer" filter catches products tagged as "skincare" in JSON
        if (selectedCat === "moisturizer") return productCat === "moisturizer" || productCat === "skincare";
        return productCat === selectedCat;
    });
    displayProducts(filtered);
});

productSearch.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.brand.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    );
    displayProducts(filtered);
});

/* --- 7. Routine Generation (10 pts) --- */
generateBtn.addEventListener("click", async () => {
    if (selectedProducts.length === 0) {
        alert("Please select at least one product to generate a routine!");
        return;
    }

    // Create a data-rich prompt for the AI based on user selections
    const productList = selectedProducts.map(p => `- ${p.name} (${p.brand}): ${p.description}`).join("\n");
    const routinePrompt = `I have selected these products:\n${productList}\n\nPlease generate a personalized morning and evening routine for me.
