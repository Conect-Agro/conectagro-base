const errorMessage = document.getElementsByClassName("error")[0];

// Detectar si es registro de productor
const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get('role');
const isProducer = role === 'productor';

// Función para cargar tipos de producción desde la API
async function loadProductionTypes() {
  try {
    const response = await fetch('/api/production-types');
    if (!response.ok) {
      throw new Error('Error al cargar tipos de producción');
    }
    
    const productionTypes = await response.json();
    const select = document.getElementById('production_type_id');
    
    // Limpiar opciones existentes excepto la primera
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    // Agregar opciones dinámicamente
    productionTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type.id;
      option.textContent = `${type.category} - ${type.name}`;
      option.title = type.description || ''; // Agregar descripción como tooltip
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando tipos de producción:', error);
    errorMessage.textContent = 'Error al cargar los tipos de producción. Por favor, recarga la página.';
    errorMessage.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Asegurar que los campos de productor estén ocultos por defecto
  const producerFields = document.getElementById('producer-fields');
  
  // Mostrar campos de productor solo si corresponde
  if (isProducer) {
    producerFields.classList.remove('hidden');
    document.querySelector('h1').textContent = 'Registrarse como Productor';
    
    // Hacer campos obligatorios
    document.getElementById('farm_name').required = true;
    document.getElementById('location').required = true;
    document.getElementById('contact_phone').required = true;
    
    // Cargar tipos de producción desde la API
    loadProductionTypes();
  } else {
    // Asegurar que estén ocultos para clientes
    producerFields.classList.add('hidden');
  }

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
      role: isProducer ? 'productor' : 'cliente'
    };

    // Agregar datos de productor si aplica
    if (isProducer) {
      data.producer_data = {
        farm_name: document.getElementById('farm_name').value,
        nit: document.getElementById('nit').value || null,
        location: document.getElementById('location').value,
        farm_size: document.getElementById('farm_size').value || null,
        production_type_id: document.getElementById('production_type_id').value || null,
        contact_phone: document.getElementById('contact_phone').value,
        contact_email: document.getElementById('contact_email').value || e.target.email_user.value
      };
    }

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
        alert(resJson.message);
        window.location.href = resJson.redirect;
      }
    } catch (err) {
      console.error("Error de conexión:", err);
      errorMessage.textContent = "No se pudo conectar con el servidor.";
      errorMessage.classList.remove("hidden");
    }
  });
});
