
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const message = document.getElementById("message");
    const button = document.getElementById("loginBtn");
  
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
  
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
  
      button.disabled = true;
      message.textContent = "Signing in...";
  
      try {
        const { data, error } =
          await window.supabaseClient.auth.signInWithPassword({
            email,
            password
          });
  
        if (error) {
          message.textContent = error.message;
          return;
        }
  
        if (data.user) {
          window.location.replace("./index.html");
        }
  
      } catch (error) {
        message.textContent = "Unable to sign in. Please try again.";
        console.error(error);
  
      } finally {
        button.disabled = false;
      }
    });
  });
  