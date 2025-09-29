// .pnpmfile.cjs
module.exports = {
  hooks: {
    readPackage(pkg) {
      // This hook is called for every package being installed.
      
      // Force all workspaces to use the same top-level React and React-DOM.
      // This is a more powerful alternative to `overrides` for our specific problem.
      if (pkg.dependencies && pkg.dependencies['react']) {
        pkg.dependencies['react'] = '18.3.1';
      }
      if (pkg.dependencies && pkg.dependencies['react-dom']) {
        pkg.dependencies['react-dom'] = '18.3.1';
      }
      
      return pkg;
    },
  },
};