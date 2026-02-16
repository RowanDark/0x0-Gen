const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing root app element.');
}

app.innerHTML = '<main style="font-family: Arial, sans-serif; margin: 2rem;"><h1>intruder-ui</h1><p>Runtime skeleton initialized.</p></main>';
