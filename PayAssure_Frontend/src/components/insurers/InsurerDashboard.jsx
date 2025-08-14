import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery,
  CardMedia,
  Container,
} from "@mui/material";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PolicyIcon from "@mui/icons-material/Description";
import GroupIcon from "@mui/icons-material/Group";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const API_BASE_URL = "http://localhost:9999/api/insurer";
const IMAGE_URLS = {
  home: "https://picsum.photos/id/237/400/200",
  auto: "https://picsum.photos/id/111/400/200",
  business: "https://picsum.photos/id/433/400/200",
  health: "https://picsum.photos/id/152/400/200",
  travel: "https://picsum.photos/id/261/400/200",
  life: "https://picsum.photos/id/1025/400/200",
  default: "https://picsum.photos/400/200?random=1",
  summaryCustomers: "https://t4.ftcdn.net/jpg/13/88/70/33/240_F_1388703300_HZcBOs2Ab93gQyXHOanhV3rz6Ro9dAqa.jpg",
  summaryRevenue: "https://t4.ftcdn.net/jpg/13/14/72/43/240_F_1314724369_mx1bEQ8eZb9S5gW0u8KIKDms5hNa3PXF.jpg",
  summaryPayments: "https://picsum.photos/id/357/400/200",
  summaryPolicies: "https://t3.ftcdn.net/jpg/09/10/59/38/240_F_910593811_jBm7xIop3Gy3uRDooDWT2muBmYUqv2OI.jpg",
};

