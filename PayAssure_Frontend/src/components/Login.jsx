import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  CssBaseline,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import { styled } from "@mui/system";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useNavigate } from "react-router-dom";  // Import useNavigate here
import axios from "axios";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    secondary: { main: "#dc004e" },
    background: { default: "#f5f5f5", paper: "#ffffff" },
  },
  typography: { fontFamily: "Inter, sans-serif" },
  shape: { borderRadius: 12 },
});

const RootContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  width: "100vw",
  backgroundImage: `
    linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)),
    url('/image.png')
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  padding: theme.spacing(3),
  boxSizing: "border-box",
}));

const LoginPanel = styled(Paper)(({ theme }) => ({
  width: "100%",
  maxWidth: 480,
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  color: theme.palette.grey[900],
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  textAlign: "center",
}));

export default function Login() {
  const navigate = useNavigate(); // Initialize navigate

  // Modes: "login" | "forgot" | "reset"
  const [mode, setMode] = useState("login");

  // --- Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // --- Forgot password & Reset password state
  const [email, setEmail] = useState(""); // Used both for forgot & reset
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // --- UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // --- Handlers ---

  // LOGIN
  const handleLogin = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await axios.post("http://localhost:9999/api/login", {
        email: loginEmail,
        password: loginPassword,
      });
      // Clear fields and navigate to dashboard /app with response data
      setLoginEmail("");
      setLoginPassword("");
      // Navigate to dashboard or app route here:
      navigate("/app", { state: res.data });  // <-- This does the navigation

      // Optionally set success message if you still want it before navigation
      // setSuccessMsg("Login successful!");
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid email or password. Please try again."
      );
    }
    setLoading(false);
  };

  // SEND OTP (Forgot Password)
  const handleSendOtp = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await axios.post("http://localhost:9999/api/login/forgot-password", {
        email,
      });
      setSuccessMsg(res.data || "OTP sent to your email.");
      setMode("reset"); // Switch to reset mode to enter OTP and new password
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    }
    setLoading(false);
  };

  // RESET PASSWORD
  const handleResetPassword = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await axios.post("http://localhost:9999/api/login/reset-password", {
        email,
        otp,
        newPassword,
      });
      setSuccessMsg(res.data || "Password reset successful! Please login.");
      setEmail("");
      setOtp("");
      setNewPassword("");
      setMode("login");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to reset password. Please try again."
      );
    }
    setLoading(false);
  };

  // Toggle password visibility on login form
  const toggleShowPassword = () => setShowPassword((show) => !show);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RootContainer>
        <LoginPanel elevation={8}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, color: "primary.dark" }}>
            PayAssure
          </Typography>

          <Typography variant="h5" sx={{ mb: 3 }}>
            {mode === "login"
              ? "Secure Login"
              : mode === "forgot"
              ? "Forgot Password"
              : "Reset Password"}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

          {/* Login Form */}
          {mode === "login" && (
            <>
              <TextField
                label="Email"
                variant="outlined"
                fullWidth
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                sx={{ mb: 2 }}
                autoComplete="email"
              />

              <TextField
                label="Password"
                variant="outlined"
                fullWidth
                type={showPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={toggleShowPassword}
                        edge="end"
                        aria-label="toggle password visibility"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                autoComplete="current-password"
              />

              <Button
                variant="contained"
                fullWidth
                onClick={handleLogin}
                disabled={loading || !loginEmail || !loginPassword}
                sx={{ py: 1.5, fontSize: "1rem", fontWeight: 600, borderRadius: 2, backgroundColor: "primary.dark" }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
              </Button>

              <Typography
                variant="body2"
                sx={{ mt: 2, color: "primary.main", cursor: "pointer", userSelect: "none" }}
                onClick={() => {
                  setError("");
                  setSuccessMsg("");
                  setEmail(loginEmail); // preset email on forgot
                  setOtp("");
                  setNewPassword("");
                  setMode("forgot");
                }}
              >
                Forgot Password?
              </Typography>
            </>
          )}

          {/* Forgot Password Form */}
          {mode === "forgot" && (
            <>
              <TextField
                label="Enter your email"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant="outlined"
                autoComplete="email"
              />

              <Button
                variant="contained"
                fullWidth
                onClick={handleSendOtp}
                disabled={loading || !email}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Send OTP"}
              </Button>

              <Button
                variant="text"
                fullWidth
                onClick={() => {
                  setError("");
                  setSuccessMsg("");
                  setEmail("");
                  setMode("login");
                }}
                sx={{ mt: 1 }}
              >
                Back to Login
              </Button>
            </>
          )}

          {/* Reset Password Form */}
          {mode === "reset" && (
            <>
              <TextField
                label="Email"
                fullWidth
                value={email}
                disabled
                variant="outlined"
                autoComplete="email"
              />
              <TextField
                label="OTP"
                fullWidth
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                variant="outlined"
              />
              <TextField
                label="New Password"
                type="password"
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                variant="outlined"
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleResetPassword}
                disabled={loading || !otp || !newPassword}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Reset Password"}
              </Button>

              <Button
                variant="text"
                fullWidth
                onClick={() => {
                  setError("");
                  setSuccessMsg("");
                  setOtp("");
                  setNewPassword("");
                  setMode("login");
                }}
                sx={{ mt: 1 }}
              >
                Back to Login
              </Button>
            </>
          )}
        </LoginPanel>
      </RootContainer>
    </ThemeProvider>
  );
}












//working without forgot pass
// import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom"; // Added Link import
// import axios from "axios";
// import {
//   Box,
//   Typography,
//   TextField,
//   Button,
//   Paper,
//   CircularProgress,
//   Alert,
//   IconButton,
//   InputAdornment,
//   createTheme,
//   ThemeProvider,
//   CssBaseline,
// } from "@mui/material";
// import Visibility from "@mui/icons-material/Visibility";
// import VisibilityOff from "@mui/icons-material/VisibilityOff";
// import { styled } from "@mui/system";

// // Styled components for the main container and login panel
// const RootContainer = styled(Box)(({ theme }) => ({
//   display: "flex",
//   justifyContent: "flex-start",
//   alignItems: "center",
//   minHeight: "100vh",
//   width: "100vw",
//   backgroundImage: `
//     linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
//     url('/image.png')
//   `,
//   backgroundSize: "cover",
//   backgroundPosition: "center",
//   backgroundRepeat: "no-repeat",
//   padding: theme.spacing(3),
//   boxSizing: "border-box",
// }));

