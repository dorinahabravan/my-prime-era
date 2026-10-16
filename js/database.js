
window.PrimeDatabase = {
    async load() {
      const { data: authData, error: authError } =
        await window.supabaseClient.auth.getUser();
  
      if (authError || !authData?.user) {
        throw new Error("User not authenticated");
      }
  
      const { data, error } = await window.supabaseClient
        .from("user_progress")
        .select("data")
        .eq("user_id", authData.user.id)
        .maybeSingle();
  
      if (error) throw error;
  
      return data?.data ?? null;
    },
  
    async save(progress) {
      const { data: authData, error: authError } =
        await window.supabaseClient.auth.getUser();
  
      if (authError || !authData?.user) {
        throw new Error("User not authenticated");
      }
  
      const { error } = await window.supabaseClient
        .from("user_progress")
        .upsert({
          user_id: authData.user.id,
          data: progress,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "user_id"
        });
  
      if (error) throw error;
    }
  };
  

  window.testDatabase = async function () {
    try {
      const progress = await window.PrimeDatabase.load();
      alert(
        progress === null
          ? "Supabase connected! No saved progress yet."
          : "Supabase connected! Progress found."
      );
    } catch (error) {
      console.error("Database error:", error);
      alert("Database error: " + error.message);
    }
  };