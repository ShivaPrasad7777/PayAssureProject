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
  Tooltip,
  useTheme,
  useMediaQuery,
  CardMedia,
  Container,
} from "@mui/material";

import PolicyIcon from "@mui/icons-material/Description";
import HomeIcon from "@mui/icons-material/Home";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import BusinessIcon from "@mui/icons-material/Business";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FlightIcon from "@mui/icons-material/Flight";
import PeopleIcon from "@mui/icons-material/People";
import PaymentIcon from "@mui/icons-material/Payment";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const API_BASE_URL = "http://localhost:9999/api/customer";

const IMAGE_URLS = {
  home: "https://picsum.photos/id/237/400/200",
  auto: "https://picsum.photos/id/111/400/200",
  business: "https://t3.ftcdn.net/jpg/03/17/69/76/240_F_317697675_Ssv013BM6gzkNm6kbKW5lrGhRGBNym3G.jpg",
  health: "https://t4.ftcdn.net/jpg/06/08/10/93/240_F_608109395_ff7tEORZ5k2WFdW4OChW76jwlpriHbfN.jpg",
  travel: "https://t3.ftcdn.net/jpg/02/50/93/16/240_F_250931621_TL9tVSMkd6NRPlTiLVRw5DJhUzvtvWyF.jpg",
  life: "https://picsum.photos/id/1025/400/200",
  default: "https://picsum.photos/400/200?random=1",
  summaryPolicies: "https://imgs.search.brave.com/kb8jKp7rpMx0bJzmC0e1lFZLJ2F_WP6F_bQA-4ivaeg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzA1LzI2Lzg5LzA2/LzM2MF9GXzUyNjg5/MDYwMV83QTB5cEZq/SnR6NXFTdVdXQ0pI/NWtib29TSVVOTjRG/Ri5qcGc",
  summaryPayments: "https://imgs.search.brave.com/SEf7CfO_yim-JHPf-K8rFlVUC1M-aVYewoRmcGQHOys/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTcy/MjY3Mzk4L3Bob3Rv/L21vbmV5LWJhZy5q/cGc_cz02MTJ4NjEy/Jnc9MCZrPTIwJmM9/TDg1QktiSkFpbk43/TGY5b0NsbEFNZ2NO/clAyWEphTWJPdC02/eE1jT0V3ND0",
  summaryInvoices: "https://imgs.search.brave.com/ma-9fDkYIKg5bPJJwkn0mfq2arU4A_049ve_dBSMU08/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90NC5m/dGNkbi5uZXQvanBn/LzA1LzQ0LzgyLzM5/LzM2MF9GXzU0NDgy/MzkxOF9SNTZSYWJ2/ZFlGU1A4ZVRHWGMx/SjhwRE10WDZmQ0N6/Qi5qcGc",
};

function getPolicyIconAndImage(policyName = "") {
  const lower = policyName.toLowerCase();
  if (lower.includes("home"))
    return { icon: <HomeIcon />, image: IMAGE_URLS.home };
  if (lower.includes("auto") || lower.includes("car"))
    return { icon: <DirectionsCarIcon />, image: IMAGE_URLS.auto };
  if (lower.includes("business") || lower.includes("commercial"))
    return { icon: <BusinessIcon />, image: IMAGE_URLS.business };
  if (lower.includes("health") || lower.includes("medical"))
    return { icon: <FavoriteIcon />, image: IMAGE_URLS.health };
  if (lower.includes("travel") || lower.includes("trip"))
    return { icon: <FlightIcon />, image: IMAGE_URLS.travel };
  if (lower.includes("life")) return { icon: <PeopleIcon />, image: IMAGE_URLS.life };
  return { icon: <PolicyIcon />, image: IMAGE_URLS.default };
}

// Helper to find validUpto date for each policy from paymentHistory
function getNextPaymentValidUpto(policyId, paymentHistory) {
  if (!paymentHistory || !Array.isArray(paymentHistory)) return null;
  const entry = paymentHistory.find((e) => e.policyId === policyId);
  return entry?.validUpto ? new Date(entry.validUpto) : null;
}

