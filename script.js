// Subscription tiers with amounts and days
const tiers = [
  { amount: 5, days: 3, label: "3-Day" },
  { amount: 10, days: 7, label: "Weekly" },
  { amount: 25, days: 30, label: "Monthly" },
  { amount: 60, days: 90, label: "3-Month", savings: "20%" },
  { amount: 100, days: 180, label: "6-Month", savings: "33%" },
  { amount: 150, days: 365, label: "Yearly", savings: "40%" }
];

// UPI payment details
const upiId = "harmish@superyes";
const name = "PremiumAccess";
let Amt = 0;
let qrTimeout;

// DOM Elements
const elements = {
  amountSelect: document.getElementById('amount'),
  customAmountDiv: document.getElementById('customAmountDiv'),
  customAmountInput: document.getElementById('customAmountInput'),
  periodDisplay: document.getElementById('period'),
  upiIdElement: document.getElementById('upiId'),
  qrCodeImage: document.getElementById('qrCode'),
  downloadBtn: document.getElementById('downloadBtn'),
  paymentDoneBtn: document.getElementById('paymentDoneBtn'),
  confirmationMsg: document.getElementById('confirmation-msg'),
  paymentForm: document.getElementById('payment-form'),
  usernameInput: document.getElementById('username'),
  txnIdInput: document.getElementById('txnId'),
  usernameError: document.getElementById('username-error'),
  txnIdError: document.getElementById('txnId-error'),
  submitBtn: document.getElementById('submitBtn'),
  toast: document.getElementById('toast'),
  toggleBtn: document.getElementById('toggleBtn')
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Set up event listeners
  if (elements.amountSelect) {
    elements.amountSelect.addEventListener('change', onAmountChange);
  }
  
  if (elements.customAmountInput) {
    elements.customAmountInput.addEventListener('input', validateCustomAmount);
  }
  
  if (elements.upiIdElement) {
    elements.upiIdElement.addEventListener('click', copyUPIId);
  }
  
  if (elements.downloadBtn) {
    elements.downloadBtn.addEventListener('click', downloadQR);
  }
  
  if (elements.paymentDoneBtn) {
    elements.paymentDoneBtn.addEventListener('click', showForm);
  }
  
  if (elements.submitBtn) {
    elements.submitBtn.addEventListener('click', submitPayment);
  }
  
  if (elements.toggleBtn) {
    elements.toggleBtn.addEventListener('click', toggleMode);
  }
  
  // Validate inputs in real-time
  if (elements.usernameInput) {
    elements.usernameInput.addEventListener('input', validateForm);
  }
  
  if (elements.txnIdInput) {
    elements.txnIdInput.addEventListener('input', validateForm);
  }
  
  // Initialize QR code
  generateQR();
  
  // Check theme preference
  checkThemePreference();
});

// Improved time period formatting
function formatDaysToYMD(totalDays) {
  if (totalDays < 1) return "Less than 1 Day";
  
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = Math.floor((totalDays % 365) % 30);
  
  // Special cases for cleaner display
  if (years >= 1 && months === 0 && days === 0) {
    return years === 1 ? "1 Year" : `${years} Years`;
  }
  if (months >= 1 && days === 0) {
    return months === 1 ? "1 Month" : `${months} Months`;
  }
  if (days > 0 && months === 0 && years === 0) {
    return days === 1 ? "1 Day" : `${days} Days`;
  }
  
  // Build parts array only for mixed durations
  const parts = [];
  if (years > 0) parts.push(years === 1 ? "1 Year" : `${years} Years`);
  if (months > 0) parts.push(months === 1 ? "1 Month" : `${months} Months`);
  if (days > 0) parts.push(days === 1 ? "1 Day" : `${days} Days`);
  
  return parts.join(" ");
}