// const LoginPanel = styled(Paper)(({ theme }) => ({
//   width: "100%",
//   maxWidth: 450,
//   padding: theme.spacing(4),
//   borderRadius: theme.shape.borderRadius * 2,
//   backgroundColor: "rgba(255, 255, 255, 0.95)",
//   color: theme.palette.grey[900],
//   boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
//   textAlign: "center",
// }));

// // Main App component to handle the theme
// export default function App() {
//   const theme = createTheme({
//     palette: {
//       mode: "light",
//       primary: {
//         main: "#1976d2",
//       },
//       secondary: {
//         main: "#dc004e",
//       },
//       background: {
//         default: "#f5f5f5",
//         paper: "#ffffff",
//       },
//     },
//     typography: {
//       fontFamily: "Inter, sans-serif",
//     },
//     shape: {
//       borderRadius: 12,
//     },
//   });

//   return (
//     <ThemeProvider theme={theme}>
//       <CssBaseline />
//       <Login />
//     </ThemeProvider>
//   );
// }

// // Login component
// function Login() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const navigate = useNavigate();

//   const handleLogin = async () => {
//     setError("");
//     setLoading(true);

//     try {
//       // Send login POST request to backend
//       const response = await axios.post("http://localhost:9999/api/login", {
//         email,
//         password,
//       });

//       console.log("Login successful! Response data:", response.data);

