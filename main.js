import '@dotlottie/player-component';
import './style.css';
import { supabase } from './supabase.js';

let currentUser = null;

// Auth Guard
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/login.html';
    return;
  }
  currentUser = session.user;
}
await checkAuth();

// --- ERROR LOGGER ---
// We now hide raw errors from regular users and only log to console
window.logAppError = function(source, err) {
  console.error(`[${source}]`, err);
  // Do not show the debug panel in production
};

window.addEventListener('error', (event) => {
  window.logAppError('Runtime Error', `${event.message} at ${event.filename}:${event.lineno}`);
});

window.addEventListener('unhandledrejection', (event) => {
  window.logAppError('Unhandled Promise', event.reason);
});
// --------------------------------------

// DOM Elements
const packagesContainer = document.getElementById('packagesContainer');
const desktopScanBtn = document.getElementById('desktopScanBtn');
const mobileScanBtn = document.getElementById('mobileScanBtn');
const resetBtn = document.getElementById('resetBtn');
const printBtn = document.getElementById('printBtn');

const verifyModal = document.getElementById('verifyModal');
const verifyModalContent = document.getElementById('verifyModalContent');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveDataBtn = document.getElementById('saveDataBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

// Camera Elements
const cameraScannerModal = document.getElementById('cameraScannerModal');
const cameraFeed = document.getElementById('cameraFeed');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const captureBtn = document.getElementById('captureBtn');

// Form Elements
const vClient = document.getElementById('v-client');
const vDelivery = document.getElementById('v-delivery');
const vPhone1 = document.getElementById('v-phone1');
const vPhone2 = document.getElementById('v-phone2');
const vSender = document.getElementById('v-sender');

let currentPackages = [];
let mediaStream = null;
let currentFilter = 'All';
let editingPackageId = null;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Custom Toast Alert System
function showToast(message, type = 'error') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  
  const isError = type === 'error';
  const bgColor = isError ? 'bg-rose-500' : 'bg-emerald-500';
  const shadow = isError ? 'shadow-rose-500/30' : 'shadow-emerald-500/30';
  const icon = isError 
    ? '<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    : '<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';

  toast.className = `flex items-center gap-3 w-full max-w-md mx-auto ${bgColor} text-white px-5 py-4 rounded-2xl shadow-xl ${shadow} transform transition-all duration-300 translate-y-[-100%] opacity-0 pointer-events-auto`;
  toast.innerHTML = `${icon}<p class="font-extrabold text-sm leading-snug">${message}</p>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-[-100%]', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'scale-95');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Init
async function init() {
  await fetchPackages();
}

async function fetchPackages() {
  if (!navigator.onLine) {
    if (typeof showOfflineOverlay === 'function') showOfflineOverlay();
    return;
  }

  const { data, error } = await supabase.from('packages').select('*').order('created_at', { ascending: false });

  if (error) {
    // Treat 'Failed to fetch' as an offline / network error
    if (!navigator.onLine || (error.message && error.message.toLowerCase().includes('fetch'))) {
      if (typeof showOfflineOverlay === 'function') showOfflineOverlay();
      return;
    }
    
    showToast('Database Error! Please make sure you ran schema.sql in Supabase.', 'error');
    packagesContainer.innerHTML = `<div class="bg-rose-50 rounded-3xl p-8 border border-rose-200 flex flex-col items-center justify-center text-center col-span-full"><p class="font-extrabold text-lg text-rose-700">Setup Required</p><p class="text-xs font-bold text-rose-500 mt-2">Run the schema.sql file in your Supabase SQL editor.</p></div>`;
    return;
  }
  currentPackages = data;
  renderPackages();
  updateStats();
}

// Render Packages for Grid/Column Layout
function renderPackages() {
  const filtered = currentFilter === 'All' ? currentPackages : currentPackages.filter(p => p.status === currentFilter);

  if (filtered.length === 0) {
    packagesContainer.innerHTML = `
      <div class="bg-white rounded-[2rem] p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center col-span-full min-h-[300px]">
        <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-5">
          <svg class="w-10 h-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
        </div>
        <p class="font-extrabold text-2xl text-slate-800">No Parcels Yet</p>
        <p class="text-base font-semibold text-slate-500 mt-2">No parcels match this filter.</p>
      </div>`;
    return;
  }

  packagesContainer.innerHTML = filtered.map((pkg, idx) => `
    <div class="bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col gap-3 relative overflow-hidden h-full">
      <div class="absolute left-0 top-0 bottom-0 w-1.5 ${pkg.status === 'Delivered' ? 'bg-emerald-500' : pkg.status === 'Canceled' ? 'bg-rose-500' : 'bg-amber-500'}"></div>
      
      <!-- Top Row: Avatar, Name, Address, Status -->
      <div class="flex justify-between items-start pl-2 gap-2">
        <div class="flex items-start gap-3 cursor-pointer group flex-1" onclick="openEditModal('${pkg.id}')">
          <div class="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center font-extrabold text-lg shrink-0 group-hover:scale-105 transition-transform">
            ${pkg.client_name.charAt(0).toUpperCase()}
            <div class="absolute -top-2 -left-2 bg-slate-800 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm border-2 border-white z-10">${idx + 1}</div>
          </div>
          <div class="flex flex-col">
            <h3 class="font-extrabold text-slate-800 text-[15px] leading-tight group-hover:text-blue-600 transition-colors">${pkg.client_name}</h3>
            <p class="text-[11px] font-bold text-slate-500 leading-tight mt-1 line-clamp-2">${pkg.delivery_address || 'No Address Provided'}</p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          <select 
            onchange="updateStatus('${pkg.id}', this.value)" 
            class="text-[11px] font-extrabold rounded-lg px-2 py-1 outline-none shadow-sm appearance-none text-center cursor-pointer transition-colors w-full
              ${pkg.status === 'Delivered' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 
                pkg.status === 'Canceled' ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100' : 
                'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'}"
          >
            <option value="Pending" ${pkg.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
            <option value="Delivered" ${pkg.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
            <option value="Canceled" ${pkg.status === 'Canceled' ? 'selected' : ''}>❌ Canceled</option>
          </select>
          <button onclick="deletePackage('${pkg.id}', event)" class="flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors" title="Delete Parcel">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      </div>

      <!-- Phone Numbers & Note -->
      <div class="flex flex-col gap-2 pl-2 mt-1">
        ${pkg.primary_phone || pkg.secondary_phone ? `
          <div class="flex flex-col gap-1.5">
            ${pkg.primary_phone ? `
              <div class="flex items-center gap-2">
                <input type="tel" value="${pkg.primary_phone}" onblur="updatePhone('${pkg.id}', 'primary_phone', this.value)" class="flex-1 text-[13px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 focus:bg-white transition-colors" placeholder="Primary phone..." />
                <a href="tel:${pkg.primary_phone}" class="bg-blue-100 text-blue-600 p-1.5 rounded-lg hover:bg-blue-200 transition-colors shrink-0" title="Call Primary">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                </a>
              </div>
            ` : ''}
            ${pkg.secondary_phone ? `
              <div class="flex items-center gap-2">
                <input type="tel" value="${pkg.secondary_phone}" onblur="updatePhone('${pkg.id}', 'secondary_phone', this.value)" class="flex-1 text-[13px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 focus:bg-white transition-colors" placeholder="Secondary phone..." />
                <a href="tel:${pkg.secondary_phone}" class="bg-slate-100 text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors shrink-0" title="Call Secondary">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                </a>
              </div>
            ` : ''}
          </div>
        ` : `<div class="text-[11px] font-bold text-slate-400 italic">No phone numbers</div>`}
        
        <input type="text" value="${pkg.note || ''}" placeholder="Add courier note..." onblur="updateNote('${pkg.id}', this.value)" class="w-full text-[12px] bg-slate-50/50 border border-slate-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-700 mt-1" />
      </div>
    </div>
  `).join('');
}

function updateStats() {
  document.getElementById('stat-total').textContent = currentPackages.length;
  document.getElementById('stat-pending').textContent = currentPackages.filter(p => p.status === 'Pending').length;
  document.getElementById('stat-delivered').textContent = currentPackages.filter(p => p.status === 'Delivered').length;
  document.getElementById('stat-canceled').textContent = currentPackages.filter(p => p.status === 'Canceled').length;
}

window.setFilter = (filter) => {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.id === `filter-${filter}`) {
      btn.classList.remove('opacity-60', 'scale-95', 'bg-transparent', 'hover:bg-slate-50');
      btn.classList.add('opacity-100', 'scale-100', 'bg-slate-100', 'shadow-sm');
    } else {
      btn.classList.add('opacity-60', 'scale-95', 'bg-transparent', 'hover:bg-slate-50');
      btn.classList.remove('opacity-100', 'scale-100', 'bg-slate-100', 'shadow-sm');
    }
  });
  renderPackages();
};

window.openEditModal = (id) => {
  const pkg = currentPackages.find(p => p.id === id);
  if (!pkg) return;
  editingPackageId = id;
  document.getElementById('modalTitle').textContent = 'Edit Parcel Details';
  document.getElementById('saveBtnText').textContent = 'Update Changes';
  populateModal(pkg);
  openModal();
};

window.updatePhone = async (id, field, value) => {
  const { error } = await supabase.from('packages').update({ [field]: value }).eq('id', id);
  if (!error) {
    const pkg = currentPackages.find(p => p.id === id);
    if (pkg) pkg[field] = value;
  }
};

window.updateStatus = async (id, newStatus) => {
  const { error } = await supabase.from('packages').update({ status: newStatus }).eq('id', id);
  if (!error) {
    const pkg = currentPackages.find(p => p.id === id);
    if (pkg) pkg.status = newStatus;
    updateStats();
    renderPackages();
    showToast(`Status updated to ${newStatus}`, 'success');
  } else {
    showToast('Failed to update database!', 'error');
  }
};

window.updateNote = async (id, newNote) => {
  await supabase.from('packages').update({ note: newNote }).eq('id', id);
};

// Custom Confirm Modal Logic
const confirmModal = document.getElementById('confirmModal');
const confirmModalContent = document.getElementById('confirmModalContent');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
const proceedConfirmBtn = document.getElementById('proceedConfirmBtn');

let currentConfirmAction = null;

function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  
  currentConfirmAction = onConfirm;
  
  confirmModal.classList.remove('hidden');
  confirmModal.classList.add('flex');
  setTimeout(() => {
    confirmModal.classList.remove('opacity-0');
    confirmModalContent.classList.remove('scale-95');
  }, 10);
}

function hideConfirmModal() {
  confirmModal.classList.add('opacity-0');
  confirmModalContent.classList.add('scale-95');
  setTimeout(() => {
    confirmModal.classList.add('hidden');
    confirmModal.classList.remove('flex');
    currentConfirmAction = null;
  }, 300);
}

if (cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', hideConfirmModal);
if (proceedConfirmBtn) proceedConfirmBtn.addEventListener('click', () => {
  if (currentConfirmAction) {
    currentConfirmAction();
  }
  hideConfirmModal();
});

window.deletePackage = async (id, event) => {
  event.stopPropagation(); // Prevent opening edit modal
  showConfirmModal("Delete Parcel", "Are you sure you want to delete this parcel?", async () => {
    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (error) {
      showToast('Failed to delete parcel.', 'error');
    } else {
      currentPackages = currentPackages.filter(p => p.id !== id);
      renderPackages();
      updateStats();
      showToast('Parcel deleted successfully.', 'success');
    }
  });
};

// --- Image Downscaling Helper ---
function downscaleImage(canvas, maxDim = 1280) {
  let width = canvas.width;
  let height = canvas.height;
  
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }
  
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = width;
  scaledCanvas.height = height;
  const ctx = scaledCanvas.getContext('2d');
  ctx.drawImage(canvas, 0, 0, width, height);
  return scaledCanvas;
}

// Hidden file input fallback just in case camera fails
const fallbackInput = document.createElement('input');
fallbackInput.type = 'file';
fallbackInput.accept = 'image/*';
fallbackInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Downscale image from file input
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const scaledCanvas = downscaleImage(canvas);
    const dataUrl = scaledCanvas.toDataURL('image/jpeg', 0.85);
    processSnapshot(dataUrl.split(',')[1], 'image/jpeg');
  };
  img.src = await fileToBase64(file);
};

async function startCamera() {
  if (!GEMINI_API_KEY) {
    showToast("CRITICAL: VITE_GEMINI_API_KEY is missing!", "error");
    return;
  }
  
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
    });
    cameraFeed.srcObject = mediaStream;
    cameraScannerModal.classList.remove('hidden');
    cameraScannerModal.classList.add('flex');
  } catch (error) {
    console.error("Camera error:", error);
    showToast("No camera detected. Please upload an image instead.", "error");
    fallbackInput.click();
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  cameraScannerModal.classList.add('hidden');
  cameraScannerModal.classList.remove('flex');
}

closeCameraBtn.addEventListener('click', stopCamera);

captureBtn.addEventListener('click', () => {
  // Take snapshot using canvas
  const canvas = document.createElement('canvas');
  canvas.width = cameraFeed.videoWidth;
  canvas.height = cameraFeed.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
  
  // Downscale to prevent massive 4K payloads crashing mobile browsers
  const scaledCanvas = downscaleImage(canvas);
  const dataUrl = scaledCanvas.toDataURL('image/jpeg', 0.85);
  const base64Data = dataUrl.split(',')[1];
  
  stopCamera();
  processSnapshot(base64Data, 'image/jpeg');
});

// Desktop File Input for Scanning
const desktopFileInput = document.getElementById('desktopFileInput');
if (desktopFileInput) {
  desktopFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Set preview image in the desktop panel
    const previewImg = document.getElementById('desktopPreviewImg');
    if(previewImg) previewImg.src = URL.createObjectURL(file);
    
    // Downscale image from file input
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const scaledCanvas = downscaleImage(canvas);
      const dataUrl = scaledCanvas.toDataURL('image/jpeg', 0.85);
      processSnapshot(dataUrl.split(',')[1], 'image/jpeg');
    };
    img.src = await fileToBase64(file);
    
    // Reset input so the same file can be selected again if needed
    e.target.value = '';
  });
}

// Bind Buttons
// desktopScanBtn triggers the web camera from the top header
if (desktopScanBtn) {
  desktopScanBtn.addEventListener('click', startCamera);
}
mobileScanBtn.addEventListener('click', startCamera);

if (resetBtn) {
  const refreshLottie = document.getElementById('refreshLottie');
  if (refreshLottie) {
    resetBtn.addEventListener('mouseenter', () => {
      if(typeof refreshLottie.play === 'function') refreshLottie.play();
    });
    resetBtn.addEventListener('mouseleave', () => {
      if(typeof refreshLottie.stop === 'function') refreshLottie.stop();
    });
  }

  resetBtn.addEventListener('click', async () => {
    showConfirmModal("Reset Dashboard", "Are you sure you want to completely reset the parcel history? This will clear the dashboard for the next day.", async () => {
      // Not deleting by id > 0 because some ids might be UUIDs. We can use .neq('id', 'invalid-id-or-something') or .not('id', 'is', null)
      const { error } = await supabase.from('packages').delete().not('id', 'is', null);
      if (error) {
        showToast('Failed to reset data.', 'error');
        console.error(error);
      } else {
        showToast('Dashboard reset successfully.', 'success');
        currentPackages = [];
        renderPackages();
        updateStats();
      }
    });
  });
}
  
const enableBiometricsBtn = document.getElementById('enableBiometricsBtn');
if (enableBiometricsBtn) {
  enableBiometricsBtn.addEventListener('click', async () => {
    try {
      const result = await supabase.auth.registerPasskey();
      if (result.error) throw result.error;
      
      Swal.fire({
        title: 'Biometrics Enabled!',
        html: `
          <div style="display: flex; justify-content: center; align-items: center;">
            <dotlottie-player src="/success.lottie" background="transparent" speed="1" style="width: 150px; height: 150px;" autoplay></dotlottie-player>
          </div>
          <p>You can now use your fingerprint or FaceID to securely log into SwiftParcel.</p>
        `,
        confirmButtonText: 'Awesome',
        confirmButtonColor: '#3b82f6',
        customClass: {
          popup: 'rounded-3xl',
          confirmButton: 'rounded-xl font-bold px-6 py-2'
        }
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: err.message || 'Could not register biometric passkey. Check if your browser supports WebAuthn.',
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'rounded-3xl' }
      });
    }
  });
}

// File to base64 helper (for fallback)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function processSnapshot(base64Data, mimeType) {
  showLoading();
  editingPackageId = null; // Reset edit state when scanning new
  document.getElementById('modalTitle').textContent = 'Verify Extraction';
  document.getElementById('saveBtnText').textContent = 'Save Package';
  
  try {
    const prompt = `
      Extract the following details from this shipping label image:
      1. Client/Recipient Name
      2. Delivery Address
      3. Primary Phone Number
      4. Secondary Phone Number (if any)
      5. Sender/Return Address

      Respond ONLY with a valid, raw JSON object (no markdown formatting) using exactly these keys:
      {
        "client_name": "",
        "delivery_address": "",
        "primary_phone": "",
        "secondary_phone": "",
        "sender_address": ""
      }
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      window.logAppError("Gemini API HTTP Error", `Status: ${response.status}\nResponse: ${errText}`);
      console.error("Gemini API failed:", errText);
      throw new Error("API Error");
    }

    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    
    try {
      const parsedData = JSON.parse(textContent);
      populateModal(parsedData);
      hideLoading();
      openModal();
    } catch (e) {
      window.logAppError("Gemini JSON Parse Error", `Failed to parse: ${textContent}`);
      hideLoading();
      showToast("AI could not read the text clearly. Please try again.", "error");
    }
  } catch (error) {
    window.logAppError("Scanning Process Error", error);
    hideLoading();
    showToast("Network Error: Could not reach AI services.", "error");
  }
}