function StatCard({ title, count, color, icon, image }) {
  return (
    <Card
      sx={{
        width: 320,
        borderRadius: 3,
        boxShadow: 4,
        overflow: "hidden",
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transition: "transform 0.2s",
        "&:hover": { transform: "translateY(-3px)", boxShadow: 7 },
      }}
    >
      <Box component="img" src={image} alt={title} sx={{ width: "100%", height: 140, objectFit: "cover" }} />
      <Avatar
        sx={{
          bgcolor: color,
          width: 64,
          height: 64,
          mt: -4,
          mb: 2,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        {icon}
      </Avatar>
      <CardContent sx={{ textAlign: "center", pt: 0, pb: 3, px: 3, flexGrow: 1 }}>
        <Typography variant="h4" sx={{ color, fontWeight: 700, mb: 1 }}>
          {count}
        </Typography>
        <Typography variant="subtitle1" sx={{ color: "#333", fontWeight: 600 }}>
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function CustomerDashboard({ user }) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const customerId = user?.id;

  const [policies, setPolicies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper: get Policy Names from policy IDs for invoices
  const enrichInvoicesWithPolicyNames = (invoices, policiesList) => {
    return invoices.map((invoice) => {
      let ids = [];
      if (Array.isArray(invoice.policyIds)) {
        ids = invoice.policyIds;
      } else if (invoice.policyId) {
        ids = [invoice.policyId];
      }
      ids = [...new Set(ids)]; // deduplicate

      const names = ids
        .map((id) => {
          const p = policiesList.find((pol) => String(pol.id) === String(id));
          return p ? p.name : "Unknown Policy";
        })
        .filter((name) => !!name);
      return {
        ...invoice,
        policyNames: names.length > 0 ? names.join(", ") : "No Associated Policies",
      };
    });
  };

  // Enrich payments with policy names like in CustomerPaymentHistory
  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      axios.get(`${API_BASE_URL}/policies/owned/${customerId}`),
      axios.get(`${API_BASE_URL}/payments/history/${customerId}`),
      axios.get(`${API_BASE_URL}/invoices/unpaid/${customerId}`),
      axios.get(`${API_BASE_URL}/${customerId}`),
    ])
      .then(async ([policyRes, paymentRes, invoiceRes, customerRes]) => {
        const policiesList = Array.isArray(policyRes.data) ? policyRes.data : [];
        const invoicesList = Array.isArray(invoiceRes.data) ? invoiceRes.data : [];
        setPolicies(policiesList);
        setUnpaidInvoices(enrichInvoicesWithPolicyNames(invoicesList, policiesList)); // <-- enrich here
        setCustomer(customerRes.data);

        const paymentsRaw = Array.isArray(paymentRes.data) ? paymentRes.data : [];

        const enrichedPayments = await Promise.all(
          paymentsRaw.map(async (payment) => {
            let policyNames = "N/A";

            if (payment.invoiceId) {
              try {
                const { data: invoice } = await axios.get(`${API_BASE_URL}/invoices/${payment.invoiceId}`);
                const policyIds = invoice?.policyIds || [];

                if (policyIds.length > 0) {
                  try {
                    const { data: policyNamesArray } = await axios.post(`${API_BASE_URL}/policies/names`, policyIds);
                    policyNames = Array.isArray(policyNamesArray) ? policyNamesArray.join(", ") : "N/A";
                  } catch (error) {
                    console.error("Error fetching policy names:", error);
                    policyNames = "Error fetching policy names";
                  }
                } else {
                  policyNames = "No Policies Associated";
                }
              } catch (error) {
                console.error("Error fetching invoice:", error);
                policyNames = "Error fetching invoice";
              }
            } else if (payment.policyNames && Array.isArray(payment.policyNames) && payment.policyNames.length > 0) {
              policyNames = payment.policyNames.join(", ");
            } else {
              policyNames = "No Invoice / Policies";
            }

            return {
              ...payment,
              policyNames,
            };
          })
        );

        setPayments(enrichedPayments);
      })
      .catch((err) => {
        console.error("Error loading dashboard data:", err);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

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
          Loading your dashboard...
        </Typography>
      </Box>
    );
  }

  const displayName = user?.name || customer?.name || "User";
  const displayEmail = user?.email || customer?.email || "N/A";
  const displayID = user?.id || customer?.id || "N/A";
  const displayRole = (user?.role || customer?.role || "customer").toLowerCase();

  const statCards = [
    {
      title: "Owned Policies",
      count: policies.length,
      color: "#1976d2",
      icon: <PolicyIcon sx={{ fontSize: 36, color: "#fff" }} />,
      image: IMAGE_URLS.summaryPolicies,
    },
    {
      title: "Total Payments",
      count: payments.length,
      color: "#43a047",
      icon: <PaymentIcon sx={{ fontSize: 36, color: "#fff" }} />,
      image: IMAGE_URLS.summaryPayments,
    },
    {
      title: "Unpaid Invoices",
      count: unpaidInvoices.length,
      color: "#e53935",
      icon: <ErrorOutlineIcon sx={{ fontSize: 36, color: "#fff" }} />,
      image: IMAGE_URLS.summaryInvoices,
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Card */}
      <Card
        sx={{
          mb: 5,
          borderRadius: 4,
          boxShadow: 5,
          overflow: "hidden",
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
          alt={displayName}
        >
          {displayName.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: theme.palette.primary.main }}>
            Welcome, {displayName}!
          </Typography>
          <Typography variant="h6" sx={{ mb: 1, color: theme.palette.text.secondary }}>
            {displayRole.charAt(0).toUpperCase() + displayRole.slice(1)} Dashboard Overview
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body1" sx={{ mb: 0.5 }}>
              {displayEmail}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ID: <b>{displayID}</b> | Role: {displayRole}
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* Summary Stat Cards */}
      <Grid container spacing={4} justifyContent="center" sx={{ mb: 3 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title} display="flex" justifyContent="center">
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      {/* Your Policies */}
      <Box mt={7}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: "center", color: theme.palette.primary.dark }}>
          Your Policies
        </Typography>
        <Divider sx={{ mb: 4, borderBottomWidth: 2 }} />
        {policies.length === 0 ? (
          <Typography variant="h6" color="text.secondary" align="center">
            You don't currently own any policies.
          </Typography>
        ) : (
          <Grid container spacing={4} justifyContent="center">
            {policies.map((policy, idx) => {
              const { icon, image } = getPolicyIconAndImage(policy.name || policy.policyName || "");
              const validUptoDate = getNextPaymentValidUpto(policy.id || policy._id, customer?.paymentHistory);

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={policy.id || policy._id || idx} display="flex" justifyContent="center">
                  <Card
                    sx={{
                      width: 320,
                      borderRadius: 3,
                      boxShadow: 3,
                      overflow: "hidden",
                      bgcolor: "#fff",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <CardMedia component="img" height={140} image={image} alt="Policy image" />
                    <Avatar
                      sx={{
                        bgcolor: theme.palette.primary.main,
                        width: 62,
                        height: 62,
                        mt: -4,
                        mb: 2,
                        borderRadius: 1.5,
                        boxShadow: 3,
                      }}
                    >
                      {icon}
                    </Avatar>
                    <CardContent sx={{ textAlign: "center", p: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                        {policy.name || policy.policyName || "Unnamed Policy"}
                      </Typography>
                      {policy.description && (
                        <Tooltip title={policy.description}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              mb: 1,
                            }}
                          >
                            {policy.description}
                          </Typography>
                        </Tooltip>
                      )}
                      <Typography variant="subtitle1" color="text.primary" sx={{ mb: 0.5, fontWeight: 600 }}>
                        Premium: ₹{policy.monthlyPremium ?? policy.premium ?? "N/A"}
                      </Typography>

                      {/* Show Next Payment Date if available */}
                      {validUptoDate && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Next Payment Date: {validUptoDate.toLocaleDateString()}
                        </Typography>
                      )}

                      {policy.status && (
                        <Chip
                          label={policy.status.toUpperCase()}
                          size="small"
                          color={policy.status === "active" ? "success" : "warning"}
                          sx={{ mt: 1 }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Recent Payments */}
      <Box mt={8}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: "center", color: theme.palette.primary.dark }}>
          Recent Payments
        </Typography>
        <Divider sx={{ mb: 4, borderBottomWidth: 2 }} />
        {payments.length === 0 ? (
          <Typography variant="h6" color="text.secondary" align="center">
            No recent payments found.
          </Typography>
        ) : (
          payments.slice(0, 5).map((payment, idx) => (
            <Card
              key={payment.id || payment._id || idx}
              sx={{
                display: "flex",
                alignItems: "center",
                padding: 2,
                mb: 3,
                boxShadow: 3,
                borderRadius: 3,
              }}
            >
              <Avatar sx={{ bgcolor: "#43a047", width: 62, height: 62, mr: 3 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 36, color: "#fff" }} />
              </Avatar>
              <Box flex={1}>
                <Typography variant="h6" fontWeight={700}>
                  {payment.policyNames || "Policy"}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Amount Paid: ₹{payment.amount}
                </Typography>
                {payment.paidAt && (
                  <Typography variant="caption" color="text.secondary">
                    Date: {new Date(payment.paidAt).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
              <Chip
                label={(payment.status || "COMPLETED").toUpperCase()}
                size="small"
                color={
                  payment.status === "completed" || payment.status === "paid"
                    ? "success"
                    : payment.status === "pending"
                    ? "warning"
                    : payment.status === "failed"
                    ? "error"
                    : "default"
                }
                sx={{ fontWeight: 600 }}
              />
            </Card>
          ))
        )}
      </Box>

      {/* Unpaid Invoices */}
      <Box mt={8} mb={8}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: "center", color: theme.palette.primary.dark }}>
          Unpaid Invoices
        </Typography>
        <Divider sx={{ mb: 4, borderBottomWidth: 2 }} />
        {unpaidInvoices.length === 0 ? (
          <Typography variant="h6" color="text.secondary" align="center">
            You have no outstanding invoices.
          </Typography>
        ) : (
          unpaidInvoices.map((invoice, idx) => (
            <Card
              key={invoice.id || invoice._id || idx}
              sx={{
                display: "flex",
                alignItems: "center",
                padding: 2,
                mb: 3,
                boxShadow: 3,
                borderRadius: 3,
                border: `1px solid ${theme.palette.error.light}`,
              }}
            >
              <Avatar sx={{ bgcolor: "#e53935", width: 62, height: 62, mr: 3 }}>
                <WarningAmberIcon sx={{ fontSize: 36, color: "#fff" }} />
              </Avatar>
              <Box flex={1}>
                <Typography variant="h6" fontWeight={700}>
                  {invoice.policyNames || "No Associated Policies"}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Amount Due: ₹{invoice.amount}
                </Typography>
                {invoice.dueDate && (
                  <Typography variant="caption" color="text.secondary">
                    Due Date: {new Date(invoice.dueDate).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
              <Chip label="UNPAID" size="small" color="error" sx={{ fontWeight: 600 }} />
            </Card>
          ))
        )}
      </Box>
    </Container>
  );
}


















// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import {
//   Box,
//   Card,
//   CardContent,
//   Typography,
//   Grid,
//   Chip,
//   CircularProgress,
//   Avatar,
//   Divider,
//   Tooltip,
//   useTheme,
//   useMediaQuery,
//   CardMedia,
//   Container,
// } from "@mui/material";

// import PolicyIcon from "@mui/icons-material/Description";
// import HomeIcon from "@mui/icons-material/Home";
// import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
// import BusinessIcon from "@mui/icons-material/Business";
// import FavoriteIcon from "@mui/icons-material/Favorite";
// import FlightIcon from "@mui/icons-material/Flight";
// import PeopleIcon from "@mui/icons-material/People";
// import PaymentIcon from "@mui/icons-material/Payment";
// import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
// import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
// import WarningAmberIcon from "@mui/icons-material/WarningAmber";

// const API_BASE_URL = "http://localhost:9999/api/customer";

// const IMAGE_URLS = {
//   home: "https://picsum.photos/id/237/400/200",
//   auto: "https://picsum.photos/id/111/400/200",
//   business: "https://t3.ftcdn.net/jpg/03/17/69/76/240_F_317697675_Ssv013BM6gzkNm6kbKW5lrGhRGBNym3G.jpg",
//   health: "https://t4.ftcdn.net/jpg/06/08/10/93/240_F_608109395_ff7tEORZ5k2WFdW4OChW76jwlpriHbfN.jpg",
//   travel: "https://t3.ftcdn.net/jpg/02/50/93/16/240_F_250931621_TL9tVSMkd6NRPlTiLVRw5DJhUzvtvWyF.jpg",
//   life: "https://picsum.photos/id/1025/400/200",
//   default: "https://picsum.photos/400/200?random=1",
//   summaryPolicies: "https://imgs.search.brave.com/kb8jKp7rpMx0bJzmC0e1lFZLJ2F_WP6F_bQA-4ivaeg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90My5m/dGNkbi5uZXQvanBn/LzA1LzI2Lzg5LzA2/LzM2MF9GXzUyNjg5/MDYwMV83QTB5cEZq/SnR6NXFTdVdXQ0pI/NWtib29TSVVOTjRG/Ri5qcGc",
//   summaryPayments: "https://imgs.search.brave.com/SEf7CfO_yim-JHPf-K8rFlVUC1M-aVYewoRmcGQHOys/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTcy/MjY3Mzk4L3Bob3Rv/L21vbmV5LWJhZy5q/cGc_cz02MTJ4NjEy/Jnc9MCZrPTIwJmM9/TDg1QktiSkFpbk43/TGY5b0NsbEFNZ2NO/clAyWEphTWJPdC02/eE1jT0V3ND0",
//   summaryInvoices: "https://imgs.search.brave.com/ma-9fDkYIKg5bPJJwkn0mfq2arU4A_049ve_dBSMU08/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90NC5m/dGNkbi5uZXQvanBn/LzA1LzQ0LzgyLzM5/LzM2MF9GXzU0NDgy/MzkxOF9SNTZSYWJ2/ZFlGU1A4ZVRHWGMx/SjhwRE10WDZmQ0N6/Qi5qcGc",
// };

// function getPolicyIconAndImage(policyName = "") {
//   const lower = policyName.toLowerCase();
//   if (lower.includes("home"))
//     return { icon: <HomeIcon />, image: IMAGE_URLS.home };
//   if (lower.includes("auto") || lower.includes("car"))
//     return { icon: <DirectionsCarIcon />, image: IMAGE_URLS.auto };
//   if (lower.includes("business") || lower.includes("commercial"))
//     return { icon: <BusinessIcon />, image: IMAGE_URLS.business };
//   if (lower.includes("health") || lower.includes("medical"))
//     return { icon: <FavoriteIcon />, image: IMAGE_URLS.health };
//   if (lower.includes("travel") || lower.includes("trip"))
//     return { icon: <FlightIcon />, image: IMAGE_URLS.travel };
//   if (lower.includes("life")) return { icon: <PeopleIcon />, image: IMAGE_URLS.life };
//   return { icon: <PolicyIcon />, image: IMAGE_URLS.default };
// }

// function StatCard({ title, count, color, icon, image }) {
//   return (
//     <Card
//       sx={{
//         width: 320,
//         borderRadius: 3,
//         boxShadow: 4,
//         overflow: "hidden",
//         bgcolor: "#fff",
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         transition: "transform 0.2s",
//         "&:hover": { transform: "translateY(-3px)", boxShadow: 7 },
//       }}
//     >
//       <Box component="img" src={image} alt={title} sx={{ width: "100%", height: 140, objectFit: "cover" }} />
//       <Avatar
//         sx={{
//           bgcolor: color,
//           width: 64,
//           height: 64,
//           mt: -4,
//           mb: 2,
//           borderRadius: 2,
//           boxShadow: 3,
//         }}
//       >
//         {icon}
//       </Avatar>
//       <CardContent sx={{ textAlign: "center", pt: 0, pb: 3, px: 3, flexGrow: 1 }}>
//         <Typography variant="h4" sx={{ color, fontWeight: 700, mb: 1 }}>
//           {count}
//         </Typography>
//         <Typography variant="subtitle1" sx={{ color: "#333", fontWeight: 600 }}>
//           {title}
//         </Typography>
//       </CardContent>
//     </Card>
//   );
// }

// export default function CustomerDashboard({ user }) {
//   const theme = useTheme();
//   const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
//   const customerId = user?.id;

//   const [policies, setPolicies] = useState([]);
//   const [payments, setPayments] = useState([]);
//   const [unpaidInvoices, setUnpaidInvoices] = useState([]);
//   const [customer, setCustomer] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Helper: get Policy Names from policy IDs for invoices
//   const enrichInvoicesWithPolicyNames = (invoices, policiesList) => {
//     return invoices.map((invoice) => {
//       let ids = [];
//       if (Array.isArray(invoice.policyIds)) {
//         ids = invoice.policyIds;
//       } else if (invoice.policyId) {
//         ids = [invoice.policyId];
//       }
//       ids = [...new Set(ids)]; // deduplicate

//       const names = ids
//         .map((id) => {
//           const p = policiesList.find((pol) => String(pol.id) === String(id));
//           return p ? p.name : "Unknown Policy";
//         })
//         .filter((name) => !!name);
//       return {
//         ...invoice,
//         policyNames: names.length > 0 ? names.join(", ") : "No Associated Policies",
//       };
//     });
//   };

//   // Enrich payments with policy names like in CustomerPaymentHistory
//   useEffect(() => {
//     if (!customerId) {
//       setLoading(false);
//       return;
//     }
//     setLoading(true);

//     Promise.all([
//       axios.get(`${API_BASE_URL}/policies/owned/${customerId}`),
//       axios.get(`${API_BASE_URL}/payments/history/${customerId}`),
//       axios.get(`${API_BASE_URL}/invoices/unpaid/${customerId}`),
//       axios.get(`${API_BASE_URL}/${customerId}`),
//     ])
//       .then(async ([policyRes, paymentRes, invoiceRes, customerRes]) => {
//         const policiesList = Array.isArray(policyRes.data) ? policyRes.data : [];
//         const invoicesList = Array.isArray(invoiceRes.data) ? invoiceRes.data : [];
//         setPolicies(policiesList);
//         setUnpaidInvoices(enrichInvoicesWithPolicyNames(invoicesList, policiesList)); // <-- enrich here
//         setCustomer(customerRes.data);

//         const paymentsRaw = Array.isArray(paymentRes.data) ? paymentRes.data : [];

//         const enrichedPayments = await Promise.all(
//           paymentsRaw.map(async (payment) => {
//             let policyNames = "N/A";

//             if (payment.invoiceId) {
//               try {
//                 const { data: invoice } = await axios.get(`${API_BASE_URL}/invoices/${payment.invoiceId}`);
//                 const policyIds = invoice?.policyIds || [];

//                 if (policyIds.length > 0) {
//                   try {
//                     const { data: policyNamesArray } = await axios.post(`${API_BASE_URL}/policies/names`, policyIds);
//                     policyNames = Array.isArray(policyNamesArray) ? policyNamesArray.join(", ") : "N/A";
//                   } catch (error) {
//                     console.error("Error fetching policy names:", error);
//                     policyNames = "Error fetching policy names";
//                   }
//                 } else {
//                   policyNames = "No Policies Associated";
//                 }
//               } catch (error) {
//                 console.error("Error fetching invoice:", error);
//                 policyNames = "Error fetching invoice";
//               }
//             } else if (payment.policyNames && Array.isArray(payment.policyNames) && payment.policyNames.length > 0) {
//               policyNames = payment.policyNames.join(", ");
//             } else {
//               policyNames = "No Invoice / Policies";
//             }

//             return {
//               ...payment,
//               policyNames,
//             };
//           })
//         );

//         setPayments(enrichedPayments);
//       })
//       .catch((err) => {
//         console.error("Error loading dashboard data:", err);
//       })
//       .finally(() => setLoading(false));
//   }, [customerId]);

//   if (loading) {
//     return (
//       <Box
//         sx={{
//           minHeight: "80vh",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           flexDirection: "column",
//           gap: 2,
//         }}
//       >
//         <CircularProgress size={60} sx={{ color: "#667eea" }} />
//         <Typography variant="h6" color="text.secondary">
//           Loading your dashboard...
//         </Typography>
//       </Box>
//     );
//   }

//   const displayName = user?.name || customer?.name || "User";
//   const displayEmail = user?.email || customer?.email || "N/A";
//   const displayID = user?.id || customer?.id || "N/A";
//   const displayRole = (user?.role || customer?.role || "customer").toLowerCase();

//   const statCards = [
//     {
//       title: "Owned Policies",
//       count: policies.length,
//       color: "#1976d2",
//       icon: <PolicyIcon sx={{ fontSize: 36, color: "#fff" }} />,
//       image: IMAGE_URLS.summaryPolicies,
//     },
//     {
//       title: "Total Payments",
//       count: payments.length,
//       color: "#43a047",
//       icon: <PaymentIcon sx={{ fontSize: 36, color: "#fff" }} />,
//       image: IMAGE_URLS.summaryPayments,
//     },
//     {
//       title: "Unpaid Invoices",
//       count: unpaidInvoices.length,
//       color: "#e53935",
//       icon: <ErrorOutlineIcon sx={{ fontSize: 36, color: "#fff" }} />,
//       image: IMAGE_URLS.summaryInvoices,
//     },
//   ];

//   return (
//     <Container maxWidth="lg" sx={{ py: 4 }}>
//       {/* Header Card */}
//       <Card
//         sx={{
//           mb: 5,
//           borderRadius: 4,
//           boxShadow: 5,
//           overflow: "hidden",
//           bgcolor: "white",
//           px: { xs: 2, sm: 4 },
//           py: { xs: 3, sm: 4 },
//           display: "flex",
//           flexDirection: { xs: "column", sm: "row" },
//           alignItems: { xs: "flex-start", sm: "center" },
//           gap: { xs: 2, sm: 4 },
//         }}
//       >
//         <Avatar
//           sx={{
//             width: 80,
//             height: 80,
//             bgcolor: "#1976d2",
//             fontWeight: 700,
//             fontSize: 36,
//             mr: { sm: 2 },
//           }}
//           alt={displayName}
//         >
//           {displayName.charAt(0).toUpperCase()}
//         </Avatar>
//         <Box>
//           <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: theme.palette.primary.main }}>
//             Welcome, {displayName}!
//           </Typography>
//           <Typography variant="h6" sx={{ mb: 1, color: theme.palette.text.secondary }}>
//             {displayRole.charAt(0).toUpperCase() + displayRole.slice(1)} Dashboard Overview
//           </Typography>
//           <Box sx={{ mt: 1 }}>
//             <Typography variant="body1" sx={{ mb: 0.5 }}>
//               {displayEmail}
//             </Typography>
//             <Typography variant="body2" color="text.secondary">
//               ID: <b>{displayID}</b> | Role: {displayRole}
//             </Typography>
//           </Box>
//         </Box>
//       </Card>

//       {/* Summary Stat Cards */}
//       <Grid container spacing={4} justifyContent="center" sx={{ mb: 3 }}>
//         {statCards.map((card) => (
//           <Grid item xs={12} sm={6} md={4} key={card.title} display="flex" justifyContent="center">
//             <StatCard {...card} />
//           </Grid>
//         ))}
//       </Grid>

//       {/* Your Policies */}
//       <Box mt={7}>
//         <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: "center", color: theme.palette.primary.dark }}>
//           Your Policies
//         </Typography>
//         <Divider sx={{ mb: 4, borderBottomWidth: 2 }} />
//         {policies.length === 0 ? (
//           <Typography variant="h6" color="text.secondary" align="center">
//             You don't currently own any policies.
//           </Typography>
//         ) : (
//           <Grid container spacing={4} justifyContent="center">
//             {policies.map((policy, idx) => {
//               const { icon, image } = getPolicyIconAndImage(policy.name || policy.policyName || "");
//               return (
//                 <Grid item xs={12} sm={6} md={4} lg={3} key={policy.id || policy._id || idx} display="flex" justifyContent="center">
//                   <Card
//                     sx={{
//                       width: 320,
//                       borderRadius: 3,
//                       boxShadow: 3,
//                       overflow: "hidden",
//                       bgcolor: "#fff",
//                       display: "flex",
//                       flexDirection: "column",
//                       alignItems: "center",
//                     }}
//                   >
//                     <CardMedia component="img" height={140} image={image} alt="Policy image" />
//                     <Avatar
//                       sx={{
//                         bgcolor: theme.palette.primary.main,
//                         width: 62,
//                         height: 62,
//                         mt: -4,
//                         mb: 2,
//                         borderRadius: 1.5,
//                         boxShadow: 3,
//                       }}
//                     >
//                       {icon}
//                     </Avatar>
//                     <CardContent sx={{ textAlign: "center", p: 2 }}>
//                       <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
//                         {policy.name || policy.policyName || "Unnamed Policy"}
//                       </Typography>
//                       {policy.description && (
//                         <Tooltip title={policy.description}>
//                           <Typography
//                             variant="body2"
//                             color="text.secondary"
//                             sx={{
//                               overflow: "hidden",
//                               textOverflow: "ellipsis",
//                               display: "-webkit-box",
//                               WebkitLineClamp: 2,
//                               WebkitBoxOrient: "vertical",
//                               mb: 1,
//                             }}
//                           >
//                             {policy.description}
//                           </Typography>
//                         </Tooltip>
//                       )}
//                       <Typography variant="subtitle1" color="text.primary" sx={{ mb: 0.5, fontWeight: 600 }}>
//                         Premium: ₹{policy.monthlyPremium ?? policy.premium ?? "N/A"}
//                       </Typography>
//                       {policy.status && (
//                         <Chip
//                           label={policy.status.toUpperCase()}
//                           size="small"
//                           color={policy.status === "active" ? "success" : "warning"}
//                         />
//                       )}
//                     </CardContent>
//                   </Card>
//                 </Grid>
//               );
//             })}
//           </Grid>
//         )}
//       </Box>

//       {/* Recent Payments */}
//       <Box mt={8}>
//         <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: "center", color: theme.palette.primary.dark }}>
//           Recent Payments
//         </Typography>
//         <Divider sx={{ mb: 4, borderBottomWidth: 2 }} />
//         {payments.length === 0 ? (
//           <Typography variant="h6" color="text.secondary" align="center">
//             No recent payments found.
//           </Typography>
//         ) : (
//           payments.slice(0, 5).map((payment, idx) => (
//             <Card
//               key={payment.id || payment._id || idx}
//               sx={{
//                 display: "flex",
//                 alignItems: "center",
//                 padding: 2,
//                 mb: 3,
//                 boxShadow: 3,
//                 borderRadius: 3,
//               }}
//             >
//               <Avatar sx={{ bgcolor: "#43a047", width: 62, height: 62, mr: 3 }}>
//                 <CheckCircleOutlineIcon sx={{ fontSize: 36, color: "#fff" }} />
//               </Avatar>
//               <Box flex={1}>
//                 <Typography variant="h6" fontWeight={700}>
//                   {payment.policyNames || "Policy"}
//                 </Typography>
//                 <Typography variant="subtitle1" color="text.secondary">
//                   Amount Paid: ₹{payment.amount}
//                 </Typography>
//                 {payment.paidAt && (
//                   <Typography variant="caption" color="text.secondary">
//                     Date: {new Date(payment.paidAt).toLocaleDateString()}
//                   </Typography>
//                 )}
//               </Box>
//               <Chip
//                 label={(payment.status || "COMPLETED").toUpperCase()}
//                 size="small"
//                 color={
//                   payment.status === "completed" || payment.status === "paid"
//                     ? "success"
//                     : payment.status === "pending"
//                     ? "warning"
//                     : payment.status === "failed"
//                     ? "error"
//                     : "default"
//                 }
//                 sx={{ fontWeight: 600 }}
//               />
//             </Card>
//           ))
//         )}
//       </Box>

//       {/* Unpaid Invoices */}
//       <Box mt={8} mb={8}>
//         <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: "center", color: theme.palette.primary.dark }}>
//           Unpaid Invoices
//         </Typography>
//         <Divider sx={{ mb: 4, borderBottomWidth: 2 }} />
//         {unpaidInvoices.length === 0 ? (
//           <Typography variant="h6" color="text.secondary" align="center">
//             You have no outstanding invoices.
//           </Typography>
//         ) : (
//           unpaidInvoices.map((invoice, idx) => (
//             <Card
//               key={invoice.id || invoice._id || idx}
//               sx={{
//                 display: "flex",
//                 alignItems: "center",
//                 padding: 2,
//                 mb: 3,
//                 boxShadow: 3,
//                 borderRadius: 3,
//                 border: `1px solid ${theme.palette.error.light}`,
//               }}
//             >
//               <Avatar sx={{ bgcolor: "#e53935", width: 62, height: 62, mr: 3 }}>
//                 <WarningAmberIcon sx={{ fontSize: 36, color: "#fff" }} />
//               </Avatar>
//               <Box flex={1}>
//                 <Typography variant="h6" fontWeight={700}>
//                   {invoice.policyNames || "No Associated Policies"}
//                 </Typography>
//                 <Typography variant="subtitle1" color="text.secondary">
//                   Amount Due: ₹{invoice.amount}
//                 </Typography>
//                 {invoice.dueDate && (
//                   <Typography variant="caption" color="text.secondary">
//                     Due Date: {new Date(invoice.dueDate).toLocaleDateString()}
//                   </Typography>
//                 )}
//               </Box>
//               <Chip label="UNPAID" size="small" color="error" sx={{ fontWeight: 600 }} />
//             </Card>
//           ))
//         )}
//       </Box>
//     </Container>
//   );
// }
