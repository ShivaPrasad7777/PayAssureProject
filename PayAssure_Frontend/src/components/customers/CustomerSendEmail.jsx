import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Divider,
  Snackbar,
  Alert,
  Checkbox,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import ClearAllIcon from "@mui/icons-material/ClearAll";

// Base URL respects your API Gateway routing
const API_BASE = "http://localhost:9999/api/customer";

// Helper function to format the policy expiry date
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date)) return "N/A";
  return date.toLocaleDateString();
}

export default function CustomerSendEmail() {
  const theme = useTheme();
  const [days, setDays] = useState(7);
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Fetch customers with policies expiring exactly in `days`
  const fetchCustomers = async (selectedDays) => {
    setLoading(true);
    setCustomers([]);
    setSelected(new Set());
    // Do NOT clear snackbar here, keep snackbar state stable

    try {
      const { data } = await axios.get(`${API_BASE}/customers/expiring-policies/by-days`, {
        params: { days: selectedDays },
      });
      // Defensive: ensure data is an array
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setSnackbarMessage("Failed to fetch customers with expiring policies.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      setCustomers([]);
    }
    setLoading(false);
  };

  // Toggle checkbox selection for one customer-policy pair
  const toggleSelect = (customerId, policyId) => {
    const key = `${customerId}---${policyId}`;
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  };

  // Select all customer-policy pairs shown
  const selectAll = () => {
    const all = new Set();
    customers.forEach((customer) => {
      if (Array.isArray(customer.paymentHistory)) {
        customer.paymentHistory.forEach((history) => {
          if (history?.validUpto) {
            all.add(`${customer.id}---${history.policyId}`);
          }
        });
      }
    });
    setSelected(all);
  };

  // Deselect all
  const unselectAll = () => {
    setSelected(new Set());
  };

  // Send notification emails to all selected customer-policy pairs
  const sendNotifications = async () => {
    if (selected.size === 0) {
      setSnackbarMessage("Please select at least one customer-policy to send notification.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    setLoading(true);
    // Do NOT reset snackbar state here to avoid flicker

    const payload = Array.from(selected).map((key) => {
      const [customerId, policyId] = key.split("---");
      return { customerId, policyId };
    });

    try {
      await axios.post(`${API_BASE}/customers/expiring-policies/notify`, payload);
      console.log("Notification emails sent successfully.");
      setSnackbarMessage("Notification emails sent successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setSelected(new Set()); // Clear selections on success
      fetchCustomers(days); // Optionally refresh list after sending notifications
    } catch (err) {
      console.error("Failed to send notification emails:", err);
      setSnackbarMessage("Failed to send notification emails.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
    setLoading(false);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ py: 4, px: { xs: 2, sm: 4 }, minHeight: "100vh", bgcolor: "#f0f2f5" }}>
      {/* Policy Expiry Notification Header */}
      <Box
        sx={{
          py: 2,
          px: 2,
          mb: 4,
          background: "linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)",
          color: "white",
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: "bold" }}>
          Policy Expiry Notification
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 900, mx: "auto" }}>
        <Paper elevation={4} sx={{ width: "100%", borderRadius: 2, p: { xs: 2, md: 4 } }}>
          <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="days-select-label">Days Before Expiry</InputLabel>
              <Select
                labelId="days-select-label"
                value={days}
                label="Days Before Expiry"
                onChange={(e) => setDays(Number(e.target.value))}
                disabled={loading}
              >
                {[...Array(30)].map((_, idx) => (
                  <MenuItem key={idx + 1} value={idx + 1}>
                    {idx + 1} {idx === 0 ? "day" : "days"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="primary"
              onClick={() => fetchCustomers(days)}
              disabled={loading}
              sx={{ py: "12px" }}
            >
              Fetch Customers
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={selectAll}
              disabled={loading || customers.length === 0}
              startIcon={<HowToRegIcon />}
            >
              Select All
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={unselectAll}
              disabled={loading || selected.size === 0}
              startIcon={<ClearAllIcon />}
            >
              Deselect All
            </Button>
            {selected.size > 0 && (
              <Chip label={`${selected.size} selected`} color="primary" variant="outlined" sx={{ ml: 2 }} />
            )}
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={sendNotifications}
            disabled={loading || selected.size === 0}
            startIcon={<SendIcon />}
            fullWidth
            sx={{ mb: 3, py: 1.5, textTransform: "none", fontWeight: "bold", fontSize: "1.1rem" }}
          >
            Send Notification Emails
          </Button>

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {customers.length > 0 && (
            <TableContainer component={Paper} elevation={1} sx={{ mt: 2 }}>
              <Table aria-label="expiring policies table">
                <TableHead sx={{ bgcolor: theme.palette.grey[200] }}>
                  <TableRow>
                    <TableCell padding="checkbox">Select</TableCell>
                    <TableCell>Customer Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Policy ID</TableCell>
                    <TableCell>Expiry Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers.map(
                    (customer) =>
                      Array.isArray(customer.paymentHistory) &&
                      customer.paymentHistory.map(
                        (history) =>
                          history?.validUpto && (
                            <TableRow key={`${customer.id}-${history.policyId}`} hover>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selected.has(`${customer.id}---${history.policyId}`)}
                                  onChange={() => toggleSelect(customer.id, history.policyId)}
                                  disabled={loading}
                                />
                              </TableCell>
                              <TableCell>{customer.name || customer.id}</TableCell>
                              <TableCell>{customer.email}</TableCell>
                              <TableCell>{history.policyId}</TableCell>
                              <TableCell>{formatDate(history.validUpto)}</TableCell>
                            </TableRow>
                          )
                      )
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {customers.length === 0 && !loading && (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 2 }}>
              No customers found for the selected days.
            </Typography>
          )}
        </Paper>
      </Box>

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
