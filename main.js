import './style.css'
import { supabase } from './supabase.js'

// DOM Elements
const packagesContainer = document.getElementById('packagesContainer');
const desktopScanBtn = document.getElementById('desktopScanBtn');
const mobileScanBtn = document.getElementById('mobileScanBtn');
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
  const { data, error } = await supabase.from('packages').select('*').order('created_at', { ascending: false });

  if (error) {
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
  if (currentPackages.length === 0) {
    packagesContainer.innerHTML = `
      <div class="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center col-span-full min-h-[300px]">
        <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-5">
          <svg class="w-10 h-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
        </div>
        <p class="font-extrabold text-2xl text-slate-800">No Parcels Yet</p>
        <p class="text-base font-semibold text-slate-500 mt-2">Tap "Scan Label" to add your first delivery.</p>
      </div>`;
    return;
  }

  packagesContainer.innerHTML = currentPackages.map(pkg => `
    <div class="bg-white rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col gap-4 relative overflow-hidden h-full">
      <div class="absolute left-0 top-0 bottom-0 w-1.5 ${pkg.status === 'Delivered' ? 'bg-emerald-500' : pkg.status === 'Canceled' ? 'bg-rose-500' : 'bg-amber-500'}"></div>
      <div class="flex justify-between items-start pl-2">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center font-extrabold text-xl shrink-0">
            ${pkg.client_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 class="font-extrabold text-slate-800 text-base leading-tight pr-2">${pkg.client_name}</h3>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 max-w-[140px] truncate">From: ${pkg.sender_address || 'Unknown'}</p>
          </div>
        </div>
        <select 
          onchange="updateStatus('${pkg.id}', this.value)" 
          class="text-xs font-extrabold rounded-xl px-3 py-1.5 outline-none shadow-sm appearance-none text-center cursor-pointer transition-colors
            ${pkg.status === 'Delivered' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 
              pkg.status === 'Canceled' ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100' : 
              'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'}"
        >
          <option value="Pending" ${pkg.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
          <option value="Delivered" ${pkg.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
          <option value="Canceled" ${pkg.status === 'Canceled' ? 'selected' : ''}>❌ Canceled</option>
        </select>
      </div>
      <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 ml-2 flex-1">
        <div class="flex items-start gap-2.5">
          <svg class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <p class="text-[13px] font-bold text-slate-700 leading-snug">${pkg.delivery_address}</p>
        </div>
      </div>
      <div class="flex flex-col gap-3 pl-2 mt-auto">
        ${(pkg.primary_phone || pkg.secondary_phone) ? `
          <div class="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            ${pkg.primary_phone ? `<a href="tel:${pkg.primary_phone}" class="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-100 px-3 py-2.5 rounded-xl text-xs font-extrabold hover:bg-blue-100 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg> Call</a>` : ''}
            ${pkg.secondary_phone ? `<a href="tel:${pkg.secondary_phone}" class="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-extrabold hover:bg-slate-100 transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg> Alt</a>` : ''}
          </div>
        ` : ''}
        <input type="text" value="${pkg.note || ''}" placeholder="Add courier note..." onblur="updateNote('${pkg.id}', this.value)" class="w-full text-[13px] bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-bold text-slate-700 hover:bg-white" />
      </div>
    </div>
  `).join('');
}

function updateStats() {
  document.getElementById('stat-total').textContent = currentPackages.length;
  document.getElementById('stat-pending').textContent = currentPackages.filter(p => p.status === 'Pending').length;
  document.getElementById('stat-delivered').textContent = currentPackages.filter(p => p.status === 'Delivered').length;
}

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

// --- Live Camera Scanner Logic ---

// Hidden file input fallback just in case camera fails
const fallbackInput = document.createElement('input');
fallbackInput.type = 'file';
fallbackInput.accept = 'image/*';
fallbackInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const b64 = await fileToBase64(file);
  processSnapshot(b64.split(',')[1], file.type);
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
  
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const base64Data = dataUrl.split(',')[1];
  
  stopCamera();
  processSnapshot(base64Data, 'image/jpeg');
});

// Bind Buttons
desktopScanBtn.addEventListener('click', startCamera);
mobileScanBtn.addEventListener('click', startCamera);

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

    if (!response.ok) throw new Error("API Error");

    const data = await response.json();
    const textContent = data.candidates[0].content.parts[0].text;
    
    try {
      const parsedData = JSON.parse(textContent);
      populateModal(parsedData);
      hideLoading();
      openModal();
    } catch (e) {
      hideLoading();
      showToast("AI could not read the text clearly. Please try again.", "error");
    }
  } catch (error) {
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

function openModal() {
  verifyModal.classList.remove('hidden');
  verifyModal.classList.add('flex');
  setTimeout(() => {
    verifyModal.classList.remove('opacity-0');
    verifyModalContent.classList.remove('translate-y-full', 'sm:scale-95');
  }, 10);
}

function closeModal() {
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

  const newPackage = {
    client_name: vClient.value,
    delivery_address: vDelivery.value,
    primary_phone: vPhone1.value,
    secondary_phone: vPhone2.value,
    sender_address: vSender.value,
    status: 'Pending',
    note: ''
  };

  const originalText = saveDataBtn.innerHTML;
  saveDataBtn.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Saving...`;
  saveDataBtn.disabled = true;

  const { data, error } = await supabase.from('packages').insert([newPackage]).select();

  saveDataBtn.innerHTML = originalText;
  saveDataBtn.disabled = false;

  if (error) {
    showToast("Database Error: Failed to save.", "error");
  } else {
    currentPackages.unshift(data[0]);
    renderPackages();
    updateStats();
    closeModal();
    showToast("Package saved successfully!", "success");
  }
});

printBtn.addEventListener('click', () => window.print());

function showLoading() {
  loadingOverlay.classList.remove('hidden');
  loadingOverlay.classList.add('flex');
}
function hideLoading() {
  loadingOverlay.classList.add('hidden');
  loadingOverlay.classList.remove('flex');
}

init();
