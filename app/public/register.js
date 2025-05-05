const errorMessage = document.getElementsByClassName("error")[0];
const config = {
  API_URL: "http://localhost:3000"
};

document.getElementById("register-form").addEventListener("submit",async(e)=>{
  e.preventDefault();

  const res = await fetch("http://localhost:3000/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      first_name_person: e.target.children.first_name_person.value,
      last_name_person: e.target.children.last_name_person.value,
      document_number_person: e.target.children.document_number_person.value,
      user_name: e.target.children.user_name.value,
      email_user: e.target.children.email_user.value,
      password: e.target.children.password.value
    })
  });
  if (!res.ok) return errorMessage.classList.toggle("hidden", false);
  const resJson = await res.json();
  if (resJson.redirect) {
    window.location.href = resJson.redirect;
  }
})