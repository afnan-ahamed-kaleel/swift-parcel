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

      <!-- Mobile Cards View (Hidden on Desktop & Print) -->
      <div class="block md:hidden print:hidden space-y-4">
        ${data.map((pkg, i) => `
          <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col gap-3">
            <!-- Colored left border accent -->
            <div class="absolute left-0 top-0 bottom-0 w-1.5 ${pkg.status === 'Pending' ? 'bg-amber-500' : pkg.status === 'Delivered' ? 'bg-emerald-500' : 'bg-rose-500'}"></div>
            
            <!-- Header: #, Name, Status -->
            <div class="flex justify-between items-start pl-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#${i + 1}</span>
                <h3 class="font-extrabold text-slate-800 text-sm leading-tight">${pkg.client_name}</h3>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${pkg.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : pkg.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}">
                ${pkg.status.toUpperCase()}
              </span>
            </div>
            
            <!-- Body: Address and Contact -->
            <div class="space-y-2 text-xs font-semibold text-slate-600 pl-2">
              <div class="flex items-start gap-2">
                <svg class="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <p class="leading-relaxed">${pkg.delivery_address || 'No Address'}</p>
              </div>
              
              <div class="flex items-start gap-2">
                <svg class="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                <div>
                  ${pkg.primary_phone ? `<div>${pkg.primary_phone}</div>` : ''}
                  ${pkg.secondary_phone ? `<div>${pkg.secondary_phone}</div>` : ''}
                  ${!pkg.primary_phone && !pkg.secondary_phone ? '<span class="italic text-slate-400">None</span>' : ''}
                </div>
              </div>
              
              ${pkg.sender_address ? `
              <div class="flex items-start gap-2 pt-2 mt-2 border-t border-slate-50">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">FROM:</span>
                <p class="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">${pkg.sender_address}</p>
              </div>
              ` : ''}
              
              ${pkg.note ? `
              <div class="bg-slate-50 p-2 rounded-lg mt-2 text-[10px] italic text-slate-500 border border-slate-100 flex gap-2">
                <svg class="w-3 h-3 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>${pkg.note}</span>
              </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Desktop & Print Table View (Hidden on Mobile) -->
      <div class="hidden md:block print:block overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-none">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 print:bg-transparent">
              <th class="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
              <th class="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client Details</th>
              <th class="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Address</th>
              <th class="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Phones</th>
              <th class="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status & Note</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${data.map((pkg, index) => `
              <tr class="hover:bg-slate-50 transition-colors group print:hover:bg-transparent">
                <td class="py-4 px-4 text-sm font-extrabold text-slate-400 w-12 align-top">${index + 1}</td>
                <td class="py-4 px-4 text-sm font-bold text-slate-800 align-top">
                  ${pkg.client_name}
                  ${pkg.sender_address ? `<div class="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">From: ${pkg.sender_address}</div>` : ''}
                </td>
                <td class="py-4 px-4 text-sm font-semibold text-slate-700 max-w-[200px] align-top">${pkg.delivery_address || 'No Address'}</td>
                <td class="py-4 px-4 text-sm font-bold text-slate-700 align-top">
                  ${pkg.primary_phone ? `<div>P: ${pkg.primary_phone}</div>` : ''}
                  ${pkg.secondary_phone ? `<div class="mt-1">S: ${pkg.secondary_phone}</div>` : ''}
                  ${!pkg.primary_phone && !pkg.secondary_phone ? '<span class="italic text-slate-400">None</span>' : ''}
                </td>
                <td class="py-4 px-4 align-top">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full ${pkg.status === 'Pending' ? 'bg-amber-50 text-amber-600' : pkg.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} print:px-0 print:bg-transparent">
                    ${pkg.status.toUpperCase()}
                  </span>
                  ${pkg.note ? `<p class="text-[10px] text-slate-500 font-medium italic mt-2 leading-tight bg-slate-50 p-2 rounded print:bg-transparent print:p-0">${pkg.note}</p>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
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
