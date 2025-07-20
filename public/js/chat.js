const socket = io();

const form = document.getElementById("chat-form");
const input = document.getElementById("m");
const messages = document.getElementById("messages");
const username = document.body.dataset.username?.trim() || '';

// Skip chat setup if username is not present
if (!username) {
  console.warn("Username is not set — chat won't initialize.");
} else {
  // Define color classes
  const colorClasses = [
    'color-red', 'color-orange', 'color-yellow',
    'color-green', 'color-blue', 'color-purple', 'color-pink'
  ];

  const userColors = {};

  function getUsernameColor(user) {
    if (!userColors[user]) {
      const randomColor = colorClasses[Math.floor(Math.random() * colorClasses.length)];
      userColors[user] = randomColor;
    }
    return userColors[user];
  }

  function renderMessage(username, text) {
  const item = document.createElement("li");

  const nameSpan = document.createElement("span");
  nameSpan.textContent = `${username}: `;
  nameSpan.classList.add(getUsernameColor(username));
  nameSpan.style.fontWeight = "bold";
  nameSpan.style.cursor = "pointer";

  const messageSpan = document.createElement("span");
  messageSpan.textContent = text;

  item.appendChild(nameSpan);
  item.appendChild(messageSpan);
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;

  // Click-to-show popup menu
  nameSpan.addEventListener("click", (event) => {
    event.stopPropagation();
    showUserMenu(event.clientX, event.clientY, username);
  });
}
// Remove existing menu if open
function removeUserMenu() {
  const existingMenu = document.querySelector(".user-popup-menu");
  if (existingMenu) existingMenu.remove();
}

// Show popup menu
function showUserMenu(x, y, username) {
  removeUserMenu();

  const menu = document.createElement("div");
  menu.className = "user-popup-menu";
  menu.innerHTML = `
    <div class="popup-header">${username}</div>
    <button class="popup-option">🚩 Report</button>
    <button class="popup-option">🟠 Send Orange Points</button>
    <button class="popup-option">🔇 Mute</button>
  `;

  menu.style.top = `${y}px`;
  menu.style.left = `${x}px`;

  document.body.appendChild(menu);
}

// Remove menu when clicking elsewhere
document.addEventListener("click", () => removeUserMenu());


  // Load previous messages
  socket.on("chat history", (history) => {
    history.forEach((data) => {
      renderMessage(data.username, data.msg);
    });
  });

  // Submit new message
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const msg = input.value.trim();
    if (msg) {
      socket.emit("chat message", { username, msg });
      input.value = "";
    }
  });

  // Listen for new messages
  socket.on("chat message", function (data) {
    renderMessage(data.username, data.msg);
  });
}
