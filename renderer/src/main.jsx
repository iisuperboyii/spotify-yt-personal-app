import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MusicProvider } from "./context/MusicContext";
import { UIProvider } from "./context/UIContext";
import App from "./App";
import "./index.css";
import "./global-focus-fix.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <UIProvider>
      <MusicProvider>
        <App />
      </MusicProvider>
    </UIProvider>
  </BrowserRouter>
);
