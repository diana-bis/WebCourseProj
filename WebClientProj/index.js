async function loadConfig() {
    try {
        const response = await fetch("config.json");
        const config = await response.json();

        const content = document.getElementById("content");

        content.innerHTML = `
      <h2>Student name:</h2>
      <p>${config.student.name}</p>

      <h2>Student ID:</h2>
      <p>${config.student.id}</p>

      <h2>Links:</h2>
      <ul>
        ${config.links
                .map(link => `<li><a href="${link.url}">${link.text}</a></li>`)
                .join("")}
      </ul>
    `;
    } catch (err) {
        console.error("Failed to load config.json", err);
    }
}

loadConfig();
