document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("tbody");

  // Fetch all roles
  let allRoles = [];
  fetch("http://localhost:3001/api/roles")
    .then((response) => response.json())
    .then((roles) => {
      allRoles = roles;
    })
    .catch((error) => {
      console.error("Error fetching roles:", error);
    });

  // Fetch users and their roles
  fetch("http://localhost:3001/api/users")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((results) => {
      if (results.length === 0) {
        console.log("No data found");
        return;
      }

      results.forEach((row) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
                <td>${row.id_user}</td>
                <td>${row.user_name}</td>
                <td>${row.document_number_person}</td>
                <td>${row.email_user}</td>
                <td>${row.full_name}</td>
                <td>${row.user_status}</td>
                <td>
                    ${allRoles
                      .map(
                        (role, index) => `
                      <input type="checkbox" id="role${
                        row.id_user
                      }_${index}" name="role${row.id_user}" value="${
                          role.id_role
                        }" ${
                          row.roles.includes(role.name_role_user)
                            ? "checked"
                            : ""
                        }>
                      <label for="role${row.id_user}_${index}">${
                          role.name_role_user
                        }</label><br>
                    `
                      )
                      .join("")}
                   
                </td>
                <td> <button onclick="saveRoles(${
                  row.id_userx
                })">Guardar </button>
                </td>
            `;

        tableBody.appendChild(tr);
      });
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });

  document.getElementsByTagName("button")[0].addEventListener("click", () => {
    document.cookie = "jwt=; path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    saveAllRoles();
    document.location.href = "/";
  });
});

function saveRoles(userId) {
  const checkboxes = document.querySelectorAll(
    `input[name="role${userId}"]:checked`
  );
  const roles = Array.from(checkboxes).map((checkbox) => checkbox.value);

  fetch(`http://localhost:3001/api/users/${userId}/roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ roles }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      console.log("Roles updated successfully:", data);
    })
    .catch((error) => {
      console.error("Error updating roles:", error);
    });
}
function saveAllRoles() {
  const rows = document.querySelectorAll("tbody tr");
  rows.forEach((row) => {
    const userId = row.querySelector("td").textContent;
    saveRoles(userId);
  });
}
function navigateToRolePage(role) {
  fetch("/api/checkRole", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.hasRole) {
        document.location.href = `/${role.toLowerCase()}`;
      } else {
        document.location.href = "/accessDenied";
      }
    })
    .catch((error) => {
      console.error("Error checking role:", error);
    });
}