//       // Navigate to /app with loaded user data
//       navigate("/app", { state: response.data });
//     } catch (err) {
//       setError(
//         err.response?.data?.message ||
//           err.message ||
//           "Invalid email or password. Please try again."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleClickShowPassword = () => setShowPassword((show) => !show);

//   return (
//     <RootContainer>
//       <LoginPanel elevation={8}>
//         <Box sx={{ mb: 4 }}>
//           <Typography
//             variant="h4"
//             component="h1"
//             sx={{ fontWeight: 700, mb: 1, color: "primary.dark" }}
//           >
//             PayAssure
//           </Typography>
//           <Typography variant="subtitle1" sx={{ color: "text.secondary" }}>
//             Secure Login
//           </Typography>
//         </Box>

//         {error && (
//           <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
//             {error}
//           </Alert>
//         )}

//         <TextField
//           label="Email"
//           variant="outlined"
//           fullWidth
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           sx={{ mb: 2 }}
//           InputLabelProps={{ sx: { color: "inherit" } }}
//         />

//         <TextField
//           label="Password"
//           variant="outlined"
//           fullWidth
//           type={showPassword ? "text" : "password"}
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           sx={{ mb: 3 }}
//           InputLabelProps={{ sx: { color: "inherit" } }}
//           InputProps={{
//             endAdornment: (
//               <InputAdornment position="end">
//                 <IconButton
//                   aria-label="toggle password visibility"
//                   onClick={handleClickShowPassword}
//                   edge="end"
//                   sx={{ color: "primary.main" }}
//                 >
//                   {showPassword ? <VisibilityOff /> : <Visibility />}
//                 </IconButton>
//               </InputAdornment>
//             ),
//           }}
//         />

//         <Button
//           variant="contained"
//           fullWidth
//           onClick={handleLogin}
//           disabled={loading || !email || !password}
//           sx={{
//             py: 1.5,
//             fontSize: "1rem",
//             fontWeight: 600,
//             borderRadius: 2,
//             backgroundColor: "primary.dark",
//             "&:hover": {
//               backgroundColor: "primary.main",
//             },
//           }}
//         >
//           {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
//         </Button>

//         {/* Forgot Password Link */}
//         <Typography
//           variant="body2"
//           sx={{ mt: 2, color: "primary.main", cursor: "pointer" }}
//         >
//           <Link to="/forgot-password" style={{ textDecoration: "none", color: "inherit" }}>
//             Forgot Password?
//           </Link>
//         </Typography>

//         <Typography variant="caption" display="block" sx={{ mt: 4, color: "text.secondary" }}>
//           &copy; {new Date().getFullYear()} PayAssure
//         </Typography>
//       </LoginPanel>
//     </RootContainer>
//   );
// }








//working
// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom"; // Added this import
// import axios from "axios";
// import {
//   Box,
//   Typography,
//   TextField,
//   Button,
//   Paper,
//   CircularProgress,
//   Alert,
//   IconButton,
//   InputAdornment,
//   createTheme,
//   ThemeProvider,
//   CssBaseline,
// } from "@mui/material";
// import Visibility from "@mui/icons-material/Visibility";
// import VisibilityOff from "@mui/icons-material/VisibilityOff";
// import { styled } from "@mui/system";

// // Styled components for the main container and login panel
// const RootContainer = styled(Box)(({ theme }) => ({
//   display: "flex",
//   justifyContent: "flex-start",
//   alignItems: "center",
//   minHeight: "100vh",
//   width: "100vw",
//   backgroundImage: `
//     linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
//     url('/image.png')
//   `,
//   backgroundSize: "cover",
//   backgroundPosition: "center",
//   backgroundRepeat: "no-repeat",
//   padding: theme.spacing(3),
//   boxSizing: "border-box",
// }));

