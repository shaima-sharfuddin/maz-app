// Node module hooks for the tests: the app's own files are ES modules with extensionless relative imports
// ("./http/apiClient"), which Metro resolves but Node doesn't. These hooks add ".js" and load app files as ES modules.
// Test tooling only — never bundled into the app.
const isRelative = (specifier) => specifier.startsWith("./") || specifier.startsWith("../");

export async function resolve(specifier, context, nextResolve) {
  if (isRelative(specifier) && !/\.[cm]?js$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.js`, context);
    } catch {
      // fall through to the default resolution (and its error)
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && url.endsWith(".js") && !url.includes("/node_modules/")) {
    return nextLoad(url, { ...context, format: "module" });
  }
  return nextLoad(url, context);
}
