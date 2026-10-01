import { supabase } from './supabase.js';

const reportDatePicker = document.getElementById('reportDatePicker');
const printContent = document.getElementById('printContent');

function formatLocalDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadReportForDate(dateStr) {
  if (!printContent) return;
  
  printContent.innerHTML = `<div class="py-20 text-center"><p class="text-slate-400 font-bold animate-pulse">Fetching report data for ${dateStr}...</p></div>`;
  
  try {
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      printContent.innerHTML = `
        <div class="py-20 text-center flex flex-col items-center">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
             <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
          </div>
          <h3 class="text-xl font-extrabold text-slate-700">No Parcels Found</h3>
          <p class="text-slate-500 font-medium mt-1">There are no packages recorded for ${dateStr}.</p>
        </div>
      `;
      return;
    }

    const html = `
      <div class="mb-6 md:mb-8 text-center md:text-left print:text-left">
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">SwiftParcel Daily Report</h1>
        <p class="text-slate-500 font-bold mt-1">Date: <span class="text-blue-600">${dateStr}</span> &bull; Total Parcels: <span class="text-blue-600">${data.length}</span></p>
      </div>
      <table class="w-full text-left border-collapse responsive-table">
        <thead>
          <tr class="border-b-2 border-slate-200">
            <th class="py-3 px-3 md:px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
            <th class="py-3 px-3 md:px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client Details</th>
            <th class="py-3 px-3 md:px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Address</th>
            <th class="py-3 px-3 md:px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Phones</th>
            <th class="py-3 px-3 md:px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status & Note</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${data.map((pkg, index) => `
            <tr class="hover:bg-slate-50 transition-colors group">
              <td data-label="#" class="py-3 px-3 md:px-4 text-sm font-extrabold text-slate-400 w-12 align-top">${index + 1}</td>
              <td data-label="Client Details" class="py-3 px-3 md:px-4 text-sm font-bold text-slate-800 align-top">
                ${pkg.client_name}
                ${pkg.sender_address ? `<div class="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">From: ${pkg.sender_address}</div>` : ''}
              </td>
              <td data-label="Delivery Address" class="py-3 px-3 md:px-4 text-sm font-semibold text-slate-700 max-w-[200px] align-top">${pkg.delivery_address || 'No Address'}</td>
              <td data-label="Contact Phones" class="py-3 px-3 md:px-4 text-sm font-bold text-slate-700 align-top">
                ${pkg.primary_phone ? `<div>P: ${pkg.primary_phone}</div>` : ''}
                ${pkg.secondary_phone ? `<div class="mt-1">S: ${pkg.secondary_phone}</div>` : ''}
                ${!pkg.primary_phone && !pkg.secondary_phone ? '<span class="italic text-slate-400">None</span>' : ''}
              </td>
              <td data-label="Status & Note" class="py-3 px-3 md:px-4 align-top">
                <span class="text-xs font-bold ${pkg.status === 'Pending' ? 'text-amber-600' : pkg.status === 'Delivered' ? 'text-emerald-600' : 'text-rose-600'}">
                  ${pkg.status.toUpperCase()}
                </span>
                ${pkg.note ? `<p class="text-xs text-slate-600 font-normal italic mt-1 leading-tight">${pkg.note}</p>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    printContent.innerHTML = html;
  } catch (error) {
    console.error("Error fetching report:", error);
    printContent.innerHTML = `<div class="py-20 text-center text-rose-500 font-bold">Failed to load report. Please try again.</div>`;
  }
}

if (reportDatePicker) {
  reportDatePicker.addEventListener('change', (e) => {
    if (e.target.value) {
      loadReportForDate(e.target.value);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const todayStr = formatLocalDate(new Date());
  if (reportDatePicker) {
    reportDatePicker.value = todayStr;
  }
  loadReportForDate(todayStr);
});
