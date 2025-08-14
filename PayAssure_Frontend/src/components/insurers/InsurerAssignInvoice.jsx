import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Select, MenuItem, FormControl, Button,
  CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Paper, Divider, Chip, useTheme, List, ListItem, ListItemText, alpha,
  TablePagination, TextField
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import SearchIcon from '@mui/icons-material/Search';

export default function InsurerAssignInvoice({ user }) {
  const theme = useTheme();

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [selectedPolicies, setSelectedPolicies] = useState([]);
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  // Pagination for customers
  const [customerPage, setCustomerPage] = useState(0);
  const [customerRowsPerPage, setCustomerRowsPerPage] = useState(5);

  // Pagination for policies
  const [policyPage, setPolicyPage] = useState(0);
  const [policyRowsPerPage, setPolicyRowsPerPage] = useState(5);

  // Fetch unpaid customers on mount
  useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:9999/api/insurer/customers/unpaid')
      .then(response => {
        setCustomers(response.data);
        setFilteredCustomers(response.data);
      })
      .catch(error => setErrorMessage('Error fetching customers: ' + error.message))
      .finally(() => setLoading(false));
  }, []);

  // Filter customers based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredCustomers(
        customers.filter(customer =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredCustomers(customers);
    }
    setCustomerPage(0); // Reset page on search change
  }, [searchQuery, customers]);

  // Fetch unpaid policies for selected customer
  useEffect(() => {
    if (selectedCustomer) {
      setLoading(true);
      axios.get(`http://localhost:9999/api/insurer/customers/${selectedCustomer.id}/unpaid-policies`)
        .then(response => {
          setPolicies(response.data);
          setSelectedPolicies([]);
          setPolicyPage(0);
        })
        .catch(error => {
          setErrorMessage('Error fetching unpaid policies: ' + (error.response?.status === 404 ? 'Resource not found.' : error.message));
          setPolicies([]);
          setSelectedPolicies([]);
        })
        .finally(() => setLoading(false));
    } else {
      setPolicies([]);
      setSelectedPolicies([]);
    }
  }, [selectedCustomer]);

  // Handle user selecting/deselecting policies
  const handlePolicyChange = (policyId) => {
    setSelectedPolicies(prev =>
      prev.includes(policyId) ? prev.filter(id => id !== policyId) : [...prev, policyId]
    );
  };

  // Get policy name by ID helper
  const getPolicyName = (policyId) => {
    const policy = policies.find(p => p.id === policyId);
    return policy ? policy.name : `Policy ID: ${policyId}`;
  };

  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setPolicyPage(0); // Reset policy pagination when customer changes
    setErrorMessage(''); // Clear any errors on new selection
  };

  // Pagination handlers for customers
  const handleCustomerPageChange = (event, newPage) => {
    setCustomerPage(newPage);
  };

  const handleCustomerRowsPerPageChange = (event) => {
    setCustomerRowsPerPage(parseInt(event.target.value, 10));
    setCustomerPage(0);
  };

  // Pagination handlers for policies
  const handlePolicyPageChange = (event, newPage) => {
    setPolicyPage(newPage);
  };

  const handlePolicyRowsPerPageChange = (event) => {
    setPolicyRowsPerPage(parseInt(event.target.value, 10));
    setPolicyPage(0);
  };

  // Generate invoice handler
  const handleGenerateInvoice = () => {
    if (!selectedCustomer || selectedPolicies.length === 0 || !months) {
      setErrorMessage('Please select a customer, at least one policy, and number of months.');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    const invoicePayload = {
      customerId: selectedCustomer.id,
      policyIds: selectedPolicies,
      insurerId: user?.id || 'default-insurer',
      validUpto: null,
      months,
    };

    axios.post('http://localhost:9999/api/insurer/invoices', invoicePayload)
      .then(response => {
        setInvoiceData(response.data);
        setDialogOpen(true);
      })
      .catch(error => setErrorMessage('Error: ' + (error.response?.data?.message || error.message)))
      .finally(() => setLoading(false));
  };

  // Reset form and dialog
  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedPolicies([]);
    setMonths(1);
    setErrorMessage('');
    setInvoiceData(null);
    setDialogOpen(false);
    setSearchQuery('');
    setCustomerPage(0);

    // Refresh customers
    setLoading(true);
    axios.get('http://localhost:9999/api/insurer/customers/unpaid')
      .then(response => {
        setCustomers(response.data);
        setFilteredCustomers(response.data);
      })
      .catch(error => setErrorMessage('Error fetching customers: ' + error.message))
      .finally(() => setLoading(false));
  };

  if (loading && (!customers.length || (selectedCustomer && !policies.length))) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress size={60} thickness={4} color="primary" />
        <Typography variant="h6" sx={{ ml: 2, color: theme.palette.text.secondary }}>Loading data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 }, minHeight: "100vh", bgcolor: alpha(theme.palette.background.default, 0.9) }}>
      <Box
        sx={{
          background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
          color: 'white',
          borderRadius: 2,
          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
          p: 3,
          mb: 4,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, letterSpacing: 0.5, userSelect: 'none' }}
        >
          Assign Policy Invoice
        </Typography>
      </Box>

      <Box sx={{
        maxWidth: 800,
        mx: "auto",
        bgcolor: theme.palette.background.paper,
        borderRadius: 3,
        boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.08)}`,
        p: { xs: 3, sm: 5 },
        border: `1px solid ${alpha(theme.palette.divider, 0.15)}`
      }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1.5, color: theme.palette.text.primary }}>
          Select Customer with Unpaid Policies
        </Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            label="Search Customer by Name"
            variant="outlined"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
              ),
            }}
            sx={{ borderRadius: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            autoComplete="off"
          />
        </FormControl>

        <Paper variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
          <List dense>
            {filteredCustomers.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No customers found."
                  sx={{ textAlign: 'center', fontStyle: 'italic', color: 'text.secondary' }}
                />
              </ListItem>
            ) : (
              filteredCustomers
                .slice(customerPage * customerRowsPerPage, customerPage * customerRowsPerPage + customerRowsPerPage)
                .map(customer => (
                  <ListItem
                    key={customer.id}
                    button
                    onClick={() => handleCustomerSelect(customer)}
                    sx={{
                      bgcolor: selectedCustomer?.id === customer.id ? alpha(theme.palette.primary.light, 0.1) : 'inherit',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.light, 0.1) },
                      borderRadius: 2,
                      mx: 1,
                      my: 0.5
                    }}
                  >
                    <ListItemText
                      primary={customer.name}
                      secondary={customer.email ? `(${customer.email})` : ''}
                      primaryTypographyProps={{ fontWeight: 500 }}
                      secondaryTypographyProps={{ fontStyle: 'italic', color: 'text.secondary' }}
                    />
                  </ListItem>
                ))
            )}
          </List>

          <TablePagination
            component="div"
            count={filteredCustomers.length}
            page={customerPage}
            onPageChange={handleCustomerPageChange}
            rowsPerPage={customerRowsPerPage}
            onRowsPerPageChange={handleCustomerRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </Paper>

        {selectedCustomer && (
          <>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
              Select Unpaid Policies for {selectedCustomer.name}
            </Typography>

            {policies.length === 0 ? (
              <Typography color="text.secondary" sx={{ fontStyle: 'italic', p: 1 }}>
                No unpaid policies found for this customer.
              </Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {policies
                    .slice(policyPage * policyRowsPerPage, policyPage * policyRowsPerPage + policyRowsPerPage)
                    .map(policy => {
                      const isSelected = selectedPolicies.includes(policy.id);
                      return (
                        <Paper
                          key={policy.id}
                          variant="outlined"
                          onClick={() => handlePolicyChange(policy.id)}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            borderColor: isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.3),
                            bgcolor: isSelected ? alpha(theme.palette.primary.light, 0.1) : theme.palette.background.default,
                            boxShadow: isSelected
                              ? `0 4px 15px ${alpha(theme.palette.primary.main, 0.2)}`
                              : `0 2px 8px ${alpha(theme.palette.common.black, 0.05)}`,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': { boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.15)}` },
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                              {policy.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Policy ID: {policy.id}
                            </Typography>
                          </Box>
                          <Box sx={{ flexShrink: 0 }}>
                            {isSelected ? (
                              <CheckCircleIcon color="primary" sx={{ fontSize: 24 }} />
                            ) : (
                              <RadioButtonUncheckedIcon sx={{ color: theme.palette.text.disabled, fontSize: 24 }} />
                            )}
                          </Box>
                        </Paper>
                      );
                    })}
                </Box>

                <TablePagination
                  component="div"
                  count={policies.length}
                  page={policyPage}
                  onPageChange={handlePolicyPageChange}
                  rowsPerPage={policyRowsPerPage}
                  onRowsPerPageChange={handlePolicyRowsPerPageChange}
                  rowsPerPageOptions={[5, 10, 25]}
                  sx={{ mt: 2 }}
                />
              </>
            )}
            <Divider sx={{ my: 4 }} />
          </>
        )}

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1.5, color: theme.palette.text.primary }}>
          Select Months for Premium Payment
        </Typography>

        <FormControl fullWidth sx={{ mb: 4 }}>
          <Select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value, 10))}
            inputProps={{ 'aria-label': 'Select Months' }}
            sx={{
              bgcolor: theme.palette.background.paper,
              boxShadow: `0 2px 10px ${alpha(theme.palette.primary.main, 0.05)}`,
              borderRadius: 2,
              '.MuiOutlinedInput-notchedOutline': { borderColor: alpha(theme.palette.divider, 0.2) },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.dark, borderWidth: '2px' },
            }}
          >
            <MenuItem value={1}>1 Month</MenuItem>
            <MenuItem value={3}>3 Months</MenuItem>
            <MenuItem value={6}>6 Months</MenuItem>
            <MenuItem value={12}>12 Months</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained"
          color="primary"
          onClick={handleGenerateInvoice}
          disabled={loading || !selectedCustomer || selectedPolicies.length === 0}
          fullWidth
          size="large"
          sx={{
            py: 1.8,
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 2,
            boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': { boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.45)}` },
          }}
        >
          {loading ? 'Generating...' : 'Generate Invoice'}
        </Button>

        {errorMessage && (
          <Typography
            sx={{ mt: 3, color: 'error.main', textAlign: 'center', fontWeight: 600 }}
            role="alert"
            aria-live="assertive"
          >
            {errorMessage}
          </Typography>
        )}
      </Box>

      {/* Invoice Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={resetForm}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.3)}`,
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          }
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)`,
            color: '#475569',
            textAlign: 'center',
            py: 3,
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          Invoice Generated Successfully!
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 4 }, pt: 3, pb: 2, fontFamily: 'Roboto, sans-serif' }}>
          {invoiceData ? (
            <List disablePadding>
              <ListItem sx={{ py: 1 }}>
                <ListItemText
                  primary="Status"
                  secondary={
                    <Chip
                      label={invoiceData.status.toUpperCase()}
                      color={invoiceData.status.toLowerCase() === 'paid' ? 'success' : 'warning'}
                      sx={{ fontWeight: 'bold' }}
                    />
                  }
                  primaryTypographyProps={{ fontWeight: 600, color: 'text.primary' }}
                />
              </ListItem>
              <Divider component="li" />

              {Object.entries({
                "Invoice ID": invoiceData.id,
                "Customer ID": invoiceData.customerId,
                "Insurer ID": invoiceData.insurerId,
                "Amount": `₹${Number(invoiceData.amount).toLocaleString()}`,
                "Valid Upto": invoiceData.validUpto ? new Date(invoiceData.validUpto).toLocaleString() : 'N/A',
                "Months": invoiceData.months,
                "Razorpay Order ID": invoiceData.razorpayOrderId || 'N/A',
                "Created At": invoiceData.createdAt ? new Date(invoiceData.createdAt).toLocaleString() : 'N/A',
              }).map(([label, value]) => (
                <React.Fragment key={label}>
                  <ListItem sx={{ py: 1 }}>
                    <ListItemText
                      primary={label}
                      secondary={typeof value === 'string' ? value : String(value)}
                      primaryTypographyProps={{ fontWeight: 600, color: 'text.primary' }}
                      secondaryTypographyProps={{ color: 'text.secondary' }}
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}

              <ListItem sx={{ py: 1 }}>
                <ListItemText
                  primary="Payment Link"
                  secondary="N/A"
                  primaryTypographyProps={{ fontWeight: 600, color: 'text.primary' }}
                  secondaryTypographyProps={{ color: 'text.secondary', fontStyle: 'italic' }}
                />
              </ListItem>
              <Divider component="li" />

              <ListItem sx={{ py: 1 }}>
                <ListItemText
                  primary="Policies"
                  secondary={invoiceData.policyIds ? invoiceData.policyIds.map(id => getPolicyName(id)).join(', ') : 'N/A'}
                  primaryTypographyProps={{ fontWeight: 600, color: 'text.primary' }}
                  secondaryTypographyProps={{ color: 'text.secondary' }}
                />
              </ListItem>
              <Divider component="li" />
            </List>
          ) : (
            <Typography variant="body1" color="text.secondary" align="center">
              No invoice data to display.
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 4 }, pb: { xs: 2, sm: 3 }, pt: 1 }}>
          <Button
            onClick={resetForm}
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            sx={{
              borderRadius: 3,
              fontWeight: 700,
              textTransform: 'none',
              px: 5,
              py: 1.5,
              boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': { boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.45)}` },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}



//basic version
// // src/components/insurers/InsurerAssignInvoice.jsx
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import {
//   Box, Typography, Select, MenuItem, FormControl, InputLabel, Button,
//   FormControlLabel, Checkbox, FormGroup, CircularProgress, Dialog, DialogActions,
//   DialogContent, DialogTitle, Paper, Divider, Link, Chip, useTheme, List, ListItem, ListItemText
// } from '@mui/material';

// export default function InsurerAssignInvoice({ user }) {  // Assume user prop with insurerId if needed
//   const theme = useTheme();
//   const [customers, setCustomers] = useState([]);
//   const [selectedCustomer, setSelectedCustomer] = useState('');
//   const [policies, setPolicies] = useState([]);
//   const [selectedPolicies, setSelectedPolicies] = useState([]);
//   const [months, setMonths] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [invoiceData, setInvoiceData] = useState(null);

//   // Fetch unpaid customers from backend
//   useEffect(() => {
//     setLoading(true);
//     axios.get('http://localhost:9999/api/insurer/customers/unpaid')
//       .then(response => setCustomers(response.data))
//       .catch(error => setErrorMessage('Error fetching customers: ' + error.message))
//       .finally(() => setLoading(false));
//   }, []);

//   // Fetch unpaid policies for selected customer from backend
//   useEffect(() => {
//     if (selectedCustomer) {
//       setLoading(true);
//       axios.get(`http://localhost:9999/api/insurer/customers/${selectedCustomer}/unpaid-policies`)
//         .then(response => setPolicies(response.data))
//         .catch(error => setErrorMessage('Error fetching policies: ' + error.message))
//         .finally(() => setLoading(false));
//       setSelectedPolicies([]);  // Reset selections
//     }
//   }, [selectedCustomer]);

//   // Handle policy checkbox selection
//   const handlePolicyChange = (policyId) => {
//     setSelectedPolicies((prev) =>
//       prev.includes(policyId) ? prev.filter(id => id !== policyId) : [...prev, policyId]
//     );
//   };

//   // Generate invoice
//   const handleGenerateInvoice = () => {
//     if (!selectedCustomer || selectedPolicies.length === 0 || !months) {
//       setErrorMessage('Please select a customer, at least one policy, and months.');
//       return;
//     }

//     setLoading(true);
//     setErrorMessage('');

//     const invoicePayload = {
//       customerId: selectedCustomer,
//       policyIds: selectedPolicies,
//       insurerId: user?.id || 'default-insurer',  // Use from user prop
//       validUpto: null,  // Backend auto-calculates (Renamed from dueDate)
//       months,
//     };

//     axios.post('http://localhost:9999/api/insurer/invoices', invoicePayload)
//       .then(response => {
//         setInvoiceData(response.data);
//         setDialogOpen(true);
//       })
//       .catch(error => setErrorMessage('Error: ' + (error.response?.data || error.message)))
//       .finally(() => setLoading(false));
//   };

//   // Reset form to initial state
//   const resetForm = () => {
//     setSelectedCustomer('');
//     setSelectedPolicies([]);
//     setMonths(1);
//     setErrorMessage('');
//     setInvoiceData(null);
//     setDialogOpen(false);
//   };

//   // Function to get policy name by ID
//   const getPolicyName = (policyId) => {
//     const policy = policies.find(p => p.id === policyId);
//     return policy ? policy.name : 'Unknown';
//   };

//   if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto' }} />;

//   return (
//     <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, minHeight: "100vh" }}>
//       <Typography variant="h4" gutterBottom align="center">Assign Invoice</Typography>
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
//           {/* Customer Dropdown */}
//           <FormControl fullWidth sx={{ mb: 3 }}>
//             <InputLabel>Select Customer with Unpaid Premiums</InputLabel>
//             <Select
//               value={selectedCustomer}
//               onChange={(e) => setSelectedCustomer(e.target.value)}
//               variant="outlined"
//             >
//               {customers.map((customer) => (
//                 <MenuItem key={customer.id} value={customer.id}>
//                   {customer.name}
//                 </MenuItem>
//               ))}
//             </Select>
//           </FormControl>

