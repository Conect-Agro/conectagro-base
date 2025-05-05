document.getElementsByTagName("button")[0].addEventListener("click", () => {
  document.cookie = "jwt=; path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  document.location.href = "/";
});

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
