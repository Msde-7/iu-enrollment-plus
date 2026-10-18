(async () => {
  const { start } = await import(chrome.runtime.getURL("content/main.js"));
  await start();
})();