// Modal Logic
function populateModal(data) {
  vClient.value = data.client_name || '';
  vDelivery.value = data.delivery_address || '';
  vPhone1.value = data.primary_phone || '';
  vPhone2.value = data.secondary_phone || '';
  vSender.value = data.sender_address || '';
}

const isDesktop = () => window.innerWidth >= 1024;

// Modal & Desktop Panel Logic
function openModal() {
  const verifyForm = document.getElementById('verifyForm');
  const buttonsContainer = document.getElementById('saveDataBtn').parentElement;
  
  if (isDesktop() && !editingPackageId) {
    const desktopContainer = document.getElementById('desktopVerifyFormContainer');
    if(desktopContainer && verifyForm) {
       desktopContainer.appendChild(verifyForm);
       desktopContainer.appendChild(buttonsContainer);
       
       document.getElementById('desktopAnalysisResults')?.classList.remove('hidden');
       document.getElementById('desktopAnalysisResults')?.classList.add('flex');
    }
  } else {
    // Ensure form is inside the modal if it was previously moved
    const modalContent = document.getElementById('verifyModalContent');
    const modalBody = modalContent.querySelector('.overflow-y-auto');
    if (verifyForm && modalBody && verifyForm.parentElement !== modalBody) {
      modalBody.appendChild(verifyForm);
      modalContent.appendChild(buttonsContainer);
    }

    verifyModal.classList.remove('hidden');
    verifyModal.classList.add('flex');
    setTimeout(() => {
      verifyModal.classList.remove('opacity-0');
      verifyModalContent.classList.remove('translate-y-full', 'sm:scale-95');
    }, 10);
  }
}

