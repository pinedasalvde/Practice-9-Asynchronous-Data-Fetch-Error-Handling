const usersList = document.querySelector("#users");
const statusMessage = document.querySelector("#status");
const loadButton = document.querySelector("#load-users");

async function loadUsers() {
  loadButton.disabled = true;
  statusMessage.textContent = "Loading users...";
  usersList.replaceChildren();

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const users = await response.json();
    if (
      !Array.isArray(users) ||
      users.length === 0 ||
      !users.every(
        (user) =>
          user !== null &&
          typeof user === "object" &&
          typeof user.name === "string" &&
          user.name.trim() !== "" &&
          typeof user.email === "string" &&
          user.email.trim() !== ""
      )
    ) {
      throw new Error("The API returned invalid user data");
    }

    const items = users.map((user) => {
      const item = document.createElement("li");
      const name = document.createElement("strong");
      const email = document.createElement("span");
      name.textContent = user.name;
      email.textContent = user.email;
      item.append(name, email);
      return item;
    });

    usersList.replaceChildren(...items);
    statusMessage.textContent = `Showing ${users.length} users.`;
  } catch (error) {
    console.error("Could not load users:", error);
    statusMessage.textContent = "Sorry, we couldn't load users. Please try again.";
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadUsers);
loadUsers();
