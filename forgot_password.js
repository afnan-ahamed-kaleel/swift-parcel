import { supabase } from './supabase.js';

const resetForm = document.getElementById('resetForm');
const usernameInput = document.getElementById('username');
const contactInfoInput = document.getElementById('contactInfo');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const successMessage = document.getElementById('successMessage');

function showError(msg) {
  errorText.textContent = msg;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

function setLoading(isLoading) {
  if (isLoading) {
    btnText.textContent = 'Verifying...';
    btnSpinner.classList.remove('hidden');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
  } else {
    btnText.textContent = 'Reset Password';
    btnSpinner.classList.add('hidden');
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
  }
}

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  setLoading(true);

  const username = usernameInput.value.trim();
  const contactInfo = contactInfoInput.value.trim();
  const newPassword = passwordInput.value;

  if (!username || !contactInfo || !newPassword) {
    showError("Please fill out all fields.");
    setLoading(false);
    return;
  }

  try {
    // We use a custom Supabase RPC function (Postgres function) to verify and reset
    // because standard auth doesn't allow changing password without being logged in.
    const { data, error } = await supabase.rpc('reset_user_password', {
      p_username: username,
      p_contact: contactInfo,
      p_new_password: newPassword
    });

    if (error) throw error;

    if (data === true) {
      // Success!
      resetForm.classList.add('hidden');
      successMessage.classList.remove('hidden');
      successMessage.classList.add('flex');
    } else {
      // Incorrect details
      showError("Invalid username or contact information. Verification failed.");
    }
    
  } catch (err) {
    console.error("Reset Error:", err);
    showError(err.message || "An error occurred during password reset.");
  } finally {
    setLoading(false);
  }
});
