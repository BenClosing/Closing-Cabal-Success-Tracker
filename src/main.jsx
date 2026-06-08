import { createRoot } from "react-dom/client";
import { AuthGate } from "./auth.jsx";
import App from "./App.jsx";

// AuthGate passes { me, updateMe, signOut } to App once a member is logged in.
createRoot(document.getElementById("root")).render(
  <AuthGate>{(auth) => <App {...auth} />}</AuthGate>
);
