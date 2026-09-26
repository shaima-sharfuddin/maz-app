// Error shape every API function rejects with — mock or real. Screens only read `message`
// (user-facing) and optionally `code` (e.g. to special-case INVALID_CREDENTIALS).
export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}
