import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/home/home";
import Results from "../pages/results/result";
import Favorites from "../pages/favorites/favorites";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/favorites" element={<Favorites />} />
        
        {/* Future routes */}
        {/* <Route path="/place/:id" element={<PlaceDetail />} /> */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;