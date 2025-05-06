document.addEventListener("DOMContentLoaded", () => {
  const menuContainer = document.querySelector(".menu");

  fetch("/partials/menu.html")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.text();
    })
    .then((menuHtml) => {
      menuContainer.innerHTML = menuHtml;
    })
    .catch((error) => {
      console.error("Error loading menu:", error);
    });
});
