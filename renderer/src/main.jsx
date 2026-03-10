import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { MusicProvider } from "./context/MusicContext";
import { UIProvider } from "./context/UIContext";
import App from "./App";
import "./index.css";
import "./global-focus-fix.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <HashRouter>
    <UIProvider>
      <MusicProvider>
        <App />
      </MusicProvider>
    </UIProvider>
  </HashRouter>
);