function interpolateCustomDays(amount) {
  // Clamp amount between minimum and maximum tier values
  amount = Math.max(5, Math.min(150, amount));
  
  // 1. Check for exact tier match
  const exactTier = tiers.find(t => t.amount === amount);
  if (exactTier) return exactTier.days;
  
  // 2. Handle amounts below first tier
  if (amount < tiers[0].amount) {
    return Math.max(1, Math.round((amount / tiers[0].amount) * tiers[0].days));
  }
  
  // 3. Handle amounts above last tier
  if (amount > tiers[tiers.length - 1].amount) {
    return Math.round((amount / tiers[tiers.length - 1].amount) * tiers[tiers.length - 1].days);
  }
  
  // 4. Find the tier bracket the amount falls into
  let lowerTier, upperTier;
  for (let i = 0; i < tiers.length - 1; i++) {
    if (amount >= tiers[i].amount && amount <= tiers[i+1].amount) {
      lowerTier = tiers[i];
      upperTier = tiers[i+1];
      break;
    }
  }
  
  // 5. Calculate proportional days based on tier rates
  const lowerRate = lowerTier.amount / lowerTier.days;
  const upperRate = upperTier.amount / upperTier.days;
  
  // Calculate days using weighted average of tier rates
  const weight = (amount - lowerTier.amount) / (upperTier.amount - lowerTier.amount);
  const effectiveRate = lowerRate + (upperRate - lowerRate) * weight;
  
  return Math.round(amount / effectiveRate);
}

// Updated period display function
function updatePeriod(amountValue) {
  if (!elements.periodDisplay) return;
  
  if (!amountValue || amountValue === "") {
    elements.periodDisplay.innerText = "";
    return;
  }
  
  const amount = Number(amountValue);
  if (isNaN(amount)) {
    elements.periodDisplay.innerText = "Invalid amount";
    return;
  }
  
  if (amount < 5) {
    elements.periodDisplay.innerText = "Minimum amount is ₹5";
    return;
  }
  
  if (amount > 150) {
    elements.periodDisplay.innerText = "Maximum amount is ₹150";
    return;
  }
  
  // Calculate days based on amount
  const days = interpolateCustomDays(amount);
  
  // Find matching tier for savings info
  const tier = tiers.find(t => t.amount === amount);
  
  // Format display text
  let displayText = `Time Period: ${formatDaysToYMD(days)}`;
  
  // Calculate and show savings if available
  if (tier && tier.savings) {
    displayText += ` (Save ${tier.savings})`;
  } else if (days > 0) {
    // Calculate effective savings compared to base rate
    const baseRate = tiers[0].amount / tiers[0].days;
    const effectiveRate = amount / days;
    const savingsPercent = Math.round((1 - effectiveRate / baseRate) * 100);
    
    if (savingsPercent > 0) {
      displayText += ` (Save ~${savingsPercent}%)`;
    }
  }
  
  elements.periodDisplay.innerText = displayText;
}

// Handle amount selection change
function onAmountChange() {
  if (!elements.amountSelect || !elements.customAmountDiv || !elements.customAmountInput) return;
  
  if (elements.amountSelect.value === "custom") {
    elements.customAmountDiv.style.display = "block";
    elements.customAmountInput.value = "";
    elements.customAmountInput.setAttribute("max", "150");
    if (elements.periodDisplay) {
      elements.periodDisplay.innerText = "";
    }
    elements.customAmountInput.focus();
  } else {
    elements.customAmountDiv.style.display = "none";
    updatePeriod(elements.amountSelect.value);
  }
  generateQR();
}

// Validate custom amount input
function validateCustomAmount() {
  if (!elements.customAmountInput) return;
  
  const value = parseInt(elements.customAmountInput.value);
  
  if (isNaN(value)) {
    return;
  }
  
  if (value > 150) {
    elements.customAmountInput.value = 150;
    showToast("Maximum custom amount is ₹150");
  } else if (value < 1) {
    showToast("Minimum custom amount is ₹5");
    elements.customAmountInput.value = 5;
  }
  
  generateQR();
}

// Copy UPI ID to clipboard
function copyUPIId() {
  if (!elements.upiIdElement) return;
  
  navigator.clipboard.writeText(upiId)
    .then(() => {
      elements.upiIdElement.classList.add("copied");
      setTimeout(() => {
        if (elements.upiIdElement) {
          elements.upiIdElement.classList.remove("copied");
        }
      }, 1500);
      showToast("UPI ID copied to clipboard!");
    })
    .catch(err => {
      console.error("Failed to copy UPI ID:", err);
      showToast("Failed to copy UPI ID", "error");
    });
}

