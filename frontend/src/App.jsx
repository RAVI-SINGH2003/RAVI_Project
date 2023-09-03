import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import HtmlEditor from "./pages/HtmlEditor";
import React from "react";
import ImageEditor from "./pages/ImageEditor";

const App = () => {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/htmleditor/:enc" element={<HtmlEditor />} />
          <Route
            path="/htmleditor/imageeditor/:enc"
            element={<ImageEditor />}
          />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
