// src/components/MainApp.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { createTheme, useTheme } from "@mui/material/styles";
import { AppProvider } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import AppTitle from "./utils/AppTitle";
import RoleConfig from "./utils/RoleConfig";

const API_ENDPOINT = "your-api-base-url"; // Set your base API url
const endpoints = {
  LoginMicroservice: "login",
};

const getApiEndpoint = (role) => {
  switch (role) {
    case "admin":
      return `${API_ENDPOINT}/${endpoints.LoginMicroservice}/Admin`;
    case "customer":
      return `${API_ENDPOINT}/${endpoints.LoginMicroservice}/Customer`;
    case "insurer":
      return `${API_ENDPOINT}/${endpoints.LoginMicroservice}/Insurer`;
    default:
      return "";
  }
};

export default function MainApp({ mode, setMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const userFromLogin = location.state;
  const [user, setUser] = useState(userFromLogin || null);
  const role = (user?.role || "customer").toLowerCase();
  const { navigation, routes } = RoleConfig[role] || { navigation: [], routes: {} };

  // --- Fixed pathname extraction for subroutes
  const getCleanedPathname = (pathname) => {
    // Remove '/app' or '/app/' prefix, leaving empty string or segment
    let sub = "";
    if (pathname.startsWith("/app")) {
      sub = pathname.slice(4); // Remove '/app'
    } else {
      sub = pathname;
    }
    // Remove leading slash if present
    if (sub.startsWith("/")) sub = sub.slice(1);
    return sub || "dashboard";
  };
  const [pathname, setPathname] = useState(() => getCleanedPathname(location.pathname));

  // --- Keep pathname in sync with location.pathname
  useEffect(() => {
    setPathname(getCleanedPathname(location.pathname));
  }, [location.pathname]);

  // --- Enrich user if just passed id, etc.
  useEffect(() => {
    const id = user?.id || userFromLogin?.id;
    if (role && id && !user?.name) {
      const endpoint = getApiEndpoint(role);
      if (endpoint) {
        axios
          .get(`${endpoint}/${id}`)
          .then((res) => {
            setUser({ ...res.data, role });
          })
          .catch((error) => {
            console.error("Error fetching user data:", error);
            setUser({ id, role });
          });
      }
    }
  }, [role, user?.id, userFromLogin]);

  // --- Navigation handler, uses correct segment logic
  const router = {
    pathname,
    searchParams: new URLSearchParams(),
    navigate: (path) => {
      const segment = path.replace(/^\/+/, ""); // remove all leading slashes
      setPathname(segment);
      navigate(`/app/${segment}`, { state: user });
    },
  };

  // --- Correct component to render for the current segment (dashboard by default)
  const ComponentToRender = routes[pathname] || (() => <div>Not Found</div>);

  const handleLogout = () => {
    navigate("/", { replace: true });
  };

  const mainTheme = createTheme({
    palette: {
      mode,
      background: {
        default: mode === "dark" ? "#121212" : "#f5f5f5",
        paper: mode === "dark" ? "#1d1d1d" : "#fff",
      },
      primary: {
        main: mode === "dark" ? "#90caf9" : "#1565c0",
      },
    },
  });

  const theme = useTheme();
  const headerGradient =
    mode === "dark"
      ? `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary?.dark || "#343b47"} 100%)`
      : `linear-gradient(90deg, ${theme.palette.primary.light} 0%, ${theme.palette.secondary?.light || "#e3f2fd"} 100%)`;

  return (
    <AppProvider navigation={navigation} router={router} theme={mainTheme}>
      <DashboardLayout
        slots={{
          appTitle: () => <AppTitle user={user} onLogout={handleLogout} mode={mode} setMode={setMode} />,
        }}
        sx={{
          '.MuiAppBar-root': {
            background: headerGradient,
          },
          "& .MuiStack-root > .MuiStack-root": {
            width: "100%",
          },
          "& .MuiToolbar-root": {
            background: "transparent !important",
            minHeight: 64,
          },
          "& .MuiToolbar-root .MuiIconButton-root": {
            background: "transparent !important",
            "&:hover": { bgcolor: "#23272f" },
            borderRadius: "50%",
            width: 40,
            height: 40,
          },
        }}
      >
        <ComponentToRender customerId={user?.id} pathname={pathname} user={user} />
      </DashboardLayout>
    </AppProvider>
  );
}








//basic
// src/components/MainApp.jsx (Updated to persist and pass customerId correctly)
// import React, { useEffect, useState } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import axios from "axios";
// import { createTheme, useTheme } from "@mui/material/styles";
// import { AppProvider } from "@toolpad/core/AppProvider";
// import { DashboardLayout } from "@toolpad/core/DashboardLayout";
// import AppTitle from "./utils/AppTitle";
// import RoleConfig from "./utils/RoleConfig";

// const API_ENDPOINT = "your-api-base-url"; // Set your base API url
// const endpoints = {
//   LoginMicroservice: "login",
// };

// const getApiEndpoint = (role) => {
//   switch (role) {
//     case "admin":
//       return `${API_ENDPOINT}/${endpoints.LoginMicroservice}/Admin`;
//     case "customer":
//       return `${API_ENDPOINT}/${endpoints.LoginMicroservice}/Customer`;
//     case "insurer":
//       return `${API_ENDPOINT}/${endpoints.LoginMicroservice}/Insurer`;
//     default:
//       return "";
//   }
// };

// export default function MainApp({ mode, setMode }) {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const userFromLogin = location.state;
//   const [user, setUser] = useState(userFromLogin || null);
//   const role = (user?.role || "customer").toLowerCase();
//   const { navigation, routes } = RoleConfig[role] || { navigation: [], routes: {} };
//   const [pathname, setPathname] = useState(location.pathname.replace("/app/", "") || "dashboard");

//   // Fetch additional user data if needed
//   useEffect(() => {
//     const id = user?.id || userFromLogin?.id;
//     if (role && id && !user?.name) {
//       const endpoint = getApiEndpoint(role);
//       if (endpoint) {
//         axios
//           .get(`${endpoint}/${id}`)
//           .then((res) => {
//             setUser({ ...res.data, role });
//           })
//           .catch((error) => {
//             console.error("Error fetching user data:", error);
//             setUser({ id, role });
//           });
//       }
//     }
//   }, [role, user?.id, userFromLogin]);

//   const router = {
//     pathname,
//     searchParams: new URLSearchParams(),
//     navigate: (path) => {
//       const segment = path.replace("/", "");
//       setPathname(segment);
//       navigate(`/app/${segment}`, { state: user });
//     },
//   };

//   const ComponentToRender = routes[pathname] || (() => <div>Not Found</div>);

//   const handleLogout = () => {
//     navigate("/", { replace: true });
//   };

//   const mainTheme = createTheme({
//     palette: {
//       mode: mode,
//       background: {
//         default: mode === "dark" ? "#121212" : "#f5f5f5",
//         paper: mode === "dark" ? "#1d1d1d" : "#fff",
//       },
//       primary: {
//         main: mode === "dark" ? "#90caf9" : "#1565c0",
//       },
//     },
//   });

//   const theme = useTheme();
//   const headerGradient =
//     mode === "dark"
//       ? `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`
//       : `linear-gradient(90deg, ${theme.palette.primary.light} 0%, ${theme.palette.secondary.light} 100%)`;

//   return (
//     <AppProvider navigation={navigation} router={router} theme={mainTheme}>
//       <DashboardLayout
//         slots={{
//           appTitle: () => <AppTitle user={user} onLogout={handleLogout} mode={mode} setMode={setMode} />,
//         }}
//         sx={{
//             '.MuiAppBar-root': {
//                 background:headerGradient,
//             },
//           "& .MuiStack-root > .MuiStack-root": {
//             width: "100%",
//           },
//           "& .MuiToolbar-root": {
//             // bgcolor: "#1d1d1d",  // header bg
//              background: "transparent !important", 
//             minHeight: 64,
//           },
//           "& .MuiToolbar-root .MuiIconButton-root": { // only in top toolbar
//             // bgcolor: "#1d1d1d",   // hamburger button bg
//              background: "transparent !important",    
//             "&:hover": { bgcolor: "#23272f" },
//             borderRadius: "50%",
//             width: 40,
//             height: 40,
//           },
//         }}
//       >
//         <ComponentToRender customerId={user?.id} pathname={pathname} user={user} /> 
//       </DashboardLayout>
//     </AppProvider>
//   );
// }