// const LoginPanel = styled(Paper)(({ theme }) => ({
//   width: "100%",
//   maxWidth: 450,
//   padding: theme.spacing(4),
//   borderRadius: theme.shape.borderRadius * 2,
//   backgroundColor: "rgba(255, 255, 255, 0.95)",
//   color: theme.palette.grey[900],
//   boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
//   textAlign: "center",
// }));

// // Main App component to handle the theme
// export default function App() {
//   const theme = createTheme({
//     palette: {
//       mode: "light",
//       primary: {
//         main: "#1976d2",
//       },
//       secondary: {
//         main: "#dc004e",
//       },
//       background: {
//         default: "#f5f5f5",
//         paper: "#ffffff",
//       },
//     },
//     typography: {
//       fontFamily: "Inter, sans-serif",
//     },
//     shape: {
//       borderRadius: 12,
//     },
//   });

//   return (
//     <ThemeProvider theme={theme}>
//       <CssBaseline />
//       <Login />
//     </ThemeProvider>
//   );
// }

// // Login component
// function Login() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
  
//   const navigate = useNavigate(); // added navigate hook

//   const handleLogin = async () => {
//     setError("");
//     setLoading(true);

//     try {
//       // Send actual POST request to backend
//       const response = await axios.post("http://localhost:9999/api/login", {
//         email,
//         password,
//       });

//       console.log("Login successful! Response data:", response.data);

//       // Navigate to /app with loaded user data
//       navigate("/app", { state: response.data }); // added navigation

//     } catch (err) {
//       setError(
//         err.response?.data?.message ||
//           err.message ||
//           "Invalid email or password. Please try again."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleClickShowPassword = () => setShowPassword((show) => !show);

//   return (
//     <RootContainer>
//       <LoginPanel elevation={8}>
//         <Box sx={{ mb: 4 }}>
//           <Typography
//             variant="h4"
//             component="h1"
//             sx={{ fontWeight: 700, mb: 1, color: "primary.dark" }}
//           >
//             PayAssure
//           </Typography>
//           <Typography variant="subtitle1" sx={{ color: "text.secondary" }}>
//             Secure Login
//           </Typography>
//         </Box>

//         {error && (
//           <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
//             {error}
//           </Alert>
//         )}

//         <TextField
//           label="Email"
//           variant="outlined"
//           fullWidth
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           sx={{ mb: 2 }}
//           InputLabelProps={{ sx: { color: "inherit" } }}
//         />

//         <TextField
//           label="Password"
//           variant="outlined"
//           fullWidth
//           type={showPassword ? "text" : "password"}
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           sx={{ mb: 3 }}
//           InputLabelProps={{ sx: { color: "inherit" } }}
//           InputProps={{
//             endAdornment: (
//               <InputAdornment position="end">
//                 <IconButton
//                   aria-label="toggle password visibility"
//                   onClick={handleClickShowPassword}
//                   edge="end"
//                   sx={{ color: "primary.main" }}
//                 >
//                   {showPassword ? <VisibilityOff /> : <Visibility />}
//                 </IconButton>
//               </InputAdornment>
//             ),
//           }}
//         />

//         <Button
//           variant="contained"
//           fullWidth
//           onClick={handleLogin}
//           disabled={loading || !email || !password}
//           sx={{
//             py: 1.5,
//             fontSize: "1rem",
//             fontWeight: 600,
//             borderRadius: 2,
//             backgroundColor: "primary.dark",
//             "&:hover": {
//               backgroundColor: "primary.main",
//             },
//           }}
//         >
//           {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
//         </Button>

//         <Typography variant="caption" display="block" sx={{ mt: 4, color: "text.secondary" }}>
//           &copy; {new Date().getFullYear()} PayAssure
//         </Typography>
//       </LoginPanel>
//     </RootContainer>
//   );
// }

 




















// //basic
// // src/components/Login.jsx
// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios"; // Install if needed: npm install axios
// import {
//   Box,
//   Typography,
//   TextField,
//   Button,
//   Paper,
//   CircularProgress,
//   Alert,
//   IconButton,
//   InputAdornment,
//   Switch,
// } from "@mui/material";
// import Visibility from "@mui/icons-material/Visibility";
// import VisibilityOff from "@mui/icons-material/VisibilityOff";