//           {/* Policies Checkboxes */}
//           {selectedCustomer && (
//             <FormGroup sx={{ mb: 3 }}>
//               <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
//                 Unpaid Policies
//               </Typography>
//               {policies.map((policy) => (
//                 <FormControlLabel
//                   key={policy.id}
//                   control={
//                     <Checkbox
//                       checked={selectedPolicies.includes(policy.id)}
//                       onChange={() => handlePolicyChange(policy.id)}
//                       color="primary"
//                     />
//                   }
//                   label={policy.name}
//                 />
//               ))}
//             </FormGroup>
//           )}

//           {/* Months Dropdown */}
//           <FormControl fullWidth sx={{ mb: 3 }}>
//             <InputLabel>Select Months</InputLabel>
//             <Select
//               value={months}
//               onChange={(e) => setMonths(e.target.value)}
//               variant="outlined"
//             >
//               <MenuItem value={1}>1 Month</MenuItem>
//               <MenuItem value={3}>3 Months</MenuItem>
//               <MenuItem value={6}>6 Months</MenuItem>
//               <MenuItem value={12}>12 Months</MenuItem>
//             </Select>
//           </FormControl>

//           {/* Generate Button */}
//           <Button 
//             variant="contained" 
//             color="primary"
//             onClick={handleGenerateInvoice} 
//             disabled={loading} 
//             fullWidth 
//             size="large"
//           >
//             {loading ? 'Generating...' : 'Generate Invoice'}
//           </Button>

