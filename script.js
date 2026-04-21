/* --- Configuration --- */
const workerUrl = "https://mute-math-5738.dtshibam.workers.dev";
let allProducts = [];
let selectedProducts = JSON.parse(localStorage.getItem("loreal_selected")) || [];

// System Prompt for cleaner Routine structure
let history = [{ 
    role: "system", 
    content: "You are a L'Oréal Beauty Advisor. Provide step-by-step beauty routines using the products selected. Bold product names like **Product Name**. Use double line breaks between steps for clarity." 
}];

const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const chatWindow = document.getElementById("chatWindow");

/* --- 1. Load Data --- */
async function init() {
    try {
        const response = await fetch("products.json");
        const data = await response.json();
        allProducts = data.products;
        
        updateSelectedUI();
        displayProducts(allProducts);
    } catch (err) {
        console.error("Initialization error:", err);
    }
}

/* --- 2. Render Product Grid --- */
function displayProducts(products) {
    productsContainer.innerHTML = products.map(p => {
        const isSelected = selectedProducts.some(item => item.id === p.id);
        return `
            <div class="product-card ${isSelected ? 'selected' : ''}">
                <img src="${p.image}" alt="${p.name}">
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p><strong>${p.brand}</strong></p>
                    <button class="select-btn" onclick='toggleSelection(${JSON.stringify(p).replace(/'/g, "&apos;")})'>
                        ${isSelected ? 'Remove' : 'Select Product'}
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

/* --- 3. Robust Search Logic (LevelUp - 10 pts) --- */
document.getElementById("productSearch").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.brand.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    );
    displayProducts(filtered);
});

/* --- 4. Category Filter --- */
document.getElementById("categoryFilter").addEventListener("change", (e) => {
    const cat = e.target.value;
    const filtered = (cat === "all") ? allProducts : allProducts.filter(p => p.category === cat);
    displayProducts(filtered);
});

/* --- 5. Selection & Persistence (10 pts) --- */
window.toggleSelection = (product) => {
    const idx = selectedProducts.findIndex(p => p.id === product.id);
    if (idx > -1) {
        selectedProducts.splice(idx, 1);
    } else {
        selectedProducts.push(product);
    }
    
    localStorage.setItem("loreal_selected", JSON.stringify(selectedProducts));
    updateSelectedUI();
    displayProducts(allProducts);
};

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

/* --- 6. AI Interaction Logic --- */
document.getElementById("generateRoutine").addEventListener("click", async () => {
    if (selectedProducts.length === 0) return alert("Please select products first!");
    
    const productData = selectedProducts.map(p => `${p.name} by ${p.brand}`).join(", ");
    const routinePrompt = `Build a professional, step-by-step beauty routine using these products: ${productData}. Explain the benefit of each step.`;
    
    appendMessage("AI", "Building your personalized L'Oréal routine...");
    await getAIResponse(routinePrompt);
});

document.getElementById("chatForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("userInput");
    const msg = input.value;
    appendMessage("User", msg);
    input.value = "";
    await getAIResponse(msg);
});

async function getAIResponse(text) {
    history.push({ role: "user", content: text });
    try {
        const res = await fetch(workerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: history })
        });
        const data = await res.json();
        const aiMsg = data.choices[0].message.content;

        appendMessage("AI", aiMsg);
        history.push({ role: "assistant", content: aiMsg });
    } catch {
        appendMessage("AI", "I'm having trouble connecting to the L'Oréal server. Please check your connection.");
    }
}

/* --- 7. UX Formatter (Chat Readability) --- */
function appendMessage(sender, text) {
    const div = document.createElement("div");
    div.className = `message ${sender.toLowerCase()}-message`;
    
    // Formatting: Converts Markdown bold and newlines to HTML
    let formattedText = text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    div.innerHTML = `<strong>${sender}:</strong><br>${formattedText}`;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

init();
