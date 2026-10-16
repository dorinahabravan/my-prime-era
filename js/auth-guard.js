(async function () {
    document.documentElement.style.visibility = "hidden";
  
    try {
      const { data, error } =
        await window.supabaseClient.auth.getUser();
  
      if (error || !data?.user) {
        window.location.replace("./login.html");
        return;
      }
  
      document.documentElement.style.visibility = "visible";
  
    } catch (error) {
      console.error("Authentication error:", error);
      window.location.replace("./login.html");
    }
  })();