//           {/* Error Message */}
//           {errorMessage && <Typography sx={{ mt: 2, color: 'error.main', textAlign: 'center' }}>{errorMessage}</Typography>}
//         </Paper>
//       </Box>

//       {/* Invoice Details Dialog */}
//       <Dialog open={dialogOpen} onClose={resetForm} maxWidth="md" fullWidth>
//         <DialogTitle sx={{
//           background: theme.palette.primary.main,
//           color: theme.palette.primary.contrastText,
//           textAlign: "center"
//         }}>
//           Invoice Generated Successfully!
//         </DialogTitle>
//         <DialogContent>
//           {invoiceData && (
//             <List disablePadding>
//               <ListItem>
//                 <ListItemText 
//                   primary="Status" 
//                   secondary={<Chip label={invoiceData.status.toUpperCase()} color="success" sx={{ fontWeight: 'bold' }} />} 
//                 />
//               </ListItem>
//               <Divider />
//               {Object.entries({
//                 "Invoice ID": invoiceData.id,
//                 "Customer ID": invoiceData.customerId,
//                 "Insurer ID": invoiceData.insurerId,
//                 "Amount": "₹" + invoiceData.amount,
//                 "Valid Upto": new Date(invoiceData.validUpto).toLocaleString(),
//                 "Months": invoiceData.months,
//                 "Payment Link": <Link href={invoiceData.paymentLink} target="_blank" rel="noopener">{invoiceData.paymentLink}</Link>,
//                 "Razorpay Order ID": invoiceData.razorpayOrderId,
//                 "Created At": new Date(invoiceData.createdAt).toLocaleString(),
//               }).map(([label, value]) => (
//                 <React.Fragment key={label}>
//                   <ListItem>
//                     <ListItemText primary={label} secondary={value} />
//                   </ListItem>
//                   <Divider />
//                 </React.Fragment>
//               ))}
//               <ListItem>
//                 <ListItemText 
//                   primary="Policies" 
//                   secondary={invoiceData.policyIds.map(id => getPolicyName(id)).join(', ')} 
//                 />
//               </ListItem>
//               <Divider />
//               <ListItem>
//                 <ListItemText primary="Tax Details" />
//               </ListItem>
//               {invoiceData.taxDetailsList.map((tax, index) => (
//                 <React.Fragment key={index}>
//                   <ListItem>
//                     <ListItemText
//                       secondary={(
//                         <>
//                           <Typography component="span" variant="body2">Policy: {getPolicyName(tax.policyId)}</Typography><br />
//                           <Typography component="span" variant="body2">GST Rate: {tax.gstRate}%</Typography><br />
//                           <Typography component="span" variant="body2">Tax Amount: ₹{tax.taxAmount}</Typography><br />
//                           <Typography component="span" variant="body2">Total Amount: ₹{tax.totalAmount}</Typography>
//                         </>
//                       )}
//                     />
//                   </ListItem>
//                   <Divider />
//                 </React.Fragment>
//               ))}
//             </List>
//           )}
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={resetForm} variant="contained" color="primary">OK</Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// }






