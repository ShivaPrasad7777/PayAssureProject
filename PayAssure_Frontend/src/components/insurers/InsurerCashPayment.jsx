import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Paper, Divider, TextField, InputAdornment, useTheme,
  Snackbar, Alert, Checkbox, IconButton
} from '@mui/material';
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import { green, red } from '@mui/material/colors';

// A debounce hook to limit the frequency of API calls on search input
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

export default function InsurerCashPayment({ user }) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null); // Changed to an object
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 400);

  // Search customers based on the debounced search query
  useEffect(() => {
    if (debouncedSearch && debouncedSearch.length > 0) {
      setLoading(true);
      // Simulate API call for searching customers
      axios.get(`http://localhost:9999/api/insurer/customers/search?name=${debouncedSearch}`)
        .then(response => {
          const norm = Array.isArray(response.data) ? response.data.map(c => ({
            id: c.id || c._id,
            name: c.name,
          })) : [];
          setCustomers(norm);
        })
        .catch(error => setErrorMessage('Error searching customers: ' + error.message))
        .finally(() => setLoading(false));
    } else {
      setCustomers([]);
    }
  }, [debouncedSearch]);

  // Fetch invoices for the selected customer
  useEffect(() => {
    if (selectedCustomer) {
      setLoading(true);
      // Simulate API call to get invoices for a customer
      axios.get(`http://localhost:9999/api/insurer/customers/${selectedCustomer.id}/unpaid-failed-invoices`)
        .then(response => setInvoices(response.data || []))
        .catch(error => setErrorMessage('Error fetching invoices: ' + error.message))
        .finally(() => setLoading(false));
      setSelectedInvoices([]); // Reset selected invoices
    }
  }, [selectedCustomer]);

  // Handle invoice checkbox
  const handleInvoiceChange = (invoiceId) => {
    setSelectedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  // Calculate total amount for selected invoices
  const handleCalculateTotal = () => {
    setErrorMessage('');
    if (!selectedCustomer || selectedInvoices.length === 0) {
      setErrorMessage('Please select a customer and at least one invoice.');
      return;
    }
    const sel = invoices.filter(inv => selectedInvoices.includes(inv.id || inv._id));
    setTotalAmount(sel.reduce((sum, inv) => sum + (inv.amount || 0), 0));
    setDialogOpen(true);
  };

  // Confirm cash payment and show snackbar notification
  const handleConfirmCashPayment = () => {
    if (selectedInvoices.length === 0) {
      setErrorMessage('No invoices selected for payment.');
      setDialogOpen(false);
      return;
    }

    setLoading(true);
    axios.post(
      'http://localhost:9999/api/insurer/invoices/pay-by-cash',
      { invoiceIds: selectedInvoices },
      { headers: { 'Content-Type': 'application/json' } }
    )
      .then(() => {
        setDialogOpen(false);
        resetForm();
        setSnackbarMessage('Cash payment processed successfully for selected invoices!');
        setSnackbarOpen(true);
      })
      .catch(error => {
        setErrorMessage('Error processing cash payment: ' + (error.response?.data || error.message));
      })
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setSearchQuery('');
    setCustomers([]);
    setSelectedCustomer(null);
    setSelectedInvoices([]);
    setErrorMessage('');
    setInvoices([]);
    setTotalAmount(0);
    setDialogOpen(false);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setSearchQuery(''); // Clear search query after selection
    setCustomers([]); // Clear search results
  };

  return (
    <Box sx={{ py: 4, px: { xs: 2, sm: 4 }, minHeight: "100vh", bgcolor: '#f0f2f5' }}>
      {/* Updated Header with new gradient */}
      <Box
        sx={{
          py: 2, /* Decreased vertical padding */
          px: 2,
          mb: 4,
          background: 'linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)',
          color: 'white',
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
          Cash Payment
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 900, mx: "auto" }}>
        <Paper
          elevation={4}
          sx={{
            width: "100%",
            borderRadius: 2,
            p: { xs: 2, md: 4 },
          }}
        >
          {/* Customer Search Section */}
          {!selectedCustomer && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Find Customer
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Search customer by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="primary" />
                    </InputAdornment>
                  )
                }}
              />
              {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress size={24} /></Box>}
              {customers.length > 0 && (
                <Box sx={{ my: 2 }}>
                  {customers.map((customer) => (
                    <Button
                      key={customer.id}
                      variant="outlined"
                      fullWidth
                      onClick={() => handleCustomerSelect(customer)}
                      sx={{ mb: 1, textTransform: 'none', justifyContent: 'flex-start' }}
                      startIcon={<PersonIcon />}
                    >
                      {customer.name}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Selected Customer & Invoices Section */}
          {selectedCustomer && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Selected Customer
              </Typography>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: theme.palette.background.default,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <PersonIcon sx={{ color: theme.palette.primary.main }} />
                <Typography variant="body1" sx={{ flexGrow: 1 }}>
                  {selectedCustomer.name}
                </Typography>
                <Button onClick={resetForm} color="secondary" size="small">
                  Change
                </Button>
              </Paper>

              <Divider sx={{ mb: 3 }} />

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Unpaid/Failed Invoices
              </Typography>
              <Box>
                {loading && <CircularProgress size={24} />}
                {!loading && invoices.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No unpaid or failed invoices found.</Typography>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {invoices.map((invoice) => (
                    <Paper
                      key={invoice.id || invoice._id}
                      elevation={1}
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                        bgcolor: selectedInvoices.includes(invoice.id || invoice._id) ? '#e3f2fd' : 'white',
                      }}
                    >
                      <Checkbox
                        checked={selectedInvoices.includes(invoice.id || invoice._id)}
                        onChange={() => handleInvoiceChange(invoice.id || invoice._id)}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          Invoice ID: {invoice.id || invoice._id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Policies: {invoice.policyIds?.join(', ') || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Status: <Box component="span" sx={{ fontWeight: 'bold', color: invoice.status === 'Paid' ? green[600] : red[600] }}>{invoice.status}</Box>
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                          ₹{invoice.amount}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Box>
            </Box>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleCalculateTotal}
            disabled={loading || !selectedCustomer || selectedInvoices.length === 0}
            fullWidth
            size="large"
            sx={{ mt: 3, py: 1.5, textTransform: 'none', fontWeight: 'bold', fontSize: '1.1rem' }}
          >
            Calculate Total
          </Button>

          {errorMessage && (
            <Typography sx={{ mt: 2, color: 'error.main', textAlign: 'center' }}>
              {errorMessage}
            </Typography>
          )}
        </Paper>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          color: 'white',
          textAlign: "center"
        }}>
          Confirm Cash Payment
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="h6" align="center" sx={{ mb: 2 }}>
            Total Amount: ₹{totalAmount.toFixed(2)}
          </Typography>
          <Typography align="center" color="text.secondary">
            Confirm that the customer has paid ₹{totalAmount.toFixed(2)} in cash for the selected invoices.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="secondary" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmCashPayment}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Loading Spinner */}
      {loading && <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}><CircularProgress /></Box>}

      {/* Snackbar Notification */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}




















// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import {
//   Box, Typography, Select, MenuItem, FormControl, InputLabel, Button,
//   FormControlLabel, Checkbox, FormGroup, CircularProgress, Dialog, DialogActions,
//   DialogContent, DialogTitle, Paper, TextField, InputAdornment, useTheme
// } from '@mui/material';
// import SearchIcon from "@mui/icons-material/Search";

// // Debounce hook
// function useDebounce(value, delay = 400) {
//   const [debounced, setDebounced] = useState(value);
//   useEffect(() => {
//     const handler = setTimeout(() => setDebounced(value), delay);
//     return () => clearTimeout(handler);
//   }, [value, delay]);
//   return debounced;
// }

// export default function InsurerCashPayment({ user }) {
//   const theme = useTheme();
//   const [searchQuery, setSearchQuery] = useState('');
//   const [customers, setCustomers] = useState([]);
//   const [selectedCustomer, setSelectedCustomer] = useState('');
//   const [invoices, setInvoices] = useState([]);
//   const [selectedInvoices, setSelectedInvoices] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [totalAmount, setTotalAmount] = useState(0);

//   const debouncedSearch = useDebounce(searchQuery, 400);

//   // Search customers (debounced)
//   useEffect(() => {
//     if (debouncedSearch && debouncedSearch.length > 0) {
//       setLoading(true);
//       axios.get(`http://localhost:9999/api/insurer/customers/search?name=${debouncedSearch}`)
//         .then(response => {
//           // Normalize to 'id'/'name'
//           const norm = Array.isArray(response.data) ? response.data.map(c => ({
//             id: c.id || c._id,
//             name: c.name,
//           })) : [];
//           setCustomers(norm);
//         })
//         .catch(error => setErrorMessage('Error searching customers: ' + error.message))
//         .finally(() => setLoading(false));
//     } else {
//       setCustomers([]);
//     }
//   }, [debouncedSearch]);

//   // Fetch invoices for selected customer
//   useEffect(() => {
//     if (selectedCustomer) {
//       setLoading(true);
//       axios.get(`http://localhost:9999/api/insurer/customers/${selectedCustomer}/unpaid-failed-invoices`)
//         .then(response => setInvoices(response.data || []))
//         .catch(error => setErrorMessage('Error fetching invoices: ' + error.message))
//         .finally(() => setLoading(false));
//       setSelectedInvoices([]); // Reset
//     }
//   }, [selectedCustomer]);

//   // Handle invoice checkbox
//   const handleInvoiceChange = (invoiceId) => {
//     setSelectedInvoices(prev =>
//       prev.includes(invoiceId)
//         ? prev.filter(id => id !== invoiceId)
//         : [...prev, invoiceId]
//     );
//   };

//   // Calculate total
//   const handleCalculateTotal = () => {
//     setErrorMessage('');
//     if (!selectedCustomer || selectedInvoices.length === 0) {
//       setErrorMessage('Please select a customer and at least one invoice.');
//       return;
//     }
//     const sel = invoices.filter(inv => selectedInvoices.includes(inv.id || inv._id));
//     setTotalAmount(sel.reduce((sum, inv) => sum + (inv.amount || 0), 0));
//     setDialogOpen(true);
//   };

//   // Confirm cash payment
//   const handleConfirmCashPayment = () => {
//     setLoading(true);
//     axios.post(
//       'http://localhost:9999/api/insurer/invoices/pay-by-cash',
//       { invoiceIds: selectedInvoices }
//     )
//       .then(() => {
//         setDialogOpen(false);
//         resetForm();
//         alert('Cash payment processed successfully for selected invoices!');
//       })
//       .catch(error => setErrorMessage('Error processing cash payment: ' + (error.response?.data || error.message)))
//       .finally(() => setLoading(false));
//   };

//   const resetForm = () => {
//     setSelectedCustomer('');
//     setSelectedInvoices([]);
//     setErrorMessage('');
//     setInvoices([]);
//     setTotalAmount(0);
//     setDialogOpen(false);
//   };

//   return (
//     <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, minHeight: "100vh" }}>
//       <Typography variant="h4" gutterBottom align="center">Cash Payment</Typography>
//       <Box sx={{ maxWidth: 800, mx: "auto" }}>
//         <Paper
//           elevation={0}
//           sx={{
//             width: "100%",
//             overflow: "hidden",
//             borderRadius: 2,
//             border: `1px solid ${theme.palette.divider}`,
//             bgcolor: theme.palette.background.paper,
//             p: 3,
//           }}
//         >
//           {/* Customer Search */}
//           <TextField
//             fullWidth
//             size="small"
//             placeholder="Search customer by name..."
//             value={searchQuery}
//             onChange={e => setSearchQuery(e.target.value)}
//             sx={{ mb: 3 }}
//             InputProps={{
//               startAdornment: (
//                 <InputAdornment position="start">
//                   <SearchIcon color="primary" />
//                 </InputAdornment>
//               )
//             }}
//           />
//           {customers.length > 0 && (
//             <FormControl fullWidth sx={{ mb: 3 }}>
//               <InputLabel>Select Customer</InputLabel>
//               <Select
//                 value={selectedCustomer}
//                 onChange={e => setSelectedCustomer(e.target.value)}
//                 variant="outlined"
//                 MenuProps={{ PaperProps: { style: { maxHeight: 240 } } }}
//               >
//                 {customers.map((customer) => (
//                   <MenuItem key={customer.id} value={customer.id}>{customer.name}</MenuItem>
//                 ))}
//               </Select>
//             </FormControl>
//           )}

//           {/* Invoices */}
//           {selectedCustomer && (
//             <FormGroup sx={{ mb: 3 }}>
//               <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
//                 Unpaid/Failed Invoices
//               </Typography>
//               {loading && <Typography variant="body2">Loading invoices...</Typography>}
//               {!loading && invoices.length === 0 && <Typography variant="body2" color="textSecondary">No unpaid or failed invoices found.</Typography>}
//               {invoices.map((invoice) => (
//                 <FormControlLabel
//                   key={invoice.id || invoice._id}
//                   control={
//                     <Checkbox
//                       checked={selectedInvoices.includes(invoice.id || invoice._id)}
//                       onChange={() => handleInvoiceChange(invoice.id || invoice._id)}
//                       color="primary"
//                     />
//                   }
//                   label={`Invoice ID: ${invoice.id || invoice._id} - Amount: ₹${invoice.amount} (Status: ${invoice.status}, Policies: ${invoice.policyIds?.join(', ') || 'N/A'})`}
//                 />
//               ))}
//             </FormGroup>
//           )}

//           <Button
//             variant="contained"
//             color="primary"
//             onClick={handleCalculateTotal}
//             disabled={loading}
//             fullWidth
//             size="large"
//           >
//             Calculate Total
//           </Button>

//           {errorMessage && (
//             <Typography sx={{ mt: 2, color: 'error.main', textAlign: 'center' }}>
//               {errorMessage}
//             </Typography>
//           )}
//         </Paper>
//       </Box>

//       {/* Confirmation Dialog */}
//       <Dialog open={dialogOpen} onClose={resetForm} maxWidth="sm" fullWidth>
//         <DialogTitle sx={{
//           background: theme.palette.primary.main,
//           color: theme.palette.primary.contrastText,
//           textAlign: "center"
//         }}>
//           Confirm Cash Payment
//         </DialogTitle>
//         <DialogContent>
//           <Typography variant="h6" align="center" sx={{ mb: 2 }}>
//             Total Amount: ₹{totalAmount}
//           </Typography>
//           <Typography align="center">
//             Confirm that the customer has paid ₹{totalAmount} in cash for the selected invoices.
//           </Typography>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={resetForm} color="secondary">Cancel</Button>
//           <Button onClick={handleConfirmCashPayment} variant="contained" color="primary">Confirm Payment</Button>
//         </DialogActions>
//       </Dialog>

//       {loading && <CircularProgress sx={{ position: 'fixed', top: '50%', left: '50%' }} />}

//     </Box>
//   );
// }
// src/components/insurers/InsurerCashPayment.jsx










//basic version
// src/components/insurers/InsurerCashPayment.jsx
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import {
//   Box, Typography, Select, MenuItem, FormControl, InputLabel, Button,
//   FormControlLabel, Checkbox, FormGroup, CircularProgress, Dialog, DialogActions,
//   DialogContent, DialogTitle, Paper, Divider, TextField, InputAdornment, useTheme
// } from '@mui/material';
// import SearchIcon from "@mui/icons-material/Search";

// // Debounce hook (unchanged)
// function useDebounce(value, delay = 400) {
//   const [debounced, setDebounced] = useState(value);
//   useEffect(() => {
//     const handler = setTimeout(() => setDebounced(value), delay);
//     return () => clearTimeout(handler);
//   }, [value, delay]);
//   return debounced;
// }

// export default function InsurerCashPayment({ user }) {
//   const theme = useTheme();
//   const [searchQuery, setSearchQuery] = useState('');
//   const [customers, setCustomers] = useState([]);
//   const [selectedCustomer, setSelectedCustomer] = useState('');
//   const [invoices, setInvoices] = useState([]);
//   const [selectedInvoices, setSelectedInvoices] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [totalAmount, setTotalAmount] = useState(0);

//   const debouncedSearch = useDebounce(searchQuery, 400);

//   // Search customers (debounced) - unchanged
//   useEffect(() => {
//     if (debouncedSearch && debouncedSearch.length > 0) {
//       setLoading(true);
//       axios.get(`http://localhost:9999/api/insurer/customers/search?name=${debouncedSearch}`)
//         .then(response => {
//           const norm = Array.isArray(response.data) ? response.data.map(c => ({
//             id: c.id || c._id,
//             name: c.name,
//           })) : [];
//           setCustomers(norm);
//         })
//         .catch(error => setErrorMessage('Error searching customers: ' + error.message))
//         .finally(() => setLoading(false));
//     } else {
//       setCustomers([]);
//     }
//   }, [debouncedSearch]);

//   // Fetch invoices for selected customer - unchanged
//   useEffect(() => {
//     if (selectedCustomer) {
//       setLoading(true);
//       axios.get(`http://localhost:9999/api/insurer/customers/${selectedCustomer}/unpaid-failed-invoices`)
//         .then(response => setInvoices(response.data || []))
//         .catch(error => setErrorMessage('Error fetching invoices: ' + error.message))
//         .finally(() => setLoading(false));
//       setSelectedInvoices([]); // Reset
//     }
//   }, [selectedCustomer]);

//   // Handle invoice checkbox - unchanged
//   const handleInvoiceChange = (invoiceId) => {
//     setSelectedInvoices(prev =>
//       prev.includes(invoiceId)
//         ? prev.filter(id => id !== invoiceId)
//         : [...prev, invoiceId]
//     );
//   };

//   // Calculate total - unchanged
//   const handleCalculateTotal = () => {
//     setErrorMessage('');
//     if (!selectedCustomer || selectedInvoices.length === 0) {
//       setErrorMessage('Please select a customer and at least one invoice.');
//       return;
//     }
//     const sel = invoices.filter(inv => selectedInvoices.includes(inv.id || inv._id));
//     setTotalAmount(sel.reduce((sum, inv) => sum + (inv.amount || 0), 0));
//     setDialogOpen(true);
//   };

//   // Confirm cash payment - FIXED with validation, logging, and headers
//   const handleConfirmCashPayment = () => {
//     if (selectedInvoices.length === 0) {
//       setErrorMessage('No invoices selected for payment.');
//       setDialogOpen(false);
//       return;
//     }

//     console.log('Sending payment for invoiceIds:', selectedInvoices);  // Debug log

//     setLoading(true);
//     axios.post(
//       'http://localhost:9999/api/insurer/invoices/pay-by-cash',
//       { invoiceIds: selectedInvoices },
//       { headers: { 'Content-Type': 'application/json' } }  // Explicit header to avoid 400
//     )
//       .then(() => {
//         setDialogOpen(false);
//         resetForm();
//         alert('Cash payment processed successfully for selected invoices!');
//       })
//       .catch(error => {
//         console.error('Payment error:', error.response);  // Debug log
//         setErrorMessage('Error processing cash payment: ' + (error.response?.data || error.message));
//       })
//       .finally(() => setLoading(false));
//   };

//   const resetForm = () => {
//     setSelectedCustomer('');
//     setSelectedInvoices([]);
//     setErrorMessage('');
//     setInvoices([]);
//     setTotalAmount(0);
//     setDialogOpen(false);
//   };

//   return (
//     <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, minHeight: "100vh" }}>
//       <Typography variant="h4" gutterBottom align="center">Cash Payment</Typography>
//       <Box sx={{ maxWidth: 800, mx: "auto" }}>
//         <Paper
//           elevation={0}
//           sx={{
//             width: "100%",
//             overflow: "hidden",
//             borderRadius: 2,
//             border: `1px solid ${theme.palette.divider}`,
//             bgcolor: theme.palette.background.paper,
//             p: 3,
//           }}
//         >
//           {/* Customer Search */}
//           <TextField
//             fullWidth
//             size="small"
//             placeholder="Search customer by name..."
//             value={searchQuery}
//             onChange={e => setSearchQuery(e.target.value)}
//             sx={{ mb: 3 }}
//             InputProps={{
//               startAdornment: (
//                 <InputAdornment position="start">
//                   <SearchIcon color="primary" />
//                 </InputAdornment>
//               )
//             }}
//           />
//           {customers.length > 0 && (
//             <FormControl fullWidth sx={{ mb: 3 }}>
//               <InputLabel>Select Customer</InputLabel>
//               <Select
//                 value={selectedCustomer}
//                 onChange={e => {
//                   setSelectedCustomer(e.target.value);
//                   setSelectedInvoices([]);
//                   setTotalAmount(0);
//                   setErrorMessage('');
//                   setDialogOpen(false);
//                 }}
//                 variant="outlined"
//                 MenuProps={{ PaperProps: { style: { maxHeight: 240 } } }}
//               >
//                 {customers.map((customer) => (
//                   <MenuItem key={customer.id} value={customer.id}>{customer.name}</MenuItem>
//                 ))}
//               </Select>
//             </FormControl>
//           )}

//           {/* Invoices */}
//           {selectedCustomer && (
//             <FormGroup sx={{ mb: 3 }}>
//               <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
//                 Unpaid/Failed Invoices
//               </Typography>
//               {loading && <Typography variant="body2">Loading invoices...</Typography>}
//               {!loading && invoices.length === 0 && <Typography variant="body2" color="textSecondary">No unpaid or failed invoices found.</Typography>}
//               {invoices.map((invoice) => (
//                 <FormControlLabel
//                   key={invoice.id || invoice._id}
//                   control={
//                     <Checkbox
//                       checked={selectedInvoices.includes(invoice.id || invoice._id)}
//                       onChange={() => handleInvoiceChange(invoice.id || invoice._id)}
//                       color="primary"
//                     />
//                   }
//                   label={`Invoice ID: ${invoice.id || invoice._id} - Amount: ₹${invoice.amount} (Status: ${invoice.status}, Policies: ${invoice.policyIds?.join(', ') || 'N/A'})`}
//                 />
//               ))}
//             </FormGroup>
//           )}

//           <Button
//             variant="contained"
//             color="primary"
//             onClick={handleCalculateTotal}
//             disabled={loading}
//             fullWidth
//             size="large"
//           >
//             Calculate Total
//           </Button>

//           {errorMessage && (
//             <Typography sx={{ mt: 2, color: 'error.main', textAlign: 'center' }}>
//               {errorMessage}
//             </Typography>
//           )}
//         </Paper>
//       </Box>

//       {/* Confirmation Dialog */}
//       <Dialog open={dialogOpen} onClose={resetForm} maxWidth="sm" fullWidth>
//         <DialogTitle sx={{
//           background: theme.palette.primary.main,
//           color: theme.palette.primary.contrastText,
//           textAlign: "center"
//         }}>
//           Confirm Cash Payment
//         </DialogTitle>
//         <DialogContent>
//           <Typography variant="h6" align="center" sx={{ mb: 2 }}>
//             Total Amount: ₹{totalAmount}
//           </Typography>
//           <Typography align="center">
//             Confirm that the customer has paid ₹{totalAmount} in cash for the selected invoices.
//           </Typography>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={resetForm} color="secondary">Cancel</Button>
//           <Button onClick={handleConfirmCashPayment} variant="contained" color="primary">Confirm Payment</Button>
//         </DialogActions>
//       </Dialog>

//       {loading && <CircularProgress sx={{ position: 'fixed', top: '50%', left: '50%' }} />}

//     </Box>
//   );
// }