// Generate QR code with debounce for custom amounts
function generateQR() {
  if (!elements.amountSelect || !elements.qrCodeImage) return;
  
  const select = elements.amountSelect;
  let value = select.value;
  
  if (value === "custom") {
    value = elements.customAmountInput ? elements.customAmountInput.value || 5 : 5;
    clearTimeout(qrTimeout);
    qrTimeout = setTimeout(() => {
      // Validate amount is at least 5
      if (value < 5) {
        showToast("Minimum amount is ₹5", "error");
        if (elements.customAmountInput) {
          elements.customAmountInput.value = 5;
        }
        value = 5;
      }
      updatePeriod(value);
      createQRCode(value);
    }, 800);
  } else {
    updatePeriod(value);
    createQRCode(value);
  }
}

// Create the actual QR code
function createQRCode(amount) {
  if (!elements.qrCodeImage) return;
  
  amount = Math.max(5, amount); // Ensure amount is never less than 5
  Amt = amount;
  const tier = tiers.find(t => t.amount === Number(amount));
  const periodText = tier ? tier.label : formatDaysToYMD(interpolateCustomDays(amount));
  
  const tn = `MovieHub Premium (${periodText}) - Thank you!`;
  const upiURL = `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR&tn=${encodeURIComponent(tn)}`;
  
  const size = 500;
  const logoSize = 100;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  
  const qr = new QRious({
    element: canvas,
    value: upiURL,
    size: size,
    level: 'H'
  });
  
  const ctx = canvas.getContext("2d");
  
  const logo = new Image();
  logo.crossOrigin = "anonymous";
  logo.src = "movie hub logo.jpg";
  
  logo.onload = function() {
    const centerX = (canvas.width - logoSize) / 2;
    const centerY = (canvas.height - logoSize) / 2;
    
    // Draw circular clip and logo
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX + logoSize/2, centerY + logoSize/2, logoSize/2, 0, Math.PI*2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logo, centerX, centerY, logoSize, logoSize);
    ctx.restore();
    
    // Draw white border around logo
    ctx.beginPath();
    ctx.arc(centerX + logoSize/2, centerY + logoSize/2, logoSize/2 + 4, 0, Math.PI*2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8;
    ctx.stroke();
    
    // Draw amount text with styling
    const text = `₹${amount}`;
    const textX = canvas.width / 2;
    const textY = centerY + logoSize + 25;

    ctx.font = "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // White border around text
    ctx.lineWidth = 26;
    ctx.strokeStyle = "white";
    ctx.strokeText(text, textX, textY);

    // Solid black fill
    ctx.fillStyle = "#000";
    ctx.fillText(text, textX, textY);
    
    // Set the QR image source from canvas
    elements.qrCodeImage.src = canvas.toDataURL("image/png", 1.0);
  };
}

