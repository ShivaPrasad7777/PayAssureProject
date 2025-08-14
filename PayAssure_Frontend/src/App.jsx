import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Login from "./components/Login";
import MainApp from "./components/MainApp";
import NoMatch from "./components/NoMatch";
import PayAssureLanding from "./components/WelcomePage";
import { ForgotPassword } from "./ForgotPassword";
import { ResetPassword } from "./ResetPassword";

// Color constants
const HEADER_BG = "#1565c0"; // Fixed blue header

const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: HEADER_BG },
      background: {
        default: mode === "light" ? "#f5f5f5" : "#121212",
        paper: mode === "light" ? "#ffffff" : "#1d1d1d",
      },
    },
  });

export default function App() {
  const [mode, setMode] = useState(() => localStorage.getItem("mode") || "light");
  const theme = useMemo(() => getTheme(mode), [mode]);

  useEffect(() => {
    localStorage.setItem("mode", mode);
  }, [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
       <Routes>
  <Route path="/" element={<PayAssureLanding />} />
  <Route path="/login" element={<Login setMode={setMode} mode={mode} />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route path="/reset-password" element={<ResetPassword />} />
  <Route path="/app/*" element={<MainApp setMode={setMode} mode={mode} />} />
  <Route path="*" element={<NoMatch />} />
</Routes>

      </BrowserRouter>
    </ThemeProvider>
  );
}


// // src/App.js (Updated with theme handling and routes)
// import React, { useMemo, useState } from "react";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
// import Login from "./components/Login";
// import MainApp from "./components/MainApp";
// import NoMatch from "./components/NoMatch";

// // Theme setup
// const getTheme = (mode) =>
//   createTheme({
//     palette: {
//       mode: mode,
//       ...(mode === "light"
//         ? { primary: { main: "#1565c0" } }
//         : { primary: { main: "#90caf9" } }),
//     },
//   });

// export default function App() {
//   const [mode, setMode] = useState("dark");
//   const theme = useMemo(() => getTheme(mode), [mode]);

//   return (
//     <ThemeProvider theme={theme}>
//       <CssBaseline />
//       <BrowserRouter>
//         <Routes>
//           <Route path="/" element={<Login setMode={setMode} mode={mode} />} />
//           <Route path="/app/*" element={<MainApp setMode={setMode} mode={mode} />} />
//           <Route path="*" element={<NoMatch />} />
//         </Routes>
//       </BrowserRouter>
//     </ThemeProvider>
//   );
// }
