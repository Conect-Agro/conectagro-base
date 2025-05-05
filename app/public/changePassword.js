const errorMessage = document.getElementsByClassName("error")[0];

document.getElementById("changePassword-form").addEventListener("submit",async(e)=>{
  e.preventDefault();
  const email = e.target.children.email.value;
  const password = e.target.children.password.value;
  const res = await fetch("http://localhost:3000/api/changePassword",{
    method:"POST",
    headers:{
      "Content-Type" : "application/json"
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

const errorMessage = document.querySelector(".error");
const successMessage = document.querySelector(".success");

errorMessage.classList.add("hidden");
errorMessage.style.display = "none";
successMessage.classList.add("hidden");
successMessage.style.display = "none";

if (!res.ok) {
  errorMessage.classList.remove("hidden"); 
  errorMessage.style.display = "block"; 
  return;
}

errorMessage.classList.add("hidden");
errorMessage.style.display = "none";

const resJson = await res.json();
successMessage.classList.remove("hidden"); 
successMessage.style.display = "block";

if (resJson.redirect) {
  setTimeout(() => {
    window.location.href = resJson.redirect;
  }, 2000); 
}

})