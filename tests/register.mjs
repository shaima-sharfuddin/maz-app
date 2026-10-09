// Loaded with `node --import ./tests/register.mjs --test …` (npm test): installs the module hooks.
import { register } from "node:module";

register("./loader-hooks.mjs", import.meta.url);
