import { supabase } from './supabase.js';

const registerForm = document.getElementById('registerForm');
const usernameInput = document.getElementById('username');
const contactInfoInput = document.getElementById('contactInfo');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');

// Check if already logged in
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = '/';
  }
}
checkSession();

function showError(msg) {
  errorText.textContent = msg;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

function setLoading(isLoading) {
  if (isLoading) {
    btnText.textContent = 'Registering...';
    btnSpinner.classList.remove('hidden');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
  } else {
    btnText.textContent = 'Sign Up';
    btnSpinner.classList.add('hidden');
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
  }
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  setLoading(true);

  const username = usernameInput.value.trim();
  const contactInfo = contactInfoInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password || !contactInfo) {
    showError("Please fill out all fields.");
    setLoading(false);
    return;
  }

  // Validate contact info (10 digit number OR valid email)
  const is10Digit = /^\d{10}$/.test(contactInfo);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo);
  
  if (!is10Digit && !isEmail) {
    showError("Please enter a valid 10-digit mobile number or a valid email address.");
    setLoading(false);
    return;
  }

  // Fake email for Supabase to strictly use username
  const email = `${username.toLowerCase()}@swiftparcel.com`;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          real_contact: contactInfo
        }
      }
    });

    if (error) {
      if (error.message.toLowerCase().includes("user already registered")) {
        throw new Error("Username is already taken.");
      }
      throw error;
    }

    // Sign up successful, redirect to dashboard
    window.location.href = '/';
    
  } catch (err) {
    console.error("Auth Error:", err);
    showError(err.message || "Registration failed. Please try again.");
    setLoading(false);
  }
});
