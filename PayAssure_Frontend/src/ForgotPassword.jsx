import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  createTheme,
  ThemeProvider,
} from "@mui/material";
import { styled } from "@mui/system";

// Material-UI theme customization
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
    body1: {
      color: "#555",
    },
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

// Styled components
const CenteredContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(2),
}));

const FormCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[5],
  width: "100%",
  maxWidth: 450,
  textAlign: "center",
}));

// ForgotPassword component
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
      const res = await axios.post(
        "http://localhost:9999/api/login/forgot-password",
        { email }
      );
      setMessage(res.data);
      // Navigate to ResetPassword page, passing email in state
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

// ResetPassword component
export function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  const passedEmail = location.state?.email || "";

  const [email, setEmail] = React.useState(passedEmail);
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (passedEmail) {
      setEmail(passedEmail);
    }
  }, [passedEmail]);

  const handleResetPassword = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await axios.post(
        "http://localhost:9999/api/login/reset-password",
        {
          email,
          otp,
          newPassword,
        }
      );
      setMessage(res.data);
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
