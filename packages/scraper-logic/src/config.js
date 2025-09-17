// packages/scraper-logic/src/config.js (version 1.0.0)
// This module holds the shared configuration for the scraper logic,
// which will be injected by the consuming application (pipeline or admin).

let _config = {
  // A simple console logger as a fallback.
  logger: console,
  paths: {
    debugHtmlDir: null,
  },
  configStore: null,
  utilityFunctions: null,
};

export function configure(appConfig) {
  // Merge the provided app config with the existing config.
  _config = { ..._config, ...appConfig };
}

export function getConfig() {
  return _config;
}