// // src/components/insurers/InsurerAssignInvoice.jsx
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import {
//   Box, Typography, Select, MenuItem, FormControl, InputLabel, Button,
//   FormControlLabel, Checkbox, FormGroup, CircularProgress, Dialog, DialogActions,
//   DialogContent, DialogTitle, Card, CardContent, Divider, Link, Chip
// } from '@mui/material';
// import { styled } from '@mui/material/styles';

// const StyledCard = styled(Card)(({ theme }) => ({
//   backgroundColor: theme.palette.background.paper,
//   boxShadow: theme.shadows[5],
//   borderRadius: theme.shape.borderRadius * 2,
//   padding: theme.spacing(2),
//   margin: theme.spacing(2, 0),
// }));

// const SuccessChip = styled(Chip)(({ theme }) => ({
//   backgroundColor: theme.palette.success.main,
//   color: theme.palette.success.contrastText,
//   fontWeight: 'bold',
// }));

// const ErrorChip = styled(Chip)(({ theme }) => ({
//   backgroundColor: theme.palette.error.main,
//   color: theme.palette.error.contrastText,
//   fontWeight: 'bold',
// }));

// export default function InsurerAssignInvoice({ user }) {  // Assume user prop with insurerId if needed
//   const [customers, setCustomers] = useState([]);
//   const [selectedCustomer, setSelectedCustomer] = useState('');
//   const [policies, setPolicies] = useState([]);
//   const [selectedPolicies, setSelectedPolicies] = useState([]);
//   const [months, setMonths] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [invoiceData, setInvoiceData] = useState(null);

//   // Fetch unpaid customers from backend
//   useEffect(() => {
//     setLoading(true);
//     axios.get('http://localhost:9999/api/insurer/customers/unpaid')
//       .then(response => setCustomers(response.data))
//       .catch(error => setErrorMessage('Error fetching customers: ' + error.message))
//       .finally(() => setLoading(false));
//   }, []);

//   // Fetch unpaid policies for selected customer from backend
//   useEffect(() => {
//     if (selectedCustomer) {
//       setLoading(true);
//       axios.get(`http://localhost:9999/api/insurer/customers/${selectedCustomer}/unpaid-policies`)
//         .then(response => setPolicies(response.data))
//         .catch(error => setErrorMessage('Error fetching policies: ' + error.message))
//         .finally(() => setLoading(false));
//       setSelectedPolicies([]);  // Reset selections
//     }
//   }, [selectedCustomer]);

//   // Handle policy checkbox selection
//   const handlePolicyChange = (policyId) => {
//     setSelectedPolicies((prev) =>
//       prev.includes(policyId) ? prev.filter(id => id !== policyId) : [...prev, policyId]
//     );
//   };

//   // Generate invoice
//   const handleGenerateInvoice = () => {
//     if (!selectedCustomer || selectedPolicies.length === 0 || !months) {
//       setErrorMessage('Please select a customer, at least one policy, and months.');
//       return;
//     }

//     setLoading(true);
//     setErrorMessage('');

//     const invoicePayload = {
//       customerId: selectedCustomer,
//       policyIds: selectedPolicies,
//       insurerId: user?.id || 'default-insurer',  // Use from user prop
//       validUpto: null,  // Backend auto-calculates (Renamed from dueDate)
//       months,
//     };

//     axios.post('http://localhost:9999/api/insurer/invoices', invoicePayload)
//       .then(response => {
//         setInvoiceData(response.data);
//         setDialogOpen(true);
//       })
//       .catch(error => setErrorMessage('Error: ' + (error.response?.data || error.message)))
//       .finally(() => setLoading(false));
//   };

//   // Reset form to initial state
//   const resetForm = () => {
//     setSelectedCustomer('');
//     setSelectedPolicies([]);
//     setMonths(1);
//     setErrorMessage('');
//     setInvoiceData(null);
//     setDialogOpen(false);
//   };

//   // Function to get policy name by ID
//   const getPolicyName = (policyId) => {
//     const policy = policies.find(p => p.id === policyId);
//     return policy ? policy.name : 'Unknown';
//   };

//   if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto' }} />;

//   return (
//     <Box sx={{ 
//       p: 4, 
//       maxWidth: '100%', 
//       minHeight: '100vh', 
//       background: '#ffffff', 
//       display: 'flex', 
//       flexDirection: 'column', 
//       alignItems: 'center' 
//     }}>
//       <StyledCard sx={{ width: '100%', maxWidth: 800 }}>
//         <CardContent>
//           <Typography variant="h4" gutterBottom sx={{ color: '#7e57c2', fontWeight: 'bold', textAlign: 'center' }}>
//             Assign Invoice
//           </Typography>

//           {/* Customer Dropdown */}
//           <FormControl fullWidth sx={{ mb: 3 }}>
//             <InputLabel>Select Customer with Unpaid Premiums</InputLabel>
//             <Select
//               value={selectedCustomer}
//               onChange={(e) => setSelectedCustomer(e.target.value)}
//               variant="outlined"
//             >
//               {customers.map((customer) => (
//                 <MenuItem key={customer.id} value={customer.id}>
//                   {customer.name}
//                 </MenuItem>
//               ))}
//             </Select>
//           </FormControl>

//           {/* Policies Checkboxes */}
//           {selectedCustomer && (
//             <FormGroup sx={{ mb: 3 }}>
//               <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
//                 Unpaid Policies
//               </Typography>
//               {policies.map((policy) => (
//                 <FormControlLabel
//                   key={policy.id}
//                   control={
//                     <Checkbox
//                       checked={selectedPolicies.includes(policy.id)}
//                       onChange={() => handlePolicyChange(policy.id)}
//                       color="primary"
//                     />
//                   }
//                   label={policy.name}
//                 />
//               ))}
//             </FormGroup>
//           )}

//           {/* Months Dropdown */}
//           <FormControl fullWidth sx={{ mb: 3 }}>
//             <InputLabel>Select Months</InputLabel>
//             <Select
//               value={months}
//               onChange={(e) => setMonths(e.target.value)}
//               variant="outlined"
//             >
//               <MenuItem value={1}>1 Month</MenuItem>
//               <MenuItem value={3}>3 Months</MenuItem>
//               <MenuItem value={6}>6 Months</MenuItem>
//               <MenuItem value={12}>12 Months</MenuItem>
//             </Select>
//           </FormControl>

//           {/* Generate Button */}
//           <Button 
//             variant="contained" 
//             sx={{ backgroundColor: '#7e57c2', color: 'white', '&:hover': { backgroundColor: '#673ab7' } }} 
//             onClick={handleGenerateInvoice} 
//             disabled={loading} 
//             fullWidth 
//             size="large"
//           >
//             {loading ? 'Generating...' : 'Generate Invoice'}
//           </Button>

//           {/* Error Message */}
//           {errorMessage && <Typography sx={{ mt: 2, color: 'error.main', textAlign: 'center' }}>{errorMessage}</Typography>}
//         </CardContent>
//       </StyledCard>

//       {/* Invoice Details Dialog */}
//       <Dialog open={dialogOpen} onClose={resetForm} maxWidth="sm" fullWidth>
//         <DialogTitle sx={{ backgroundColor: '#7e57c2', color: 'white', textAlign: 'center' }}>
//           Invoice Generated Successfully!
//         </DialogTitle>
//         <DialogContent sx={{ p: 3, backgroundColor: '#f3e5f5' }}>
//           {invoiceData && (
//             <StyledCard>
//               <CardContent>
//                 <SuccessChip label={`Status: ${invoiceData.status.toUpperCase()}`} sx={{ mb: 2, width: '100%' }} />
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Invoice ID:</strong> {invoiceData.id}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Customer ID:</strong> {invoiceData.customerId}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Insurer ID:</strong> {invoiceData.insurerId}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Amount:</strong> ₹{invoiceData.amount}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Valid Upto:</strong> {new Date(invoiceData.validUpto).toLocaleString()}</Typography>  {/* Renamed from Due Date */}
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Months:</strong> {invoiceData.months}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Payment Link:</strong> <Link href={invoiceData.paymentLink} target="_blank" rel="noopener">{invoiceData.paymentLink}</Link></Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Razorpay Order ID:</strong> {invoiceData.razorpayOrderId}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Created At:</strong> {new Date(invoiceData.createdAt).toLocaleString()}</Typography>
//                 <Divider sx={{ my: 2 }} />
//                 <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Tax Details</Typography>
//                 {invoiceData.taxDetailsList.map((tax, index) => (
//                   <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: '#e8eaf6', borderRadius: 1 }}>
//                     <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Policy:</strong> {getPolicyName(tax.policyId)}</Typography>
//                     <Typography variant="body2" sx={{ mb: 0.5 }}><strong>GST Rate:</strong> {tax.gstRate}%</Typography>
//                     <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Tax Amount:</strong> ₹{tax.taxAmount}</Typography>
//                     <Typography variant="body2"><strong>Total Amount:</strong> ₹{tax.totalAmount}</Typography>
//                   </Box>
//                 ))}
//                 <Typography variant="body1" sx={{ mt: 2 }}><strong>Policies:</strong> {invoiceData.policyIds.map(id => getPolicyName(id)).join(', ')}</Typography>
//               </CardContent>
//             </StyledCard>
//           )}
//         </DialogContent>
//         <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
//           <Button onClick={resetForm} variant="contained" sx={{ backgroundColor: '#7e57c2', color: 'white', px: 4, py: 1, '&:hover': { backgroundColor: '#673ab7' } }}>
//             OK
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// }












// //src/components/insurers/InsurerAssignInvoice.jsx
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import {
//   Box, Typography, Select, MenuItem, FormControl, InputLabel, Button,
//   FormControlLabel, Checkbox, FormGroup, CircularProgress, Dialog, DialogActions,
//   DialogContent, DialogTitle, Card, CardContent, Divider, Link, Chip
// } from '@mui/material';
// import { styled } from '@mui/material/styles';

// const StyledCard = styled(Card)(({ theme }) => ({
//   backgroundColor: theme.palette.background.paper,
//   boxShadow: theme.shadows[5],
//   borderRadius: theme.shape.borderRadius * 2,
//   padding: theme.spacing(2),
//   margin: theme.spacing(2, 0),
// }));

// const SuccessChip = styled(Chip)(({ theme }) => ({
//   backgroundColor: theme.palette.success.main,
//   color: theme.palette.success.contrastText,
//   fontWeight: 'bold',
// }));

// const ErrorChip = styled(Chip)(({ theme }) => ({
//   backgroundColor: theme.palette.error.main,
//   color: theme.palette.error.contrastText,
//   fontWeight: 'bold',
// }));

// export default function InsurerAssignInvoice({ user }) {  // Assume user prop with insurerId if needed
//   const [customers, setCustomers] = useState([]);
//   const [selectedCustomer, setSelectedCustomer] = useState('');
//   const [policies, setPolicies] = useState([]);
//   const [selectedPolicies, setSelectedPolicies] = useState([]);
//   const [months, setMonths] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [invoiceData, setInvoiceData] = useState(null);

//   // Fetch unpaid customers from backend
//   useEffect(() => {
//     setLoading(true);
//     axios.get('http://localhost:9999/api/insurer/customers/unpaid')
//       .then(response => setCustomers(response.data))
//       .catch(error => setErrorMessage('Error fetching customers: ' + error.message))
//       .finally(() => setLoading(false));
//   }, []);

//   // Fetch unpaid policies for selected customer from backend
//   useEffect(() => {
//     if (selectedCustomer) {
//       setLoading(true);
//       axios.get(`http://localhost:9999/api/insurer/customers/${selectedCustomer}/unpaid-policies`)
//         .then(response => setPolicies(response.data))
//         .catch(error => setErrorMessage('Error fetching policies: ' + error.message))
//         .finally(() => setLoading(false));
//       setSelectedPolicies([]);  // Reset selections
//     }
//   }, [selectedCustomer]);

//   // Handle policy checkbox selection
//   const handlePolicyChange = (policyId) => {
//     setSelectedPolicies((prev) =>
//       prev.includes(policyId) ? prev.filter(id => id !== policyId) : [...prev, policyId]
//     );
//   };

//   // Generate invoice
//   const handleGenerateInvoice = () => {
//     if (!selectedCustomer || selectedPolicies.length === 0 || !months) {
//       setErrorMessage('Please select a customer, at least one policy, and months.');
//       return;
//     }

//     setLoading(true);
//     setErrorMessage('');

//     const invoicePayload = {
//       customerId: selectedCustomer,
//       policyIds: selectedPolicies,
//       insurerId: user?.id || 'default-insurer',  // Use from user prop
//       dueDate: null,  // Backend auto-calculates
//       months,
//     };

//     axios.post('http://localhost:9999/api/insurer/invoices', invoicePayload)
//       .then(response => {
//         setInvoiceData(response.data);
//         setDialogOpen(true);
//       })
//       .catch(error => setErrorMessage('Error: ' + (error.response?.data || error.message)))
//       .finally(() => setLoading(false));
//   };

//   // Reset form to initial state
//   const resetForm = () => {
//     setSelectedCustomer('');
//     setSelectedPolicies([]);
//     setMonths(1);
//     setErrorMessage('');
//     setInvoiceData(null);
//     setDialogOpen(false);
//   };

//   // Function to get policy name by ID
//   const getPolicyName = (policyId) => {
//     const policy = policies.find(p => p.id === policyId);
//     return policy ? policy.name : 'Unknown';
//   };

//   if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto' }} />;

//   return (
//     <Box sx={{ 
//       p: 4, 
//       maxWidth: '100%', 
//       minHeight: '100vh', 
//       background: '#ffffff', 
//       display: 'flex', 
//       flexDirection: 'column', 
//       alignItems: 'center' 
//     }}>
//       <StyledCard sx={{ width: '100%', maxWidth: 800 }}>
//         <CardContent>
//           <Typography variant="h4" gutterBottom sx={{ color: '#7e57c2', fontWeight: 'bold', textAlign: 'center' }}>
//             Assign Invoice
//           </Typography>

//           {/* Customer Dropdown */}
//           <FormControl fullWidth sx={{ mb: 3 }}>
//             <InputLabel>Select Customer with Unpaid Premiums</InputLabel>
//             <Select
//               value={selectedCustomer}
//               onChange={(e) => setSelectedCustomer(e.target.value)}
//               variant="outlined"
//             >
//               {customers.map((customer) => (
//                 <MenuItem key={customer.id} value={customer.id}>
//                   {customer.name}
//                 </MenuItem>
//               ))}
//             </Select>
//           </FormControl>

//           {/* Policies Checkboxes */}
//           {selectedCustomer && (
//             <FormGroup sx={{ mb: 3 }}>
//               <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
//                 Unpaid Policies
//               </Typography>
//               {policies.map((policy) => (
//                 <FormControlLabel
//                   key={policy.id}
//                   control={
//                     <Checkbox
//                       checked={selectedPolicies.includes(policy.id)}
//                       onChange={() => handlePolicyChange(policy.id)}
//                       color="primary"
//                     />
//                   }
//                   label={policy.name}
//                 />
//               ))}
//             </FormGroup>
//           )}

//           {/* Months Dropdown */}
//           <FormControl fullWidth sx={{ mb: 3 }}>
//             <InputLabel>Select Months</InputLabel>
//             <Select
//               value={months}
//               onChange={(e) => setMonths(e.target.value)}
//               variant="outlined"
//             >
//               <MenuItem value={1}>1 Month</MenuItem>
//               <MenuItem value={3}>3 Months</MenuItem>
//               <MenuItem value={6}>6 Months</MenuItem>
//               <MenuItem value={12}>12 Months</MenuItem>
//             </Select>
//           </FormControl>

//           {/* Generate Button */}
//           <Button 
//             variant="contained" 
//             sx={{ backgroundColor: '#7e57c2', color: 'white', '&:hover': { backgroundColor: '#673ab7' } }} 
//             onClick={handleGenerateInvoice} 
//             disabled={loading} 
//             fullWidth 
//             size="large"
//           >
//             {loading ? 'Generating...' : 'Generate Invoice'}
//           </Button>

//           {/* Error Message */}
//           {errorMessage && <Typography sx={{ mt: 2, color: 'error.main', textAlign: 'center' }}>{errorMessage}</Typography>}
//         </CardContent>
//       </StyledCard>

//       {/* Invoice Details Dialog */}
//       <Dialog open={dialogOpen} onClose={resetForm} maxWidth="sm" fullWidth>
//         <DialogTitle sx={{ backgroundColor: '#7e57c2', color: 'white', textAlign: 'center' }}>
//           Invoice Generated Successfully!
//         </DialogTitle>
//         <DialogContent sx={{ p: 3, backgroundColor: '#f3e5f5' }}>
//           {invoiceData && (
//             <StyledCard>
//               <CardContent>
//                 <SuccessChip label={`Status: ${invoiceData.status.toUpperCase()}`} sx={{ mb: 2, width: '100%' }} />
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Invoice ID:</strong> {invoiceData.id}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Customer ID:</strong> {invoiceData.customerId}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Insurer ID:</strong> {invoiceData.insurerId}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Amount:</strong> ₹{invoiceData.amount}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Due Date:</strong> {new Date(invoiceData.dueDate).toLocaleString()}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Months:</strong> {invoiceData.months}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Payment Link:</strong> <Link href={invoiceData.paymentLink} target="_blank" rel="noopener">{invoiceData.paymentLink}</Link></Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Razorpay Order ID:</strong> {invoiceData.razorpayOrderId}</Typography>
//                 <Typography variant="body1" sx={{ mb: 1 }}><strong>Created At:</strong> {new Date(invoiceData.createdAt).toLocaleString()}</Typography>
//                 <Divider sx={{ my: 2 }} />
//                 <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Tax Details</Typography>
//                 {invoiceData.taxDetailsList.map((tax, index) => (
//                   <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: '#e8eaf6', borderRadius: 1 }}>
//                     <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Policy:</strong> {getPolicyName(tax.policyId)}</Typography>
//                     <Typography variant="body2" sx={{ mb: 0.5 }}><strong>GST Rate:</strong> {tax.gstRate}%</Typography>
//                     <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Tax Amount:</strong> ₹{tax.taxAmount}</Typography>
//                     <Typography variant="body2"><strong>Total Amount:</strong> ₹{tax.totalAmount}</Typography>
//                   </Box>
//                 ))}
//                 <Typography variant="body1" sx={{ mt: 2 }}><strong>Policies:</strong> {invoiceData.policyIds.map(id => getPolicyName(id)).join(', ')}</Typography>
//               </CardContent>
//             </StyledCard>
//           )}
//         </DialogContent>
//         <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
//           <Button onClick={resetForm} variant="contained" sx={{ backgroundColor: '#7e57c2', color: 'white', px: 4, py: 1, '&:hover': { backgroundColor: '#673ab7' } }}>
//             OK
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// }






// // src/components/insurers/InsurerAssignInvoice.jsx basic correct one
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import {
//   Box, Typography, Select, MenuItem, FormControl, InputLabel, Button,
//   FormControlLabel, Checkbox, FormGroup, CircularProgress
// } from '@mui/material';

// export default function InsurerAssignInvoice({ user }) {  // Assume user prop with insurerId if needed
//   const [customers, setCustomers] = useState([]);
//   const [selectedCustomer, setSelectedCustomer] = useState('');
//   const [policies, setPolicies] = useState([]);
//   const [selectedPolicies, setSelectedPolicies] = useState([]);
//   const [months, setMonths] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState('');

//   // Fetch unpaid customers from backend
//   useEffect(() => {
//     setLoading(true);
//     axios.get('http://localhost:9999/api/insurer/customers/unpaid')
//       .then(response => setCustomers(response.data))
//       .catch(error => setMessage('Error fetching customers: ' + error.message))
//       .finally(() => setLoading(false));
//   }, []);

//   // Fetch unpaid policies for selected customer from backend
//   useEffect(() => {
//     if (selectedCustomer) {
//       setLoading(true);
//       axios.get(`http://localhost:9999/api/insurer/customers/${selectedCustomer}/unpaid-policies`)
//         .then(response => setPolicies(response.data))
//         .catch(error => setMessage('Error fetching policies: ' + error.message))
//         .finally(() => setLoading(false));
//       setSelectedPolicies([]);  // Reset selections
//     }
//   }, [selectedCustomer]);

//   // Handle policy checkbox selection
//   const handlePolicyChange = (policyId) => {
//     setSelectedPolicies((prev) =>
//       prev.includes(policyId) ? prev.filter(id => id !== policyId) : [...prev, policyId]
//     );
//   };

//   // Generate invoice
//   const handleGenerateInvoice = () => {
//     if (!selectedCustomer || selectedPolicies.length === 0 || !months) {
//       setMessage('Please select a customer, at least one policy, and months.');
//       return;
//     }

//     setLoading(true);
//     setMessage('');

//     const invoiceData = {
//       customerId: selectedCustomer,
//       policyIds: selectedPolicies,
//       insurerId: user?.id || 'default-insurer',  // Use from user prop
//       dueDate: null,  // Backend auto-calculates
//       months,
//     };

//     axios.post('http://localhost:9999/api/insurer/invoices', invoiceData)
//       .then(response => setMessage(`Invoice generated! Details: ${JSON.stringify(response.data)}`))
//       .catch(error => setMessage('Error: ' + (error.response?.data || error.message)))
//       .finally(() => setLoading(false));
//   };

//   if (loading) return <CircularProgress />;

//   return (
//     <Box sx={{ p: 3 }}>
//       <Typography variant="h5" gutterBottom>Assign Invoice</Typography>

//       {/* Customer Dropdown */}
//       <FormControl fullWidth sx={{ mb: 2 }}>
//         <InputLabel>Select Customer with Unpaid Premiums</InputLabel>
//         <Select
//           value={selectedCustomer}
//           onChange={(e) => setSelectedCustomer(e.target.value)}
//         >
//           {customers.map((customer) => (
//             <MenuItem key={customer.id} value={customer.id}>
//               {customer.name}
//             </MenuItem>
//           ))}
//         </Select>
//       </FormControl>

//       {/* Policies Checkboxes */}
//       {selectedCustomer && (
//         <FormGroup sx={{ mb: 2 }}>
//           <Typography variant="subtitle1" gutterBottom>Unpaid Policies</Typography>
//           {policies.map((policy) => (
//             <FormControlLabel
//               key={policy.id}
//               control={
//                 <Checkbox
//                   checked={selectedPolicies.includes(policy.id)}
//                   onChange={() => handlePolicyChange(policy.id)}
//                 />
//               }
//               label={policy.name}
//             />
//           ))}
//         </FormGroup>
//       )}

//       {/* Months Dropdown */}
//       <FormControl fullWidth sx={{ mb: 2 }}>
//         <InputLabel>Select Months</InputLabel>
//         <Select
//           value={months}
//           onChange={(e) => setMonths(e.target.value)}
//         >
//           <MenuItem value={1}>1 Month</MenuItem>
//           <MenuItem value={3}>3 Months</MenuItem>
//           <MenuItem value={6}>6 Months</MenuItem>
//           <MenuItem value={12}>12 Months</MenuItem>
//         </Select>
//       </FormControl>

//       {/* Generate Button */}
//       <Button variant="contained" onClick={handleGenerateInvoice} disabled={loading}>
//         {loading ? 'Generating...' : 'Generate Invoice'}
//       </Button>

//       {/* Message */}
//       {message && <Typography sx={{ mt: 2, color: 'error.main' }}>{message}</Typography>}
//     </Box>
//   );
// }

