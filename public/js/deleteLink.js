const deleteButton = document.getElementById("deleteButton");

async function deleteLink(id) {
  try {
    const response = await fetch("/delete-link", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: id }), // Remplacez par l'ID de l'élément à supprimer
    });

    if (response.ok) {
      window.location.reload();
    } else {
      console.error("Erreur lors de la suppression");
    }
  } catch (error) {
    console.error("Erreur réseau :", error);
  }
}

// Écouteur d'événement pour le clic sur le bouton
deleteButton.addEventListener("click", async (event) => {
  const id = event.target.getAttribute("data-id");

  const confirmation = confirm("Voulez-vous supprimer ce lien?");

  if (confirmation) {
    deleteLink(id);
  }
});
