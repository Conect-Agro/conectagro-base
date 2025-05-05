const errorMessage = document.getElementsByClassName("error")[0];

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = e.target.children.user.value;
  const password = e.target.children.password.value;
  
  try {
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: user,
        password: password
      }),
    });
    
    // Captura y muestra el error detallado
    if (!res.ok) {
      const errorData = await res.text();
      console.error("Error detallado:", errorData);
      errorMessage.classList.toggle("hidden", false);
      return;
    }
    
    const resJson = await res.json();
    if (resJson.redirect) {
      window.location.href = resJson.redirect;
    }
  } catch (error) {
    console.error("Error en la petición:", error);
    errorMessage.classList.toggle("hidden", false);
  }
});