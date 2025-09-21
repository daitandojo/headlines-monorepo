module.exports = {
  hooks: {
    readPackage (pkg) {
      // Allowlist for packages that need to run native build scripts.
      const NATIVE_BUILD_ALLOWLIST = ['sharp', 'bcrypt'];

      if (NATIVE_BUILD_ALLOWLIST.includes(pkg.name)) {
        pkg.pnpm = pkg.pnpm || {};
        // This setting tells pnpm to never ignore the build scripts for this specific package.
        pkg.pnpm.neverBuilt = false;
      }
      return pkg;
    }
  }
}
