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

  // Supabase requires an email, so we fake one based on username
  const email = `${username}@swiftparcel.local`;

  try {
    // Attempt sign in first
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // If the error indicates invalid credentials, we can check if it's because the user doesn't exist
      // Invalid login credentials usually means wrong password or user not found.
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        // Attempt to sign up instead
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password
        });
        
        if (signUpError) {
          throw signUpError;
        } else {
          // Sign up successful, redirect
          window.location.href = '/';
          return;
        }
      } else {
        throw error;
      }
    }

    // Sign in successful
    window.location.href = '/';
    
  } catch (err) {
    console.error("Auth Error:", err);
    showError(err.message || "Authentication failed. Please try again.");
    setLoading(false);
  }
});