function closeModal() {
  const verifyForm = document.getElementById('verifyForm');
  const buttonsContainer = document.getElementById('saveDataBtn').parentElement;
  const modalContent = document.getElementById('verifyModalContent');
  const modalBody = modalContent.querySelector('.overflow-y-auto');

  // Reset desktop panel back to upload zone if it was active
  if (document.getElementById('desktopAnalysisResults')?.classList.contains('flex')) {
    document.getElementById('desktopAnalysisResults')?.classList.add('hidden');
    document.getElementById('desktopAnalysisResults')?.classList.remove('flex');
    document.getElementById('desktopUploadZone')?.classList.remove('hidden');
    document.getElementById('desktopUploadZone')?.classList.add('flex');
  }
  
  // Always return the form to the modal safely
  if (verifyForm && modalBody) modalBody.appendChild(verifyForm);
  if (buttonsContainer && modalContent) modalContent.appendChild(buttonsContainer);

  verifyModal.classList.add('opacity-0');
  verifyModalContent.classList.add('translate-y-full', 'sm:scale-95');
  setTimeout(() => {
    verifyModal.classList.add('hidden');
    verifyModal.classList.remove('flex');
  }, 300);
}

closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

saveDataBtn.addEventListener('click', async () => {
  if (!vClient.value || !vDelivery.value) {
    showToast("Name and Address are required!", "error");
    return;
  }

  const pkgData = {
    client_name: vClient.value,
    delivery_address: vDelivery.value,
    primary_phone: vPhone1.value,
    secondary_phone: vPhone2.value,
    sender_address: vSender.value
  };

  const originalText = saveDataBtn.innerHTML;
  saveDataBtn.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Saving...`;
  saveDataBtn.disabled = true;

  let apiError = null;

  if (editingPackageId) {
    const { data, error } = await supabase.from('packages').update(pkgData).eq('id', editingPackageId).select();
    apiError = error;
    if (!error && data) {
      const idx = currentPackages.findIndex(p => p.id === editingPackageId);
      if (idx !== -1) currentPackages[idx] = data[0];
    }
  } else {
    pkgData.status = 'Pending';
    pkgData.note = '';
    pkgData.user_id = currentUser.id; // Attach logged-in user
    const { data, error } = await supabase.from('packages').insert([pkgData]).select();
    apiError = error;
    if (!error && data) {
      currentPackages.unshift(data[0]);
    }
  }

  saveDataBtn.innerHTML = originalText;
  saveDataBtn.disabled = false;

  if (apiError) {
    window.logAppError("Supabase DB Error", apiError);
    showToast(`Database Error: ${apiError.message || "Failed to save."}`, "error");
  } else {
    renderPackages();
    updateStats();
    closeModal();
    showToast(editingPackageId ? "Changes updated successfully!" : "Package saved successfully!", "success");
    editingPackageId = null;
  }
});

function showLoading() {
  if (isDesktop() && !editingPackageId) {
    document.getElementById('desktopUploadZone')?.classList.add('hidden');
    document.getElementById('desktopUploadZone')?.classList.remove('flex');
    document.getElementById('desktopAnalysisResults')?.classList.add('hidden');
    document.getElementById('desktopAnalysisResults')?.classList.remove('flex');
    document.getElementById('desktopAiLoadingState')?.classList.remove('hidden');
    document.getElementById('desktopAiLoadingState')?.classList.add('flex');
  } else {
    if (loadingOverlay) {
      loadingOverlay.classList.remove('hidden');
      loadingOverlay.classList.add('flex');
    }
  }
}

function hideLoading() {
  document.getElementById('desktopAiLoadingState')?.classList.add('hidden');
  document.getElementById('desktopAiLoadingState')?.classList.remove('flex');
  
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('flex');
  }
}

init();

// --- Network Connectivity Logic ---
const offlineOverlay = document.getElementById('offlineOverlay');

function showOfflineOverlay() {
  if (offlineOverlay) {
    offlineOverlay.classList.remove('hidden');
    offlineOverlay.classList.add('flex');
    setTimeout(() => {
      offlineOverlay.classList.remove('opacity-0');
    }, 10);
  }
}

function hideOfflineOverlay() {
  if (offlineOverlay) {
    offlineOverlay.classList.add('opacity-0');
    setTimeout(() => {
      offlineOverlay.classList.add('hidden');
      offlineOverlay.classList.remove('flex');
      // Refetch packages when connection is back
      fetchPackages();
    }, 500); // Wait for transition
  }
}

window.addEventListener('offline', showOfflineOverlay);
window.addEventListener('online', hideOfflineOverlay);

// Check on initial load
if (!navigator.onLine) {
  showOfflineOverlay();
}

// Logout Logic
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      window.logAppError("Logout Error", error);
    } else {
      window.location.href = '/login.html';
    }
  });
}
