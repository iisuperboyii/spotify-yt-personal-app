import { Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Settings from "./pages/Settings";
import PlaylistView from "./pages/PlaylistView";
import NowPlaying from "./pages/NowPlaying";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/library" element={<Library />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/playlist/:id" element={<PlaylistView />} />
        <Route path="/now-playing" element={<NowPlaying />} />
      </Route>
    </Routes>
  );
}

export default App;
