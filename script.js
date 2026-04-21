/* --- DOM Elements --- */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch"); // For LevelUp
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

/* --- State Management --- */
let allProducts = [];
let selectedProducts = JSON.parse(localStorage.getItem("loreal_selected")) || [];
const workerUrl = "https://mute-math-5738.dtshibam.workers.dev"; // Your Cloudflare URL

// History for the Chat Follow-up (10 pts)
let history = [
    { 
      role: "system", 
      content: "You are a L'Oréal Beauty Advisor. Help the user build a routine using the products they've selected. Only discuss beauty topics." 
    }
];

/* --- 1. Load Products --- */
async function init() {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products;
    
    // Initial UI Setup
    updateSelectedUI();
    displayProducts(allProducts); // Show all initially or filtered
}

/* --- 2. Display Products (Grid) --- */
function displayProducts(products) {
    if (products.length === 0) {
        productsContainer.innerHTML = `<p class="placeholder-message">No products found.</p>`;
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

/* --- 3. Selection Logic (10 pts) --- */
window.toggleSelection = (product) => {
    const index = selectedProducts.findIndex(p => p.id === product.id);
    if (index > -1) {
        selectedProducts.splice(index, 1);
    } else {
        selectedProducts.push(product);
    }

    // Save Selected Products (10 pts)
    localStorage.setItem("loreal_selected", JSON.stringify(selectedProducts));
    updateSelectedUI();
    displayProducts(allProducts); // Refresh visuals
};

/* --- 4. Update Sidebar / Selected List --- */
function updateSelectedUI() {
    selectedProductsList.innerHTML = selectedProducts.map(p => `
        <div class="selected-item">
            <span>${p.name}</span>
            <i class="fa-solid fa-circle-xmark" onclick="removeProduct(${p.id})"></i>
        </div>
    `).join("");
}

window.removeProduct = (id) => {
    selectedProducts = selectedProducts.filter(p => p.id !== id);
    localStorage.setItem("loreal_selected", JSON.stringify(selectedProducts));
    updateSelectedUI();
    displayProducts(allProducts);
};

/* --- 5. Reveal Details Logic --- */
window.toggleDetails = (id) => {
    const el = document.getElementById(`desc-${id}`);
    el.style.display = el.style.display === "none" ? "block" : "none";
};

/* --- 6. Filters & Search (LevelUp 10 pts) --- */
categoryFilter.addEventListener("change", (e) => {
    const cat = e.target.value;
    const filtered = cat === "all" ? allProducts : allProducts.filter(p => p.category === cat);
    displayProducts(filtered);
});

productSearch.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.brand.toLowerCase().includes(term)
    );
    displayProducts(filtered);
});

/* --- 7. Generate Routine (10 pts) --- */
generateBtn.addEventListener("click", async () => {
    if (selectedProducts.length === 0) {
        alert("Please select at least one product!");
        return;
    }

    const productNames = selectedProducts.map(p => `${p.name} by ${p.brand}`).join(", ");
    const routinePrompt = `I have selected these products: ${productNames}. Please create a professional morning and evening routine for me using only these items.`;
    
    appendMessage("AI", "Generating your routine...");
    await getAIResponse(routinePrompt);
});

/* --- 8. AI Chat Logic (Cloudflare) --- */
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
        appendMessage("AI", "Error connecting to advisor. Check your Cloudflare Worker.");
    }
}
