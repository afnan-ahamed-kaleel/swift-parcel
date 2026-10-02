import { supabase } from './supabase.js';

const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
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
    btnText.textContent = 'Authenticating...';
    btnSpinner.classList.remove('hidden');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
  } else {
    btnText.textContent = 'Secure Login';
    btnSpinner.classList.add('hidden');
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  setLoading(true);

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showError("Please enter both username and password.");
    setLoading(false);
    return;
  }

  // Faking an email so Supabase auth works seamlessly with just a username
  const email = `${username.toLowerCase()}@swiftparcel.com`;

  try {
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    // Sign in successful
    window.location.href = '/';
    
  } catch (err) {
    console.error("Auth Error:", err);
    showError(err.message || "Invalid username or password");
    setLoading(false);
  }
});