export default function InsurerDashboard({ user }) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [allPayments, setAllPayments] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE_URL}/payments/history`),
      axios.get(`${API_BASE_URL}/invoices/history`),
      axios.get(`${API_BASE_URL}/customers/search?name=`),
    ])
      .then(async ([paymentsRes, invoicesRes, customersRes]) => {
        const customersMap = (customersRes.data || []).reduce((acc, c) => {
          acc[c.id] = c.name;
          return acc;
        }, {});

        const enrichedPayments = await Promise.all(
          (paymentsRes.data || []).map(async (payment) => {
            let customerName = "Unknown";
            if (payment.customerName) {
              customerName = payment.customerName;
            } else if (payment.customerId && customersMap[payment.customerId]) {
              customerName = customersMap[payment.customerId];
            } else if (payment.customerId) {
              try {
                const custRes = await axios.get(`${API_BASE_URL}/customers/${payment.customerId}`);
                customerName = custRes.data?.name || "Unknown";
              } catch {
                customerName = "Unknown";
              }
            }
            return { ...payment, customerName };
          })
        );

        setAllPayments(enrichedPayments);
        setAllInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
        setAllCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
      })
      .catch((error) => {
        console.error("Error fetching insurer dashboard data:", error);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = allPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

  const displayUserName = user?.name || "Insurer";
  const displayUserEmail = user?.email || "insurer@example.com";
  const displayUserId = user?.id || "INS001";
  const displayUserRole = user?.role || "insurer";

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress size={60} sx={{ color: "#667eea" }} />
        <Typography variant="h6" color="text.secondary">
          Loading insurer dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Card
        sx={{
          mb: 5,
          borderRadius: 4,
          boxShadow: 5,
          bgcolor: "white",
          px: { xs: 2, sm: 4 },
          py: { xs: 3, sm: 4 },
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: { xs: 2, sm: 4 },
        }}
      >
        <Avatar
          sx={{
            width: 80,
            height: 80,
            bgcolor: "#1976d2",
            fontWeight: 700,
            fontSize: 36,
            mr: { sm: 2 },
          }}
          alt={displayUserName}
        >
          {displayUserName.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: theme.palette.primary.main }}>
            Welcome, {displayUserName}!
          </Typography>
          <Typography variant="h6" sx={{ mb: 1, color: theme.palette.text.secondary }}>
            {displayUserRole.charAt(0).toUpperCase() + displayUserRole.slice(1)} Dashboard Overview
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body1" sx={{ mb: 0.5 }}>
              {displayUserEmail}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ID: <b>{displayUserId}</b> | Role: {displayUserRole}
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* Summary Stat Cards */}
      <Grid container spacing={4} justifyContent="center" sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              width: "100%",
              borderRadius: 3,
              boxShadow: 3,
              overflow: "hidden",
              bgcolor: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-3px)", boxShadow: 7 },
            }}
            elevation={3}
          >
            <CardMedia
              component="img"
              src={IMAGE_URLS.summaryCustomers}
              alt="Total Customers"
              sx={{ width: "100%", height: 140, objectFit: "cover" }}
            />
            <Avatar
              sx={{
                bgcolor: "#1976d2",
                width: 64,
                height: 64,
                mt: -4,
                mb: 1.5,
                borderRadius: 2,
                boxShadow: 3,
              }}
            >
              <GroupIcon sx={{ fontSize: 36, color: "#fff" }} />
            </Avatar>
            <CardContent sx={{ textAlign: "center", pt: 0, pb: 3, px: 3, flexGrow: 1 }}>
              <Typography variant="h4" sx={{ color: "#1976d2", fontWeight: 700, mb: 1 }}>
                {allCustomers.length}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: "#333", fontWeight: 600 }}>
                Total Customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              width: "100%",
              borderRadius: 3,
              boxShadow: 3,
              overflow: "hidden",
              bgcolor: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-3px)", boxShadow: 7 },
            }}
            elevation={3}
          >
            <CardMedia
              component="img"
              src={IMAGE_URLS.summaryPolicies}
              alt="Total Policies"
              sx={{ width: "100%", height: 140, objectFit: "cover" }}
            />
            <Avatar
              sx={{
                bgcolor: "#1976d2",
                width: 64,
                height: 64,
                mt: -4,
                mb: 1.5,
                borderRadius: 2,
                boxShadow: 3,
              }}
            >
              <PolicyIcon sx={{ fontSize: 36, color: "#fff" }} />
            </Avatar>
            <CardContent sx={{ textAlign: "center", pt: 0, pb: 3, px: 3, flexGrow: 1 }}>
              <Typography variant="h4" sx={{ color: "#1976d2", fontWeight: 700, mb: 1 }}>
                {allInvoices.reduce((count, invoice) => count + (invoice.policyIds?.length || 0), 0)}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: "#333", fontWeight: 600 }}>
                Total Policies Insured
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              width: "100%",
              borderRadius: 3,
              boxShadow: 3,
              overflow: "hidden",
              bgcolor: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-3px)", boxShadow: 7 },
            }}
            elevation={3}
          >
            <CardMedia
              component="img"
              src={IMAGE_URLS.summaryRevenue}
              alt="Total Revenue"
              sx={{ width: "100%", height: 140, objectFit: "cover" }}
            />
            <Avatar
              sx={{
                bgcolor: theme.palette.success.main,
                width: 64,
                height: 64,
                mt: -4,
                mb: 1.5,
                borderRadius: 2,
                boxShadow: 3,
              }}
            >
              <AccountBalanceWalletIcon sx={{ fontSize: 36, color: "#fff" }} />
            </Avatar>
            <CardContent sx={{ textAlign: "center", pt: 0, pb: 3, px: 3, flexGrow: 1 }}>
              <Typography variant="h4" sx={{ color: theme.palette.success.main, fontWeight: 700, mb: 1 }}>
                ₹{totalRevenue.toLocaleString()}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: "#333", fontWeight: 600 }}>
                Total Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* --- Recent (Overall) Payment History --- */}
      <Box mt={8}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: "center", color: theme.palette.primary.dark }}>
          Recent Payment History
        </Typography>
        <Divider sx={{ mb: 4, borderBottomWidth: 2 }} />
        {allPayments.length === 0 ? (
          <Box sx={{ p: 3, bgcolor: "background.paper", borderRadius: 2, textAlign: "center", boxShadow: 1 }}>
            <Typography variant="h6" color="text.secondary">No payment history available.</Typography>
            <Typography variant="body2" color="text.hint" mt={1}>
              Once payments are made, they will appear here.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3} justifyContent="center">
            {allPayments.slice(0, 4).map((payment, idx) => (
              <Grid item xs={12} sm={6} md={4} key={payment.id || payment._id || idx}>
                <Card
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    boxShadow: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": { transform: "translateY(-3px)", boxShadow: 7 },
                  }}
                  elevation={3}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <CheckCircleOutlineIcon color="success" sx={{ fontSize: 32 }} />
                    <Typography variant="h6" fontWeight={700} color={theme.palette.success.dark}>
                      Payment Received
                    </Typography>
                  </Box>
                  <Divider />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Customer: {payment.customerName || "N/A"}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.success.dark }}>
                    Amount: ₹{payment.amount}
                  </Typography>
                  <Chip
                    label={(payment.status || "COMPLETED").toUpperCase()}
                    size="small"
                    color={payment.status === "completed" || payment.status === "paid" ? "success" : "default"}
                    sx={{ fontWeight: 600, alignSelf: 'flex-start', mt: 1 }}
                  />
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* --- Overall Invoice History --- */}
      <Box mt={8} mb={8}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: "center", color: theme.palette.primary.dark }}>
          Recent Invoice History
        </Typography>
        <Divider sx={{ mb: 4, borderBottomWidth: 2 }} />
        {allInvoices.length === 0 ? (
          <Box sx={{ p: 3, bgcolor: "background.paper", borderRadius: 2, textAlign: "center", boxShadow: 1 }}>
            <Typography variant="h6" color="text.secondary">No invoice history available.</Typography>
            <Typography variant="body2" color="text.hint" mt={1}>
              Invoices will appear here once created.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3} justifyContent="center">
            {allInvoices.slice(0, 6).map((invoice, idx) => (
              <Grid item xs={12} sm={6} md={4} key={invoice.id || invoice._id || idx}>
                <Card
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    boxShadow: 3,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": { transform: "translateY(-3px)", boxShadow: 7 },
                    border: invoice.status === 'UNPAID' || invoice.status === 'FAILED' ? `1px solid ${theme.palette.error.light}` : "none",
                  }}
                  elevation={3}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    {(invoice.status === 'UNPAID' || invoice.status === 'FAILED') ? (
                      <WarningAmberIcon color="error" sx={{ fontSize: 32 }} />
                    ) : (
                      <AssignmentTurnedInIcon color="primary" sx={{ fontSize: 32 }} />
                    )}
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      sx={{ color: invoice.status === 'UNPAID' || invoice.status === 'FAILED' ? theme.palette.error.dark : theme.palette.primary.dark }}
                    >
                      Invoice #{invoice.invoiceNumber || invoice.id}
                    </Typography>
                  </Box>
                  <Divider />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Customer ID: {invoice.customerId || "N/A"}
                  </Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 600, color: invoice.status === 'UNPAID' || invoice.status === 'FAILED' ? theme.palette.error.dark : theme.palette.success.dark }}>
                    Amount: ₹{invoice.amount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Created: {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "-"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Valid Upto: {invoice.validUpto ? new Date(invoice.validUpto).toLocaleDateString() : "-"}
                  </Typography>
                  <Chip
                    label={invoice.status?.toUpperCase() || "N/A"}
                    size="small"
                    color={
                      invoice.status === "PAID"
                        ? "success"
                        : invoice.status === "UNPAID"
                        ? "error"
                        : invoice.status === "FAILED"
                        ? "warning"
                        : "default"
                    }
                    sx={{ fontWeight: 600, alignSelf: 'flex-start', mt: 1 }}
                  />
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
}







// src/components/insurers/InsurerDashboard.jsx
// import React from 'react';

// export default function InsurerDashboard({ user }) {
//   return (
//     <div>
//       <h2>Insurer Dashboard</h2>
//       <p>Welcome, {user?.name || "Insurer"}.</p>
//       <p>Email: {user?.email}</p>
//       <p>ID: {user?.id}</p>
//       <p>Role: {user?.role}</p>
//       {/* You can access any user field passed from backend */}
//     </div>
//   );
// }
