/* --- DOM Elements --- */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch"); 
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

/* --- State Management --- */
let allProducts = [];
// Load selections from LocalStorage (Save Selected Products - 10 pts)
let selectedProducts = JSON.parse(localStorage.getItem("loreal_selected")) || [];

// Cloudflare Worker URL
const workerUrl = "https://mute-math-5738.dtshibam.workers.dev"; 

// Full Conversation History (Follow-up Chat - 10 pts)
let history = [
    { 
      role: "system", 
      content: "You are a L'Oréal Beauty Advisor. Help the user build a routine using the specific products they have selected. Stay on the topic of beauty and skincare." 
    }
];

/* --- 1. Load Products from JSON --- */
async function init() {
    try {
        const response = await fetch("products.json");
        const data = await response.json();
        allProducts = data.products;
        
        // Initial rendering
        updateSelectedUI();
        displayProducts(allProducts);
    } catch (error) {
        console.error("Error loading product data:", error);
        productsContainer.innerHTML = `<p class="placeholder-message">Error loading products. Please check products.json.</p>`;
    }
}

/* --- 2. Display Products (Grid) --- */
function displayProducts(products) {
    if (products.length === 0) {
        productsContainer.innerHTML = `<p class="placeholder-message">No products match your search.</p>`;
        return;
    }

    productsContainer.innerHTML = products.map(product => {
        // Check if product is already in the selected list
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

/* --- 3. Selection & Persistence Logic --- */
window.toggleSelection = (product) => {
    const index = selectedProducts.findIndex(p => p.id === product.id);
    
    if (index > -1) {
        // Unselect
        selectedProducts.splice(index, 1);
    } else {
        // Select
        selectedProducts.push(product);
    }

    // Update LocalStorage (10 pts)
    localStorage.setItem("loreal_selected", JSON.stringify(selectedProducts));
    
    updateSelectedUI();
    displayProducts(allProducts); // Re-render to show visual border
};

/* --- 4. Update Selected List (Visual Feedback) --- */
function updateSelectedUI() {
    selectedProductsList.innerHTML = selectedProducts.map(p => `
        <div class="selected-item">
            <span>${p.name}</span>
            <i class="fa-solid fa-circle-xmark" onclick="removeProduct(${p.id})"></i>
        </div>
    `).join("");
}

// Remove from list directly
window.removeProduct = (id) => {
    selectedProducts = selectedProducts.filter(p => p.id !== id);
    localStorage.setItem("loreal_selected", JSON.stringify(selectedProducts));
    updateSelectedUI();
    displayProducts(allProducts);
};

/* --- 5. Toggle Details Logic --- */
window.toggleDetails = (id) => {
    const el = document.getElementById(`desc-${id}`);
    el.style.display = el.style.display === "none" ? "block" : "none";
};

/* --- 6. Filtering & LevelUp Search --- */
categoryFilter.addEventListener("change", (e) => {
    const selectedCat = e.target.value.toLowerCase();
    
    const filtered = allProducts.filter(p => {
        const productCat = p.category.toLowerCase();
        if (selectedCat === "all") return true;
        // Logic to handle 'skincare' vs 'moisturizer' tagging
        if (selectedCat === "moisturizer") {
            return productCat === "moisturizer" || productCat === "skincare";
        }
        return productCat === selectedCat;
    });
    
    displayProducts(filtered);
});

// LevelUp: Product Search Field (10 pts)
productSearch.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.brand.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
    displayProducts(filtered);
});

/* --- 7. Generate Routine Logic (10 pts) --- */
generateBtn.addEventListener("click", async () => {
    if (selectedProducts.length === 0) {
        alert("Please select at least one product to build a routine!");
        return;
    }

    // Convert selected products into a helpful string for the AI
    const productInfo = selectedProducts.map(p => `- ${p.name} (${p.brand}): ${p.description}`).join("\n");
    
    const routinePrompt = `I have selected the following L'Oréal products:\n${productInfo}\n\nPlease create a personalized morning and evening routine for me using only these products. Explain why each step matters.`;
    
    appendMessage("AI", "Consulting with the advisor to build your routine...");
    await getAIResponse(routinePrompt);
});

/* --- 8. AI Chat & Follow-Up (Cloudflare Integration) --- */
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = userInput.value.trim();
    if (!msg) return;

    appendMessage("User", msg);
    userInput.value = "";
    await getAIResponse(msg);
});

async function getAIResponse(userText) {
    history.push({ role: "user", content: userText });

    try {
        const response = await fetch(workerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: history })
        });
        
        const data = await response.json();
        const aiMsg = data.choices[0].message.content;

        appendMessage("AI", aiMsg);
        history.push({ role: "assistant", content: aiMsg });
    } catch (err) {
        console.error("API Error:", err);
        appendMessage("AI", "I'm sorry, I'm having trouble connecting to the L'Oréal database. Please try again later.");
    }
}

function appendMessage(sender, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${
