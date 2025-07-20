function loadPage(page) {
  const content = {
    home: `<h2>Home</h2><p>Welcome to the Home page.</p>`,
    tournaments: `<h2>Tournaments</h2><p>Join our latest gaming events!</p>`,
    store: `<h2>Store</h2><p>Buy your favorite in-game items.</p>`,
    about: `<h2>About</h2><p>Learn more about our platform.</p>`
  };

  document.getElementById("page-content").innerHTML = content[page] || "<p>Page not found.</p>";
}
