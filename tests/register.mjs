// Loaded with `node --import ./tests/register.mjs --test …` (npm test): installs the module hooks that let Node load
// the app's extensionless ES-module imports.
import { register } from "node:module";

register("./loader-hooks.mjs", import.meta.url);
