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
import { useNavigate } from "react-router-dom";
import axios from "axios";

// --- THEME ---
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
  justifyContent: "flex-start",
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
  marginLeft: theme.spacing(8),
  marginRight: theme.spacing(2),
}));

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Password validation (returns error string if invalid, otherwise empty)
  function validatePassword(pwd) {
    if (pwd.length < 8)
      return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(pwd))
      return "At least one uppercase letter required.";
    if (!/[a-z]/.test(pwd))
      return "At least one lowercase letter required.";
    if (!/[0-9]/.test(pwd))
      return "At least one number required.";
    if (!/[!@#$%^&*()_\-+=]/.test(pwd))
      return "At least one special character required.";
    return "";
  }

  // --- LOGIN
  const handleLogin = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await axios.post("http://localhost:9999/api/login", {
        email: loginEmail,
        password: loginPassword,
      });
      setLoginEmail("");
      setLoginPassword("");
      navigate("/app", { state: res.data });
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid email or password. Please try again."
      );
    }
    setLoading(false);
  };

  // --- SEND OTP (Forgot Password)
  const handleSendOtp = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await axios.post("http://localhost:9999/api/login/forgot-password", {
        email,
      });
      setSuccessMsg(res.data || "OTP sent to your email.");
      setMode("reset");
    } catch (err) {
      setError(
        err.response?.data?.message || "Mail is not registered, Failed to send OTP."
      );
    }
    setLoading(false);
  };

  // --- RESET PASSWORD
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

  const toggleShowPassword = () => setShowPassword((show) => !show);

  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    setPasswordError(validatePassword(value));
  };

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
                  setEmail(loginEmail);
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
                sx={{ mb: 3 }}
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleSendOtp}
                disabled={loading || !email}
                sx={{ mb: 2 }}
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
                sx={{ mb: 1 }}
              >
                Back to Login
              </Button>
            </>
          )}

          {/* --- Improved Reset Password Form --- */}
          {mode === "reset" && (
            <>
              <TextField
                label="Email"
                fullWidth
                value={email}
                disabled
                variant="outlined"
                autoComplete="email"
                sx={{ mb: 3 }}
              />
              <TextField
                label="OTP"
                fullWidth
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                variant="outlined"
                sx={{ mb: 3 }}
              />
              <TextField
                label="New Password"
                type="password"
                fullWidth
                value={newPassword}
                onChange={handleNewPasswordChange}
                variant="outlined"
                sx={{ mb: 3 }}
                error={!!passwordError}
                helperText={passwordError || "Password must contain uppercase, lowercase, number, and special character."}
                autoComplete="new-password"
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleResetPassword}
                disabled={
                  loading ||
                  !otp ||
                  !newPassword ||
                  !!passwordError
                }
                sx={{ mb: 2, py: 1.5, fontSize: "1rem", fontWeight: 600, borderRadius: 2, backgroundColor: "primary.dark" }}
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

