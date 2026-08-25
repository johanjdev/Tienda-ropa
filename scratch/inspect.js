const { createClient } = require("@supabase/supabase-js");

const url = "https://ctekvswsmwqfkyyeppda.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0ZWt2c3dzbXdxZmt5eWVwcGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTgzOTEsImV4cCI6MjA4ODA3NDM5MX0.68GcEnp4TDH5xCtwVlmESJ8Xlmn8GinZMP4I0Ey1O9g";

const supabase = createClient(url, anonKey);

async function inspect() {
  console.log("Fetching one row from usuarios...");
  const { data: user, error: userErr } = await supabase.from("usuarios").select("*").limit(1);
  if (userErr) {
    console.error("Error fetching usuarios:", userErr);
  } else {
    console.log("Usuario columns:", user.length > 0 ? Object.keys(user[0]) : "No users found", user[0]);
  }

  console.log("Fetching one row from productos...");
  const { data: prod, error: prodErr } = await supabase.from("productos").select("*").limit(1);
  if (prodErr) {
    console.error("Error fetching productos:", prodErr);
  } else {
    console.log("Producto columns:", prod.length > 0 ? Object.keys(prod[0]) : "No products found", prod[0]);
  }

  console.log("Fetching one row from pedidos...");
  const { data: ped, error: pedErr } = await supabase.from("pedidos").select("*").limit(1);
  if (pedErr) {
    console.error("Error fetching pedidos:", pedErr);
  } else {
    console.log("Pedido columns:", ped.length > 0 ? Object.keys(ped[0]) : "No orders found", ped[0]);
  }
}

inspect();
