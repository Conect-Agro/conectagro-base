const errorMessage = document.getElementsByClassName("error")[0];

document.addEventListener("DOMContentLoaded", () => {
  const firstName = document.getElementById("first_name_person");
  const lastName = document.getElementById("last_name_person");
  const documentNumber = document.getElementById("document_number_person");
  const email = document.getElementById("email_user");
  const password = document.getElementById("password");
  const form = document.getElementById("register-form");

  const onlyLetters = (e) => {
    e.target.value = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, "");
  };

  const onlyNumbers = (e) => {
    e.target.value = e.target.value.replace(/\D/g, "");
  };

  const showError = (input, message) => {
    clearError(input);
    input.classList.add("input-error");

    const error = document.createElement("p");
    error.textContent = message;
    error.classList.add("input-error-message");
    input.insertAdjacentElement("afterend", error);
  };

  const clearError = (input) => {
    input.classList.remove("input-error");
    const next = input.nextElementSibling;
    if (next && next.classList.contains("input-error-message")) {
      next.remove();
    }
  };

  const validateEmail = () => {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value.trim()) {
      showError(email, "El correo es obligatorio");
      return false;
    } else if (!validEmail.test(email.value)) {
      showError(email, "Por favor ingresa un correo válido");
      return false;
    } else {
      clearError(email);
      return true;
    }
  };

  const validatePassword = () => {
    if (!password.value.trim()) {
      showError(password, "La contraseña es obligatoria");
      return false;
    } else if (password.value.length < 8) {
      showError(password, "Debe tener mínimo 8 caracteres");
      return false;
    } else {
      clearError(password);
      return true;
    }
  };

  firstName.addEventListener("input", onlyLetters);
  lastName.addEventListener("input", onlyLetters);
  documentNumber.addEventListener("input", onlyNumbers);

  email.addEventListener("blur", validateEmail);
  password.addEventListener("blur", validatePassword);

  email.addEventListener("input", () => {
    const next = email.nextElementSibling;
    if (next && next.classList.contains("input-error-message")) validateEmail();
  });

  password.addEventListener("input", () => {
    const next = password.nextElementSibling;
    if (next && next.classList.contains("input-error-message")) validatePassword();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (!isEmailValid || !isPasswordValid) return;

    const data = {
      first_name_person: e.target.first_name_person.value,
      last_name_person: e.target.last_name_person.value,
      document_number_person: e.target.document_number_person.value,
      user_name: e.target.user_name.value,
      email_user: e.target.email_user.value,
      password: e.target.password.value,
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resJson = await res.json();

      if (!res.ok) {
        errorMessage.textContent =
          resJson.message || "Error al registrar el usuario.";
        errorMessage.classList.remove("hidden");
        return;
      }

      if (resJson.redirect) {
        window.location.href = resJson.redirect;
      }
    } catch (err) {
      console.error("Error de conexión:", err);
      errorMessage.textContent = "No se pudo conectar con el servidor.";
      errorMessage.classList.remove("hidden");
    }
  });
});