// Download QR code as PNG
function downloadQR() {
  if (!elements.qrCodeImage || !elements.qrCodeImage.src) {
    showToast("Please generate the QR code first", "error");
    return;
  }
  
  const link = document.createElement('a');
  link.href = elements.qrCodeImage.src;
  link.download = `MovieHub-Payment-₹${Amt}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("QR code downloaded!");
}

// Show payment form
function showForm() {
  if (!elements.paymentForm || !elements.paymentDoneBtn) return;
  
  elements.paymentForm.style.opacity = "1";
  elements.paymentForm.style.maxHeight = "500px";
  elements.paymentForm.style.padding = "20px";
  elements.paymentForm.style.margin = "30px auto";
  elements.paymentDoneBtn.style.display = "none";
  
  // Scroll to form
  elements.paymentForm.scrollIntoView({ behavior: 'smooth' });
}

// Validate form inputs
function validateForm() {
  if (!elements.usernameInput || !elements.txnIdInput || 
      !elements.usernameError || !elements.txnIdError || !elements.submitBtn) {
    return;
  }
  
  const username = elements.usernameInput.value.trim();
  const txnId = elements.txnIdInput.value.trim();
  
  // Validate username
  if (username.length < 3 || username.length > 32 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    elements.usernameError.textContent = "Username must be 3-32 characters (letters, numbers, _)";
    elements.usernameError.style.display = "block";
    elements.usernameInput.classList.add("error");
  } else {
    elements.usernameError.style.display = "none";
    elements.usernameInput.classList.remove("error");
  }
  
  // Validate transaction ID
  if (!/^\d{12}$/.test(txnId)) {
    elements.txnIdError.textContent = "Transaction ID must be 12 digits";
    elements.txnIdError.style.display = "block";
    elements.txnIdInput.classList.add("error");
  } else {
    elements.txnIdError.style.display = "none";
    elements.txnIdInput.classList.remove("error");
  }
  
  // Enable submit button if all valid
  elements.submitBtn.disabled = !(
    username.length >= 3 && 
    username.length <= 32 && 
    /^[a-zA-Z0-9_]+$/.test(username) &&
    /^\d{12}$/.test(txnId)
  );
}

// Sanitize input to prevent XSS
function sanitizeInput(input) {
  return input.replace(/[<>'"&]/g, '');
}

async function submitPayment() {
  if (!elements.usernameInput || !elements.txnIdInput || 
      !elements.amountSelect || !elements.customAmountInput) {
    showToast("System error: Form elements missing", "error");
    return;
  }
  
  // Get and validate form values
  const username = elements.usernameInput.value.trim().replace('@', '');
  const txnId = elements.txnIdInput.value.trim();
  const amount = elements.amountSelect.value === "custom" 
    ? Number(elements.customAmountInput.value.trim()) 
    : Number(elements.amountSelect.value);
  
  if (!validateUsername(username) || !/^\d{12}$/.test(txnId) || isNaN(amount) || amount <= 0) {
    showToast("Please check your inputs", "error");
    return;
  }

  // Calculate period
  const days = interpolateCustomDays(amount);
  const period = formatDaysToYMD(days);

  // Create compact payment string
  const paymentString = `${username}|${txnId}|${amount}|${period.replace(/\s+/g, '')}`;
  
  // Base64 encode (shorter than JSON)
  const encodedData = btoa(paymentString).replace(/=/g, '');
  
  // Generate Telegram links
  const botUsername = "moviehubpayment_bot";
  const links = {
    app: `tg://resolve?domain=${botUsername}&start=${encodedData}`,
    web: `https://t.me/${botUsername}?start=${encodedData}`
  };

  // Show processing UI
  elements.submitBtn.disabled = true;
  elements.submitBtn.textContent = "Redirecting...";
  
  // Try to open Telegram app first
  window.location.href = links.app;
  
  // Fallback to web after delay
  setTimeout(() => {
    if (!document.hidden) {
      window.open(links.web, '_blank');
    }
    
    // Show confirmation with manual option
    elements.confirmationMsg.innerHTML = `
      <div class="confirmation-box">
        <h3>Payment Successful!</h3>
        <p>If not redirected automatically:</p>
        <ol>
          <li>Open Telegram</li>
          <li>Search for @${botUsername}</li>
          <li>Send: <code>/start ${encodedData}</code></li>
        </ol>
        <a href="${links.web}" class="telegram-button">
          Open Telegram Now
        </a>
      </div>
    `;
    elements.confirmationMsg.style.display = "block";
    elements.submitBtn.disabled = false;
    elements.submitBtn.textContent = "Submit & Send Screenshot";
  }, 800);
}

// Show toast notification
function showToast(message = "Operation completed", type = "success") {
  if (!elements.toast) return;
  
  elements.toast.textContent = message;
  elements.toast.style.backgroundColor = type === "error" ? "#ef4444" : "#22c55e";
  elements.toast.style.display = "block";
  
  setTimeout(() => {
    elements.toast.style.display = "none";
  }, 3000);
}

// Toggle dark/light mode
function toggleMode() {
  if (!elements.toggleBtn) return;
  
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  
  elements.toggleBtn.textContent = isLight ? '🌙' : '☀️';
  elements.toggleBtn.classList.toggle('dark', !isLight);
  elements.toggleBtn.classList.toggle('light', isLight);
  
  // Save preference
  localStorage.setItem('themePreference', isLight ? 'light' : 'dark');
}

// Check for saved theme preference
function checkThemePreference() {
  if (!elements.toggleBtn) return;
  
  const savedTheme = localStorage.getItem('themePreference');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    elements.toggleBtn.textContent = '🌙';
    elements.toggleBtn.classList.add('light');
    elements.toggleBtn.classList.remove('dark');
  }
}

// Validate Telegram username format
function validateUsername(username) {
  return /^[a-zA-Z0-9_]{3,32}$/.test(username.replace('@', ''));
  }
