import "../styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = `
    <main class="shell">
      <p class="eyebrow">Milestone 0</p>
      <h1>The Last Lesson</h1>
      <p>Deterministic simulation kernel scaffolded. Rendering begins after the simulation proves itself.</p>
    </main>
  `;
}

