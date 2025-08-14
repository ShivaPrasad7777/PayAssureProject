// src/components/customers/CustomerPolicies.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, CircularProgress, Alert, Paper,
  Button, Select, MenuItem, FormControl, InputLabel, Snackbar,
  useTheme
} from '@mui/material';
import { green, red } from '@mui/material/colors';

// --- The AutoPayToggle component is included here for a complete, runnable example.
const AutoPayToggle = ({ customerId, policyId, amount, maxMonths, initialEnabled, initialSubscriptionId }) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [subscriptionId, setSubscriptionId] = useState(initialSubscriptionId || '');
  const [months, setMonths] = useState(1); // Default to 1 month
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Sync state with props on mount (for initial values)
  useEffect(() => {
    setEnabled(initialEnabled);
    setSubscriptionId(initialSubscriptionId || '');
  }, [initialEnabled, initialSubscriptionId]);

  // Generate month options up to maxMonths
  const monthOptions = Array.from({ length: maxMonths }, (_, i) => i + 1);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      if (enabled) {
        // API call to disable auto pay
        await axios.post('http://localhost:9999/api/customer/autopay/disable', { customerId, subscriptionId, policyId });
        setEnabled(false);
        setSubscriptionId('');
        setSnackbarMessage(`Auto Pay for Policy ${policyId} has been disabled.`);
      } else {
        // API call to enable auto pay with selected months
        const response = await axios.post(`http://localhost:9999/api/customer/autopay/enable/policy/${policyId}`, {
          customerId,
          months,
          amount,
        });
        const extractedId = response.data.includes('Subscription ID: ')
          ? response.data.split('Subscription ID: ')[1]
          : response.data;
        setSubscriptionId(extractedId);
        setEnabled(true);
        setSnackbarMessage(`Auto Pay for Policy ${policyId} has been enabled for ${months} month(s).`);
      }
    } catch (err) {
      console.error('Error toggling auto pay:', err);
      // Fallback error message if the response doesn't have a data property
      setError(err.response?.data?.message || 'Error toggling auto pay. Please try again.');
    }
    setLoading(false);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
      {!enabled && maxMonths > 0 && (
        <FormControl fullWidth size="small">
          <InputLabel>Months (Max {maxMonths})</InputLabel>
          <Select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            label={`Months (Max ${maxMonths})`}
            disabled={loading}
          >
            {monthOptions.map(opt => (
              <MenuItem key={opt} value={opt}>{opt} Month{opt > 1 ? 's' : ''}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      <Button
        onClick={handleToggle}
        disabled={loading || maxMonths === 0}
        variant="contained"
        color={enabled ? "error" : "primary"}
        sx={{
          mt: !enabled && maxMonths > 0 ? 0 : 2,
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          '&:hover': {
            boxShadow: '0 6px 8px rgba(0,0,0,0.3)',
          }
        }}
      >
        {loading ? 'Processing...' : (enabled ? 'Disable Auto Pay' : 'Enable Auto Pay')}
      </Button>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {maxMonths === 0 && <Typography variant="body2" color="text.secondary">No remaining months.</Typography>}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
// --- End of AutoPayToggle component ---


export default function CustomerPolicies({ user }) {
  const theme = useTheme();
  const [policies, setPolicies] = useState([]);
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      setError("");

      const fetchData = async () => {
        try {
          // Fetch policies and customer data concurrently using the provided endpoints
          const [policiesResponse, customerDataResponse] = await Promise.all([
            axios.get(`http://localhost:9999/api/customer/policies/owned/${user.id}`),
            axios.get(`http://localhost:9999/api/customer/${user.id}`),
          ]);
          setPolicies(policiesResponse.data);
          setCustomerData(customerDataResponse.data);
        } catch (err) {
          setError("Error fetching data. Please try again.");
          console.error(err);
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

  // Calculate remaining UNPAID months for a policy
  const calculateRemainingMonths = (policy) => {
    if (!customerData || !customerData.paymentHistory) return policy.durationMonths;
    const historyEntry = customerData.paymentHistory.find(entry => entry.policyId === policy.id);
    if (!historyEntry || !historyEntry.validUpto) return policy.durationMonths;

    const today = new Date();
    const validUpto = new Date(historyEntry.validUpto);
    const createdAt = new Date(policy.createdAt);

    let paidMonths =
      (validUpto.getFullYear() - createdAt.getFullYear()) * 12 +
      (validUpto.getMonth() - createdAt.getMonth()) + 1;

    let remaining = policy.durationMonths - paidMonths;

    if (validUpto < today) {
      const monthsPassed =
        (today.getFullYear() - createdAt.getFullYear()) * 12 +
        (today.getMonth() - createdAt.getMonth());
      remaining = policy.durationMonths - monthsPassed;
    } else if (
      today.getMonth() === validUpto.getMonth() &&
      today.getFullYear() === validUpto.getFullYear()
    ) {
      remaining -= 1;
    }

    return Math.max(remaining, 0);
  };

  // Get initial enabled status and subscriptionId for a policy
  const getInitialAutoPayState = (policyId) => {
    if (!customerData || !customerData.paymentHistory) return { enabled: false, subscriptionId: '' };
    const entry = customerData.paymentHistory.find(e => e.policyId === policyId);
    const enabled = entry?.status === 'paidByAutopayActive';
    const subscriptionId = entry?.razorpaySubscriptionId || '';
    return { enabled, subscriptionId };
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
      {/* Header with new gradient matching the reference */}
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
          Your Owned Policies
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1000, mx: "auto", display: 'flex', flexDirection: 'column', gap: 3 }}>
        {policies.length === 0 ? (
          <Typography color="text.secondary" align="center">No policies found.</Typography>
        ) : (
          policies.map((policy) => {
            const remainingMonths = calculateRemainingMonths(policy);
            const { enabled: initialEnabled, subscriptionId: initialSubscriptionId } = getInitialAutoPayState(policy.id);

            return (
              <Paper key={policy.id} elevation={4} sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'white', // Using a clean white background for the cards
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
                    {policy.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly Premium: ₹{policy.monthlyPremium}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>Duration</Typography>
                    <Typography variant="body1">{policy.durationMonths} Months</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>Remaining</Typography>
                    <Typography variant="body1">{remainingMonths} Months</Typography>
                  </Box>
                  <Box>
                    <AutoPayToggle
                      customerId={user.id}
                      policyId={policy.id}
                      amount={policy.monthlyPremium}
                      maxMonths={remainingMonths}
                      initialEnabled={initialEnabled}
                      initialSubscriptionId={initialSubscriptionId}
                    />
                  </Box>
                </Box>
              </Paper>
            );
          })
        )}
      </Box>
    </Box>
  );
}











//Autopay
// // src/components/customers/CustomerPolicies.jsx
// // Updated remaining months calculation to exclude already paid months

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert } from '@mui/material';
// import AutoPayToggle from './AutoPayToggle'; // Import the toggle

// export default function CustomerPolicies({ user }) {
//   const [policies, setPolicies] = useState([]);
//   const [customerData, setCustomerData] = useState(null); // Full customer data including paymentHistory
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     if (user?.id) {
//       setLoading(true);
//       // Fetch owned policies
//       axios.get(`http://localhost:9999/api/customer/policies/owned/${user.id}`)
//         .then(res => setPolicies(res.data))
//         .catch(err => setError("Error fetching policies: " + (err.response?.data?.message || err.message)));

//       // Fetch full customer data for paymentHistory and status
//       axios.get(`http://localhost:9999/api/customer/${user.id}`)
//         .then(res => setCustomerData(res.data))
//         .catch(err => setError("Error fetching customer data: " + (err.response?.data?.message || err.message)))
//         .finally(() => setLoading(false));
//     } else {
//       setError("User ID not available. Please log in again.");
//       setLoading(false);
//     }
//   }, [user?.id]);

//   // Updated: Calculate remaining UNPAID months for a policy (exclude already paid periods)
//   const calculateRemainingMonths = (policy) => {
//     if (!customerData || !customerData.paymentHistory) return policy.durationMonths; // Default to full duration if no history

//     const historyEntry = customerData.paymentHistory.find(entry => entry.policyId === policy.id);
//     if (!historyEntry || !historyEntry.validUpto) return policy.durationMonths; // No payments, full remaining

//     const today = new Date();
//     const validUpto = new Date(historyEntry.validUpto);
//     const createdAt = new Date(policy.createdAt);

//     // Calculate total months paid (from createdAt to validUpto)
//     const paidMonths = (validUpto.getFullYear() - createdAt.getFullYear()) * 12 +
//                        (validUpto.getMonth() - createdAt.getMonth()) + 1; // +1 to include the last month

//     // Remaining unpaid months
//     let remaining = policy.durationMonths - paidMonths;

//     // If validUpto is in the past or today is after validUpto, remaining is full duration minus passed months
//     if (validUpto < today) {
//       const monthsPassed = (today.getFullYear() - createdAt.getFullYear()) * 12 +
//                            (today.getMonth() - createdAt.getMonth());
//       remaining = policy.durationMonths - monthsPassed;
//     } else if (today.getMonth() === validUpto.getMonth() && today.getFullYear() === validUpto.getFullYear()) {
//       // Current month is paid; start auto-pay from next month, so don't include current in options
//       remaining -= 1; // Exclude current paid month
//     }

//     return Math.max(remaining, 0); // No negative, min 0
//   };

//   // Get initial enabled status and subscriptionId from paymentHistory (from previous updates)
//   const getInitialAutoPayState = (policyId) => {
//     if (!customerData || !customerData.paymentHistory) return { enabled: false, subscriptionId: '' };

//     const historyEntry = customerData.paymentHistory.find(entry => entry.policyId === policyId);
//     const enabled = historyEntry?.status === 'paidByAutopayActive';
//     const subscriptionId = historyEntry?.razorpaySubscriptionId || ''; // Assuming this field exists

//     return { enabled, subscriptionId };
//   };

//   if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
//   if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

//   return (
//     <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
//       <Typography variant="h5" gutterBottom sx={{ mb: 3, textAlign: "center" }}>
//         Your Owned Policies
//       </Typography>
//       {policies.length === 0 ? (
//         <Typography>No policies found.</Typography>
//       ) : (
//         <TableContainer>
//           <Table>
//             <TableHead>
//               <TableRow>
//                 <TableCell>Policy Name</TableCell>
//                 <TableCell>Monthly Premium</TableCell>
//                 <TableCell>Duration (Months)</TableCell>
//                 <TableCell>Remaining Unpaid Months</TableCell>
//                 <TableCell>Auto Pay</TableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {policies.map((policy) => {
//                 const remainingMonths = calculateRemainingMonths(policy);
//                 const { enabled: initialEnabled, subscriptionId: initialSubscriptionId } = getInitialAutoPayState(policy.id);
//                 return (
//                   <TableRow key={policy.id}>
//                     <TableCell>{policy.name}</TableCell>
//                     <TableCell>{policy.monthlyPremium}</TableCell>
//                     <TableCell>{policy.durationMonths}</TableCell>
//                     <TableCell>{remainingMonths}</TableCell>
//                     <TableCell>
//                       <AutoPayToggle 
//                         customerId={user.id} 
//                         policyId={policy.id} 
//                         amount={policy.monthlyPremium} 
//                         maxMonths={remainingMonths} 
//                         initialEnabled={initialEnabled}
//                         initialSubscriptionId={initialSubscriptionId}
//                       />
//                     </TableCell>
//                   </TableRow>
//                 );
//               })}
//             </TableBody>
//           </Table>
//         </TableContainer>
//       )}
//     </Box>
//   );
// }
 







// // src/components/customers/CustomerPolicies.jsx
// // New page for viewing owned policies with per-policy auto pay toggle
// // Fetches policies and history; calculates remaining months for month selection limit

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert } from '@mui/material';
// import AutoPayToggle from './AutoPayToggle'; // Import the updated toggle below

// export default function CustomerPolicies({ user }) {
//   const [policies, setPolicies] = useState([]);
//   const [paymentHistory, setPaymentHistory] = useState([]); // Customer's payment history for calculations
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     if (user?.id) {
//       setLoading(true);
//       // Fetch owned policies
//       axios.get(`http://localhost:9999/api/customer/policies/owned/${user.id}`)
//         .then(res => setPolicies(res.data))
//         .catch(err => setError("Error fetching policies: " + (err.response?.data?.message || err.message)));

//       // Fetch payment history for remaining months calculation
//       axios.get(`http://localhost:9999/api/customer/payments/history/${user.id}`)
//         .then(res => setPaymentHistory(res.data))
//         .catch(err => console.error("Error fetching payment history", err))
//         .finally(() => setLoading(false));
//     } else {
//       setError("User ID not available. Please log in again.");
//       setLoading(false);
//     }
//   }, [user?.id]);

//   // Calculate remaining months for a policy
//   const calculateRemainingMonths = (policy) => {
//     const historyEntry = paymentHistory.find(entry => entry.policyId === policy.id);
//     if (!historyEntry || !historyEntry.validUpto) return policy.durationMonths; // Default to full duration

//     const today = new Date();
//     const validUpto = new Date(historyEntry.validUpto);
//     const createdAt = new Date(policy.createdAt);

//     // Calculate months passed
//     const monthsPassed = (today.getFullYear() - createdAt.getFullYear()) * 12 + (today.getMonth() - createdAt.getMonth());
//     let remaining = policy.durationMonths - monthsPassed;

//     // If current month is paid, allow including it in auto pay options
//     if (today.getMonth() === validUpto.getMonth() && today.getFullYear() === validUpto.getFullYear()) {
//       remaining += 1; // Include current month
//     }

//     return Math.max(remaining, 0); // No negative
//   };

//   if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
//   if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

//   return (
//     <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
//       <Typography variant="h5" gutterBottom sx={{ mb: 3, textAlign: "center" }}>
//         Your Owned Policies
//       </Typography>
//       {policies.length === 0 ? (
//         <Typography>No policies found.</Typography>
//       ) : (
//         <TableContainer>
//           <Table>
//             <TableHead>
//               <TableRow>
//                 <TableCell>Policy Name</TableCell>
//                 <TableCell>Monthly Premium</TableCell>
//                 <TableCell>Duration (Months)</TableCell>
//                 <TableCell>Remaining Months</TableCell>
//                 <TableCell>Auto Pay</TableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {policies.map((policy) => {
//                 const remainingMonths = calculateRemainingMonths(policy);
//                 return (
//                   <TableRow key={policy.id}>
//                     <TableCell>{policy.name}</TableCell>
//                     <TableCell>{policy.monthlyPremium}</TableCell>
//                     <TableCell>{policy.durationMonths}</TableCell>
//                     <TableCell>{remainingMonths}</TableCell>
//                     <TableCell>
//                       <AutoPayToggle 
//                         customerId={user.id} 
//                         policyId={policy.id} 
//                         amount={policy.monthlyPremium} 
//                         maxMonths={remainingMonths} 
//                         initialEnabled={false} // Adjust if you store per-policy enabled status
//                       />
//                     </TableCell>
//                   </TableRow>
//                 );
//               })}
//             </TableBody>
//           </Table>
//         </TableContainer>
//       )}
//     </Box>
//   );
// }