// export default function Login({ mode, setMode }) {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   const handleLogin = async () => {
//     setError("");
//     setLoading(true);

//     try {
//       // Send POST request to backend via API Gateway
//       const response = await axios.post("http://localhost:9999/api/login", {
//         email,
//         password,
//       });

//       // Assuming backend returns { id, name, email, role, createdAt }
//       const { id, role } = response.data;

//       // Navigate to /app with user state (role determined by backend)
//       navigate("/app", { state: response.data });
//     } catch (err) {
//       setError(err.response?.data?.message || "Invalid email or password. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleClickShowPassword = () => setShowPassword((show) => !show);

//   return (
//     <Box
//       sx={{
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         minHeight: "100vh",
//         width: "100vw",
//         bgcolor: mode === "dark" ? "#121212" : "#f5f5f5",
//         p: 3,
//         boxSizing: "border-box",
//         backgroundImage: mode === "dark"
//           ? "linear-gradient(135deg, #1d1d1d 0%, #333 100%)"
//           : "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
//       }}
//     >
//       <Paper
//         elevation={6}
//         sx={{
//           p: 4,
//           maxWidth: 400,
//           width: "100%",
//           textAlign: "center",
//           borderRadius: 2,
//           bgcolor: mode === "dark" ? "#1d1d1d" : "#fff",
//           color: mode === "dark" ? "#fff" : "#000",
//         }}
//       >
//         <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
//           Billing and Payment Portal
//         </Typography>
//         <Typography variant="subtitle1" sx={{ mb: 4, color: "text.secondary" }}>
//           Secure Login
//         </Typography>

//         {error && (
//           <Alert severity="error" sx={{ mb: 2 }}>
//             {error}
//           </Alert>
//         )}

//         <TextField
//           label="Email"
//           variant="outlined"
//           fullWidth
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           sx={{ mb: 2 }}
//           InputLabelProps={{ sx: { color: mode === "dark" ? "#bbb" : "inherit" } }}
//         />

//         <TextField
//           label="Password"
//           variant="outlined"
//           fullWidth
//           type={showPassword ? "text" : "password"}
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           sx={{ mb: 3 }}
//           InputLabelProps={{ sx: { color: mode === "dark" ? "#bbb" : "inherit" } }}
//           InputProps={{
//             endAdornment: (
//               <InputAdornment position="end">
//                 <IconButton
//                   aria-label="toggle password visibility"
//                   onClick={handleClickShowPassword}
//                   edge="end"
//                   sx={{ color: mode === "dark" ? "#fff" : "inherit" }}
//                 >
//                   {showPassword ? <VisibilityOff /> : <Visibility />}
//                 </IconButton>
//               </InputAdornment>
//             ),
//           }}
//         />

//         <Button
//           variant="contained"
//           fullWidth
//           onClick={handleLogin}
//           disabled={loading || !email || !password}
//           sx={{
//             py: 1.5,
//             fontSize: "1rem",
//             backgroundColor: mode === "dark" ? "#90caf9" : "#1565c0",
//             "&:hover": { backgroundColor: mode === "dark" ? "#64b5f6" : "#0d47a1" },
//           }}
//         >
//           {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
//         </Button>

//         <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mt: 2 }}>
//           <Typography variant="body2" sx={{ mr: 1 }}>
//             Dark Mode
//           </Typography>
//           <Switch
//             checked={mode === "dark"}
//             onChange={() => setMode(mode === "dark" ? "light" : "dark")}
//             color="default"
//           />
//         </Box>

//         <Typography variant="caption" display="block" sx={{ mt: 2, color: "text.secondary" }}>
//           &copy; {new Date().getFullYear()} Billing and Payment Portal
//         </Typography>
//       </Paper>
//     </Box>
//   );
// }
