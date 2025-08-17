import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box, Typography, CircularProgress, Alert, Paper,
  Button, Snackbar, useTheme
} from "@mui/material";

export default function CustomerInvoiceList({ user }) {
  const theme = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      const fetchData = async () => {
        try {
          const [invoicesResponse, policiesResponse] = await Promise.all([
            axios.get(`http://localhost:9999/api/customer/invoices/unpaid/${user.id}`),
            axios.get(`http://localhost:9999/api/customer/policies/owned/${user.id}`)
          ]);
          setInvoices(invoicesResponse.data);
          setPolicies(policiesResponse.data);
        } catch (err) {
          setError("Error fetching data. Please try again.");
          console.error("Error fetching data:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    } else {
      setError("User ID not available. Please log in again.");
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Returns an array of policy names for this invoice.
   * Handles invoice having either policyId or policyIds (array).
   */
  const getPolicyNamesForInvoice = (invoice) => {
    let ids = [];
    if (Array.isArray(invoice.policyIds)) {
      ids = invoice.policyIds;
    } else if (invoice.policyId) {
      ids = [invoice.policyId];
    }
    ids = [...new Set(ids)]; // Deduplicate, just in case
    return ids.map((policyId) => {
      const policy = policies.find((p) => String(p.id) === String(policyId));
      return policy ? policy.name : "Policy Not Found";
    });
  };

  const handlePayNow = (invoice) => {
    if (!window.Razorpay) {
      setSnackbarMessage("Razorpay SDK not loaded. Please check your internet or reload the page.");
      setSnackbarOpen(true);
      return;
    }

    if (!invoice.razorpayOrderId) {
      setSnackbarMessage("No order ID available for this invoice.");
      setSnackbarOpen(true);
      return;
    }

    const options = {
      key: "rzp_test_lHtRkQzSVuuy5r", // Your Razorpay test key ID
      amount: invoice.amount * 100, // In paise
      currency: "INR",
      order_id: invoice.razorpayOrderId,
      handler: function (response) {
        setSnackbarMessage("Payment successful! Payment ID: " + response.razorpay_payment_id);
        setSnackbarOpen(true);
        // Ideally refetch invoices after payment
      },
      prefill: {
        name: user.name || "Shiv",
        email: user.email || "pattedashivaprasad@gmail.com",
        contact: user.phone || "+919390679463",
      },
      notes: {
        invoice_id: invoice.id,
      },
      theme: {
        color: "#3399cc",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: '#f0f2f5' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ py: 4, px: { xs: 2, sm: 4 }, minHeight: "100vh", bgcolor: '#f0f2f5' }}>
      {/* Header */}
      <Box
        sx={{
          py: 2,
          px: 2,
          mb: 4,
          background: 'linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)',
          color: 'white',
          borderRadius: 2,
          boxShadow: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2
        }}
      >
        <Typography variant="h4" align="center" sx={{ fontWeight: 'bold' }}>
          Your Unpaid Invoices
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1000, mx: "auto", display: 'flex', flexDirection: 'column', gap: 3 }}>
        {invoices.length === 0 ? (
          <Typography color="text.secondary" align="center">No unpaid invoices found.</Typography>
        ) : (
          invoices.map((invoice) => (
            <Paper key={invoice.id} elevation={4} sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: 'white',
              color: theme.palette.text.primary,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
              }
            }}>
              <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
                  Invoice for: {getPolicyNamesForInvoice(invoice).join(', ')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Invoice ID: {invoice.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Months: {invoice.months}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>Amount</Typography>
                  <Typography variant="h5">₹{invoice.amount}</Typography>
                </Box>
                <Box>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handlePayNow(invoice)}
                    sx={{
                      boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                      '&:hover': {
                        boxShadow: '0 6px 8px rgba(0,0,0,0.3)',
                      }
                    }}
                  >
                    Pay Now
                  </Button>
                </Box>
              </Box>
            </Paper>
          ))
        )}
      </Box>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="info" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
