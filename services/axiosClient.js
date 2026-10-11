import axios from "axios";
import { API_BASE_URL } from "./httpClient";

// A configured axios instance for the MAZ backend. NOT USED YET — services/httpClient.js (fetch) is the app's only
// transport and owns the auth hooks (Bearer token, 401 → sign out) and the fixed error codes. Kept for future
// endpoints: anything built on it must map failures to ApiError (services/errorMessages.js) like httpClient does, and
// any write must respect tests/write-safety.test.mjs.
// eslint-disable-next-line import/no-named-as-default-member -- axios.create is the documented API
export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { Accept: "application/json" },
});
