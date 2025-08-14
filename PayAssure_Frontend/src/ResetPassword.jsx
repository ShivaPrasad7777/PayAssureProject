import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, BrowserRouter as Router, Routes, Route } from "react-router-dom";
import axios from "axios";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { styled } from "@mui/system";

// --- Define styled components ---
const CenteredContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  backgroundColor: theme?.palette.background.default || "#f4f6f8",
  padding: theme?.spacing(2) || 16,
}));

const FormCard = styled(Paper)(({ theme }) => ({
  padding: theme?.spacing(4) || 32,
  borderRadius: (theme?.shape.borderRadius || 8) * 2,
  boxShadow: theme?.shadows[5] || "0px 3px 5px rgba(0,0,0,0.2)",
  width: "100%",
  maxWidth: 450,
  textAlign: "center",
}));

// --- Material-UI theme customization ---
const theme = createTheme({
  palette: {
    primary: { main: "#1976d2" },
    secondary: { main: "#dc004e" },
    background: { default: "#f4f6f8" },
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    h5: {
      fontWeight: 600,
      marginBottom: "1.5rem",
      color: "#333",
    },
    body1: { color: "#555" },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 25,
          textTransform: "none",
          fontWeight: 600,
          padding: "10px 20px",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: "1.5rem",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 16,
        },
      },
    },
  },
});

// --- ForgotPassword Component ---
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSendOtp = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await axios.post("http://localhost:9999/api/login/forgot-password", { email });
      setMessage(res.data);
      // Redirect to Reset Password page, passing email via state
      navigate("/reset-password", { state: { email } });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (typeof err.response?.data === "string"
          ? err.response.data
          : JSON.stringify(err.response?.data)) ||
        "Failed to send OTP. Please try again.";
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CenteredContainer>
        <FormCard elevation={5}>
          <Typography variant="h5">Forgot Password</Typography>

          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Email"
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
        </FormCard>
      </CenteredContainer>
    </ThemeProvider>
  );
}

// --- ResetPassword Component ---
export function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get email passed from ForgotPassword page via state
  const passedEmail = location.state?.email || "";

  const [email, setEmail] = useState(passedEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill email if it was passed from the previous page
  useEffect(() => {
    if (passedEmail) {
      setEmail(passedEmail);
    }
  }, [passedEmail]);

  const handleResetPassword = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await axios.post("http://localhost:9999/api/login/reset-password", {
        email,
        otp,
        newPassword,
      });
      setMessage(res.data);
      // Navigate to login after a short delay to show success message
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (typeof err.response?.data === "string"
          ? err.response.data
          : JSON.stringify(err.response?.data)) ||
        "Failed to reset password. Please try again.";
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CenteredContainer>
        <FormCard elevation={5}>
          <Typography variant="h5">Reset Password</Typography>

          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!passedEmail}
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
            disabled={loading || !email || !otp || !newPassword}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Reset Password"}
          </Button>
        </FormCard>
      </CenteredContainer>
    </ThemeProvider>
  );
}

// --- App Component: Main Entry Point ---
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<ForgotPassword />} />
          <Route
            path="/login"
            element={
              <CenteredContainer>
                <FormCard elevation={5}>
                  <Typography variant="h5" color="primary">
                    Login Page
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    You have successfully reset your password. Please log in.
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{ mt: 3 }}
                    onClick={() => alert("Simulated Login")}
                  >
                    Go to Login
                  </Button>
                </FormCard>
              </CenteredContainer>
            }
          />
          {/* Add a "NoMatch" or 404 route if desired */}
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
