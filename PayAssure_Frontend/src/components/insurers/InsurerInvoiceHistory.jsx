import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, InputAdornment, CircularProgress,
  List, ListItem, ListItemText, Divider, Stack, Button, useTheme, Select,
  MenuItem, FormControl, InputLabel, alpha
} from '@mui/material';
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from 'axios';

// IMPORTANT: This API_BASE URL is a placeholder. You must update it
// to your actual API endpoint for the component to function correctly.
const API_BASE = "http://localhost:9999/api/insurer";

const columns = [
  { id: "id", label: "INVOICE ID", minWidth: 120 },
  { id: "customerName", label: "Customer Name", minWidth: 180 },
  { id: "policyNames", label: "Policy Names", minWidth: 200 },
  { id: "amount", label: "Amount", minWidth: 100, align: "right", format: v => "₹" + v },
  { id: "status", label: "Status", minWidth: 100 },
  { id: "validUptoFormatted", label: "Valid Upto", minWidth: 150 },
  { id: "createdAtFormatted", label: "Created At", minWidth: 150 },
  { id: "actions", label: "Actions", minWidth: 80, align: "center" }
];

// Helper function to get the color based on status
const getStatusColor = (status, theme) => {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'completed':
    case 'paidbycash':
      return theme.palette.success.main;
    case 'processing':
    case 'unpaid':
      return theme.palette.warning.main;
    case 'failed':
      return theme.palette.error.main;
    default:
      return theme.palette.text.primary;
  }
};

export default function App() {
  const theme = useTheme();
  const [enrichedInvoices, setEnrichedInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_BASE}/invoices/history`)
      .then(async response => {
        const enriched = await Promise.all(response.data.map(async invoice => {
          let customerName = 'Unknown', policyNames = 'N/A';
          if (invoice.customerId) {
            try {
              const { data } = await axios.get(`${API_BASE}/customers/${invoice.customerId}`);
              customerName = data.name || 'Unknown';
            } catch { customerName = 'Error fetching customer'; }
          } else customerName = 'No Customer ID';
          const policyIds = invoice.policyIds || [];
          if (policyIds.length) {
            try {
              const { data: policies } = await axios.post(`${API_BASE}/policies/names`, policyIds);
              policyNames = Array.isArray(policies) ? policies.map(p => p.name).join(", ") : 'N/A';
            } catch { policyNames = 'Error fetching policy names'; }
          } else policyNames = 'No Policies Associated';

          const commonDateOptions = {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
          };

          return {
            ...invoice,
            customerName,
            policyNames,
            validUptoFormatted: invoice.validUpto ? new Date(invoice.validUpto).toLocaleString('en-US', commonDateOptions) : 'N/A',
            createdAtFormatted: invoice.createdAt ? new Date(invoice.createdAt).toLocaleString('en-US', commonDateOptions) : 'N/A'
          }
        }));
        setEnrichedInvoices(enriched);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredInvoices = enrichedInvoices.filter(invoice =>
    (invoice.id?.toLowerCase().includes(search.toLowerCase()) ||
    invoice.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    invoice.policyNames?.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === 'All' || invoice.status?.toLowerCase() === statusFilter.toLowerCase())
  );

  useEffect(() => setPage(0), [search, statusFilter]);

  const handleViewDetails = (row) => {
    setSelectedInvoice(row);
    setDialogOpen(true);
  };
  const handleCloseDialog = () => setDialogOpen(false);

  const scrollbarSx = {
    '&::-webkit-scrollbar': {
      height: 8,
      width: 8,
      backgroundColor: theme.palette.background.paper
    },
    '&::-webkit-scrollbar-thumb': {
      borderRadius: 8,
      backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)',
    },
    scrollbarColor: `${theme.palette.mode === 'light' ? '#bdbdbd #f5f5f5' : '#616161 #212121'}`,
    scrollbarWidth: 'thin',
  };

  return (
    <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, minHeight: "100vh", bgcolor: '#f0f2f5' }}>
      {/* Updated Header with new gradient */}
      <Box
        sx={{
          py: 2,
          px: 2,
          mb: 4,
          background: 'linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)',
          color: 'white',
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
          Invoice History
        </Typography>
      </Box>
      <Box sx={{ maxWidth: 1300, mx: "auto" }}>
      
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by invoice ID, customer, policy..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
                boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.05)}`,
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`,
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                },
                '&.Mui-focused': {
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              )
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
                boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.05)}`,
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`,
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                },
                '&.Mui-focused': {
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                  borderColor: theme.palette.primary.main,
                },
              }}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Unpaid">Unpaid</MenuItem>
              <MenuItem value="PaidByCash">Paid by Cash</MenuItem>
              <MenuItem value="Failed">Failed</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {loading ? (
          <CircularProgress sx={{ display: "block", mx: "auto", my: 6 }} />
        ) : (
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              overflow: "hidden",
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.background.paper
            }}
          >
            <TableContainer sx={{ maxHeight: 440, ...scrollbarSx }}>
              <Table stickyHeader aria-label="sticky table">
                <TableHead>
                  <TableRow>
                    {columns.map(column => (
                      <TableCell
                        key={column.id}
                        align={column.align}
                        sx={{
                          minWidth: column.minWidth,
                          bgcolor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          borderBottom: `1px solid ${theme.palette.divider}`
                        }}
                      >
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, rowIdx, arr) => (
                      <TableRow hover tabIndex={-1} key={row.id}>
                        {columns.map((col) => {
                          if (col.id === "actions") {
                            return (
                              <TableCell
                                key={col.id}
                                align={col.align}
                                sx={{
                                  borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`
                                }}
                              >
                                <Button
                                  variant="contained"
                                  color="primary"
                                  size="small"
                                  startIcon={<VisibilityIcon />}
                                  onClick={() => handleViewDetails(row)}
                                  sx={{
                                    borderRadius: 1,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                      transform: 'scale(1.05)',
                                      boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
                                    },
                                  }}
                                >
                                  View
                                </Button>
                              </TableCell>
                            );
                          }

                          if (col.id === "status") {
                            return (
                              <TableCell
                                key={col.id}
                                align={col.align}
                                sx={{
                                  borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: getStatusColor(row[col.id], theme)
                                  }}
                                >
                                  {row[col.id]?.toUpperCase() || 'UNKNOWN'}
                                </Typography>
                              </TableCell>
                            );
                          }

                          let v = row[col.id];
                          if (col.format && typeof v === 'number') v = col.format(v);
                          return (
                            <TableCell
                              key={col.id}
                              align={col.align}
                              sx={{
                                borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`
                              }}
                            >
                              {v}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  {filteredInvoices.length === 0 &&
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center">
                        No records found.
                      </TableCell>
                    </TableRow>
                  }
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 100]}
              component="div"
              count={filteredInvoices.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, np) => setPage(np)}
              onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
              sx={{
                backgroundColor: theme.palette.background.paper,
                borderTop: `1px solid ${theme.palette.divider}`,
                boxShadow: "none",
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
                "& .MuiTablePagination-toolbar": {
                  backgroundColor: "inherit"
                },
                "& .MuiIconButton-root": {
                  background: 'none',
                  color: theme.palette.text.primary,
                  borderRadius: '50%',
                  transition: "box-shadow 0.2s, background 0.2s, color 0.2s, transform 0.2s",
                  boxShadow: "none",
                  "&:hover, &:focus": {
                    background: theme.palette.action.hover,
                    color: theme.palette.primary.main,
                    boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
                    outline: "none",
                    transform: "scale(1.08)"
                  },
                  "&.Mui-disabled": {
                    color: theme.palette.action.disabled,
                    background: 'none',
                    boxShadow: "none"
                  }
                }
              }}
            />
          </Paper>
        )}
      </Box>

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{
          background: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          textAlign: "center"
        }}>
          Invoice Details
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <List disablePadding>
              {Object.entries({
                "ID": selectedInvoice.id,
                "Customer Name": selectedInvoice.customerName,
                "Policy Names": selectedInvoice.policyNames,
                "Insurer ID": selectedInvoice.insurerId || "N/A",
                "Amount": "₹" + selectedInvoice.amount,
                "Status": selectedInvoice.status && selectedInvoice.status.toUpperCase(),
                "Valid Upto": selectedInvoice.validUptoFormatted,
                "Created At": selectedInvoice.createdAtFormatted,
                "Razorpay Order ID": selectedInvoice.razorpayOrderId || "N/A",
                "Payment Link": selectedInvoice.paymentLink || "N/A", // Changed to plain text
                "Months": selectedInvoice.months,
              }).map(([label, value]) => (
                <React.Fragment key={label}>
                  <ListItem>
                    <ListItemText primary={label} secondary={value} />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
              {selectedInvoice.taxDetailsList && selectedInvoice.taxDetailsList.length > 0 && (
                <>
                  <ListItem>
                    <ListItemText primary="Tax Details" />
                  </ListItem>
                  {selectedInvoice.taxDetailsList.map((tax, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          secondary={(
                            <>
                              <Typography component="span" variant="body2">Policy ID: {tax.policyId}</Typography><br />
                              <Typography component="span" variant="body2">GST Rate: {tax.gstRate}%</Typography><br />
                              <Typography component="span" variant="body2">Tax Amount: ₹{tax.taxAmount}</Typography><br />
                              <Typography component="span" variant="body2">Total Amount: ₹{tax.totalAmount}</Typography>
                            </>
                          )}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained" color="primary">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}







// import React, { useState, useEffect } from 'react';
// import {
//   Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
//   TableHead, TableRow, TablePagination, Button, useTheme, Chip,
//   Card, CardContent, Grid, Dialog, DialogTitle, DialogContent, DialogActions,
//   Stack, InputAdornment, TextField, Select, MenuItem, FormControl, InputLabel, alpha
// } from '@mui/material';
// import SearchIcon from "@mui/icons-material/Search";
// import ReceiptIcon from "@mui/icons-material/Receipt";
// import PersonIcon from "@mui/icons-material/Person";
// import PolicyIcon from "@mui/icons-material/Policy";
// import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
// import PaymentIcon from "@mui/icons-material/Payment";
// import TrendingUpIcon from "@mui/icons-material/TrendingUp";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import PendingIcon from "@mui/icons-material/Pending";
// import ErrorIcon from "@mui/icons-material/Error";
// import LaunchIcon from "@mui/icons-material/Launch";
// import axios from 'axios';

// const API_BASE = "http://localhost:9999/api/insurer"; // Edit as needed

// const columns = [
//   { id: "id", label: "Invoice ID", minWidth: 140, icon: <ReceiptIcon /> },
//   { id: "customerName", label: "Customer", minWidth: 200, icon: <PersonIcon /> },
//   { id: "policyNames", label: "Policies", minWidth: 220, icon: <PolicyIcon /> },
//   { id: "amount", label: "Amount", minWidth: 120, align: "right", format: v => "₹" + v.toLocaleString(), icon: <PaymentIcon /> },
//   { id: "status", label: "Status", minWidth: 120, icon: <TrendingUpIcon /> },
//   { id: "validUptoFormatted", label: "Valid Until", minWidth: 180, icon: <CalendarTodayIcon /> },
//   { id: "createdAtFormatted", label: "Created", minWidth: 180, icon: <CalendarTodayIcon /> },
//   { id: "actions", label: "Actions", minWidth: 120, align: "center" },
// ];

// const getStatusColor = (status) => {
//   switch (status?.toLowerCase()) {
//     case 'paid':
//     case 'completed':
//     case 'paidbycash':
//       return 'success';
//     case 'pending':
//     case 'processing':
//     case 'unpaid':
//       return 'warning';
//     case 'failed':
//     case 'cancelled':
//       return 'error';
//     case 'draft':
//       return 'info';
//     default: return 'default';
//   }
// };

// const getStatusIcon = (status) => {
//   switch (status?.toLowerCase()) {
//     case 'paid':
//     case 'completed':
//     case 'paidbycash':
//       return <CheckCircleIcon fontSize="small" />;
//     case 'pending':
//     case 'processing':
//     case 'unpaid':
//       return <PendingIcon fontSize="small" />;
//     case 'failed':
//     case 'cancelled':
//       return <ErrorIcon fontSize="small" />;
//     default: return <PendingIcon fontSize="small" />;
//   }
// };

// export default function InsurerInvoiceHistory() {
//   const theme = useTheme();
//   const [enrichedInvoices, setEnrichedInvoices] = useState([]);
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [selectedInvoice, setSelectedInvoice] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [statusFilter, setStatusFilter] = useState('All');

//   useEffect(() => {
//     axios.get(`${API_BASE}/invoices/history`)
//       .then(async response => {
//         const enriched = await Promise.all(response.data.map(async invoice => {
//           let customerName = 'Unknown', policyNames = 'N/A';

//           if (invoice.customerId) {
//             try {
//               const { data } = await axios.get(`${API_BASE}/customers/${invoice.customerId}`);
//               customerName = data.name || 'Unknown';
//             } catch { customerName = 'Error fetching customer'; }
//           } else customerName = 'No Customer ID';

//           const policyIds = invoice.policyIds || [];
//           if (policyIds.length) {
//             try {
//               const { data: policies } = await axios.post(`${API_BASE}/policies/names`, policyIds);
//               policyNames = Array.isArray(policies) ? policies.map(p => p.name).join(", ") : 'N/A';
//             } catch { policyNames = 'Error fetching policy names'; }
//           } else policyNames = 'No Policies Associated';

//           const commonDateOptions = {
//             year: 'numeric', month: 'short', day: 'numeric',
//             hour: '2-digit', minute: '2-digit', hour12: true
//           };

//           return {
//             ...invoice,
//             customerName,
//             policyNames,
//             validUptoFormatted: invoice.validUpto ? new Date(invoice.validUpto).toLocaleString('en-US', commonDateOptions) : 'N/A',
//             createdAtFormatted: invoice.createdAt ? new Date(invoice.createdAt).toLocaleString('en-US', commonDateOptions) : 'N/A'
//           };
//         }));
//         setEnrichedInvoices(enriched);
//       })
//       .catch(console.error);
//   }, []);

//   const filteredInvoices = enrichedInvoices.filter(invoice =>
//     (invoice.customerName?.toLowerCase().includes(search.toLowerCase()) ||
//       invoice.policyNames?.toLowerCase().includes(search.toLowerCase()) ||
//       invoice.status?.toLowerCase().includes(search.toLowerCase())) &&
//     (statusFilter === 'All' || invoice.status?.toLowerCase() === statusFilter.toLowerCase())
//   );

//   useEffect(() => setPage(0), [search, statusFilter]);

//   // Dialog handlers
//   const handleViewDetails = (invoice) => {
//     setSelectedInvoice(invoice);
//     setDialogOpen(true);
//   };
//   const handleCloseDialog = () => {
//     setDialogOpen(false);
//     setSelectedInvoice(null);
//   };

//   // Scrollbar styling for TableContainer
//   const scrollbarSx = {
//     '&::-webkit-scrollbar': {
//       height: 10,
//       width: 10,
//       backgroundColor: alpha(theme.palette.background.paper, 0.1)
//     },
//     '&::-webkit-scrollbar-thumb': {
//       borderRadius: 8,
//       backgroundColor: alpha(theme.palette.primary.main, 0.3),
//       border: `2px solid ${theme.palette.background.paper}`,
//       '&:hover': {
//         backgroundColor: alpha(theme.palette.primary.main, 0.5),
//       }
//     },
//     '&::-webkit-scrollbar-track': {
//       borderRadius: 8,
//       backgroundColor: alpha(theme.palette.background.paper, 0.05)
//     },
//     scrollbarColor: `${alpha(theme.palette.primary.main, 0.3)} ${alpha(theme.palette.background.paper, 0.1)}`,
//     scrollbarWidth: 'thin',
//   };

//   return (
//     <Box sx={{
//       py: 4,
//       px: { xs: 2, sm: 4 },
//       minHeight: "100vh",
//       background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`
//     }}>
//       {/* Header Section */}
//       <Box sx={{ mb: 4 }}>
//         <Typography
//           variant="h4"
//           gutterBottom
//           align="center"
//           sx={{
//             fontWeight: 700,
//             background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
//             backgroundClip: 'text',
//             WebkitBackgroundClip: 'text',
//             WebkitTextFillColor: 'transparent',
//             mb: 1,
//             fontFamily: 'Montserrat, sans-serif'
//           }}
//         >
//           Invoice History
//         </Typography>
//         <Typography
//           variant="h6"
//           align="center"
//           color="text.secondary"
//           sx={{ mb: 4, fontFamily: 'Roboto, sans-serif' }}
//         >
//           Manage and track all your invoice records
//         </Typography>
//       </Box>

//       {/* Search & Filter Bar */}
//       <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
//         <TextField
//           fullWidth
//           placeholder="Search by customer name, policy, or status..."
//           size="medium"
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//           sx={{
//             '& .MuiOutlinedInput-root': {
//               borderRadius: 3,
//               backgroundColor: theme.palette.background.paper,
//               boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.08)}`,
//               border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
//               transition: 'all 0.3s ease',
//               '&:hover': {
//                 boxShadow: `0 6px 25px ${alpha(theme.palette.common.black, 0.12)}`,
//                 borderColor: alpha(theme.palette.primary.main, 0.3),
//               },
//               '&.Mui-focused': {
//                 boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
//                 borderColor: theme.palette.primary.main,
//               },
//             },
//           }}
//           InputProps={{
//             startAdornment: (
//               <InputAdornment position="start">
//                 <SearchIcon color="primary" sx={{ fontSize: 24 }} />
//               </InputAdornment>
//             )
//           }}
//         />
//         <FormControl sx={{ minWidth: 180 }}>
//           <InputLabel id="status-filter-label">Status</InputLabel>
//           <Select
//             labelId="status-filter-label"
//             id="status-filter"
//             value={statusFilter}
//             label="Status"
//             onChange={(e) => setStatusFilter(e.target.value)}
//             sx={{
//               borderRadius: 3,
//               backgroundColor: theme.palette.background.paper,
//               boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.08)}`,
//               border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
//               transition: 'all 0.3s ease',
//               '&:hover': {
//                 boxShadow: `0 6px 25px ${alpha(theme.palette.common.black, 0.12)}`,
//                 borderColor: alpha(theme.palette.primary.main, 0.3),
//               },
//               '&.Mui-focused': {
//                 boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
//                 borderColor: theme.palette.primary.main,
//               }
//             }}
//           >
//             <MenuItem value="All">All Statuses</MenuItem>
//             <MenuItem value="Paid">Paid</MenuItem>
//             <MenuItem value="Unpaid">Unpaid</MenuItem>
//             <MenuItem value="PaidByCash">Paid by Cash</MenuItem>
//             <MenuItem value="Pending">Pending</MenuItem>
//             <MenuItem value="Failed">Failed</MenuItem>
//             <MenuItem value="Cancelled">Cancelled</MenuItem>
//             <MenuItem value="Draft">Draft</MenuItem>
//           </Select>
//         </FormControl>
//       </Stack>

//       {/* Professional Table */}
//       <Paper
//         elevation={0}
//         sx={{
//           width: "100%",
//           overflow: "hidden",
//           borderRadius: 4,
//           border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
//           bgcolor: theme.palette.background.paper,
//           boxShadow: `0 10px 40px ${alpha(theme.palette.common.black, 0.08)}`,
//           backdropFilter: 'blur(10px)'
//         }}
//       >
//         <TableContainer sx={{ maxHeight: 500, ...scrollbarSx }}>
//           <Table stickyHeader aria-label="Invoice history table">
//             <TableHead>
//               <TableRow>
//                 {columns.map(col => (
//                   <TableCell
//                     key={col.id}
//                     align={col.align}
//                     sx={{
//                       minWidth: col.minWidth,
//                       background: theme.palette.primary.main,
//                       color: theme.palette.primary.contrastText,
//                       fontWeight: 700,
//                       fontSize: '0.9rem',
//                       textTransform: 'uppercase',
//                       letterSpacing: '0.5px',
//                       borderBottom: `2px solid ${alpha(theme.palette.primary.dark, 0.8)}`,
//                       position: 'sticky',
//                       top: 0,
//                       zIndex: 10,
//                       py: 2,
//                       fontFamily: 'Roboto, sans-serif',
//                       cursor: col.id === 'actions' ? 'default' : 'pointer',
//                     }}
//                   >
//                     <Stack direction="row" alignItems="center" spacing={1} justifyContent={col.align === 'center' ? 'center' : col.align || 'flex-start'}>
//                       {col.icon && React.cloneElement(col.icon, { sx: { fontSize: 18, opacity: 0.9, color: theme.palette.primary.contrastText } })}
//                       <span>{col.label}</span>
//                     </Stack>
//                   </TableCell>
//                 ))}
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {filteredInvoices
//                 .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
//                 .map((row, idx, arr) => (
//                   <TableRow
//                     key={row.id}
//                     hover
//                     tabIndex={-1}
//                     sx={{
//                       cursor: 'pointer',
//                       '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.04) },
//                     }}
//                   >
//                     {columns.map(col => {
//                       if (col.id === "actions") {
//                         return (
//                           <TableCell
//                             key={col.id}
//                             align={col.align}
//                             sx={{
//                               borderBottom: idx === arr.length - 1 ? "none" : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
//                               py: 2
//                             }}
//                           >
//                             <Button
//                               variant="contained"
//                               color="primary"
//                               size="small"
//                               startIcon={<LaunchIcon />}
//                               onClick={() => handleViewDetails(row)}
//                               sx={{
//                                 borderRadius: 2,
//                                 fontWeight: 600,
//                                 textTransform: 'none',
//                                 transition: 'all 0.3s ease',
//                                 backgroundColor: theme.palette.primary.light,
//                                 color: theme.palette.primary.contrastText,
//                                 '&:hover': {
//                                   backgroundColor: theme.palette.primary.main,
//                                   transform: 'translateY(-1px)',
//                                   boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
//                                 },
//                               }}
//                             >
//                               View
//                             </Button>
//                           </TableCell>
//                         );
//                       }

//                       if (col.id === "status") {
//                         return (
//                           <TableCell
//                             key={col.id}
//                             align={col.align}
//                             sx={{
//                               borderBottom: idx === arr.length - 1 ? "none" : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
//                               py: 2
//                             }}
//                           >
//                             <Chip
//                               icon={getStatusIcon(row[col.id])}
//                               label={row[col.id]?.toUpperCase() || 'UNKNOWN'}
//                               color={getStatusColor(row[col.id])}
//                               size="small"
//                               sx={{
//                                 fontWeight: 600,
//                                 fontSize: '0.75rem',
//                                 borderRadius: 2,
//                                 minWidth: 85
//                               }}
//                             />
//                           </TableCell>
//                         );
//                       }

//                       let value = row[col.id];
//                       if (col.format && typeof value === 'number') {
//                         value = col.format(value);
//                       }

//                       return (
//                         <TableCell
//                           key={col.id}
//                           align={col.align}
//                           sx={{
//                             borderBottom: idx === arr.length - 1 ? "none" : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
//                             py: 2,
//                             fontSize: '0.9rem',
//                             fontWeight: col.id === 'amount' ? 600 : 400,
//                             color: col.id === 'amount' ? theme.palette.success.main : 'inherit',
//                             fontFamily: 'Roboto, sans-serif',
//                           }}
//                         >
//                           {col.id === 'id' ? (
//                             <Typography variant="body2" sx={{
//                               fontFamily: 'monospace',
//                               color: theme.palette.primary.main,
//                               fontWeight: 600
//                             }}>
//                               {value}
//                             </Typography>
//                           ) : value}
//                         </TableCell>
//                       );
//                     })}
//                   </TableRow>
//                 ))}
//               {filteredInvoices.length === 0 && (
//                 <TableRow>
//                   <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
//                     <Stack alignItems="center" spacing={2}>
//                       <ReceiptIcon sx={{ fontSize: 64, color: theme.palette.text.disabled }} />
//                       <Typography variant="h6" color="text.secondary">
//                         No invoices found
//                       </Typography>
//                       <Typography variant="body2" color="text.disabled">
//                         Try adjusting your search criteria or filters.
//                       </Typography>
//                     </Stack>
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         </TableContainer>

//         {/* Pagination */}
//         <TablePagination
//           rowsPerPageOptions={[10, 25, 50, 100]}
//           component="div"
//           count={filteredInvoices.length}
//           rowsPerPage={rowsPerPage}
//           page={page}
//           onPageChange={(_, newPage) => setPage(newPage)}
//           onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
//           sx={{
//             backgroundColor: alpha(theme.palette.background.paper, 0.8),
//             borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
//             backdropFilter: 'blur(10px)',
//             borderBottomLeftRadius: 4,
//             borderBottomRightRadius: 4,
//             "& .MuiTablePagination-toolbar": {
//               backgroundColor: "transparent",
//               px: 3,
//               py: 2
//             },
//             "& .MuiIconButton-root": {
//               background: alpha(theme.palette.primary.main, 0.1),
//               color: theme.palette.primary.main,
//               borderRadius: 2,
//               margin: '0 2px',
//               transition: "all 0.3s ease",
//               "&:hover": {
//                 background: alpha(theme.palette.primary.main, 0.2),
//                 transform: "scale(1.1)",
//                 boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
//               },
//               "&.Mui-disabled": {
//                 color: theme.palette.action.disabled,
//                 background: alpha(theme.palette.action.disabled, 0.1)
//               }
//             }
//           }}
//         />
//       </Paper>

//       {/* Invoice Details Dialog with 4 equal Cards */}
//       <Dialog
//         open={dialogOpen}
//         onClose={handleCloseDialog}
//         maxWidth="md"
//         fullWidth
//         PaperProps={{
//           sx: {
//             borderRadius: 4,
//             boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.3)}`,
//             backdropFilter: 'blur(20px)'
//           }
//         }}
//       >
//         <DialogTitle sx={{
//           background: `linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)`,
//           color: '#475569',
//           textAlign: "center",
//           py: 3,
//           fontFamily: 'Montserrat, sans-serif',
//           position: 'relative',
//           overflow: 'hidden',
//           '&::before': {
//             content: '""',
//             position: 'absolute',
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             background: `linear-gradient(45deg, ${alpha('#fff', 0.3)} 0%, transparent 100%)`,
//             pointerEvents: 'none'
//           }
//         }}>
//           Invoice Details
//         </DialogTitle>

//         <DialogContent sx={{ p: 3 }}>
//           {selectedInvoice && (
//             <Grid container spacing={3}>
//               {/* Four equal width cards */}
//               {/** Card 1: Basic Information **/}
//               <Grid item xs={12} sm={6} md={3}>
//                 <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
//                   <CardContent>
//                     <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ fontFamily: 'Roboto, sans-serif' }}>
//                       Basic Information
//                     </Typography>
//                     <Stack spacing={1.5}>
//                       <Typography variant="subtitle2" color="text.secondary">Invoice ID</Typography>
//                       <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600, color: theme.palette.primary.main }}>
//                         {selectedInvoice.id}
//                       </Typography>

//                       <Typography variant="subtitle2" color="text.secondary">Customer</Typography>
//                       <Typography variant="body1">{selectedInvoice.customerName || 'N/A'}</Typography>

//                       <Typography variant="subtitle2" color="text.secondary">Amount</Typography>
//                       <Typography variant="body1" fontWeight="bold" color={theme.palette.success.main}>
//                         ₹{selectedInvoice.amount?.toLocaleString()}
//                       </Typography>

//                       <Typography variant="subtitle2" color="text.secondary">Status</Typography>
//                       <Chip
//                         icon={getStatusIcon(selectedInvoice.status)}
//                         label={selectedInvoice.status?.toUpperCase() || 'UNKNOWN'}
//                         color={getStatusColor(selectedInvoice.status)}
//                         size="small"
//                         sx={{ fontWeight: 600, minWidth: 85 }}
//                       />
//                     </Stack>
//                   </CardContent>
//                 </Card>
//               </Grid>

//               {/** Card 2: Additional Details **/}
//               <Grid item xs={12} sm={6} md={3}>
//                 <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
//                   <CardContent>
//                     <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ fontFamily: 'Roboto, sans-serif' }}>
//                       Additional Details
//                     </Typography>
//                     <Stack spacing={1.5}>
//                       <Typography variant="subtitle2" color="text.secondary">Valid Until</Typography>
//                       <Typography variant="body1">{selectedInvoice.validUptoFormatted || 'N/A'}</Typography>

//                       <Typography variant="subtitle2" color="text.secondary">Created</Typography>
//                       <Typography variant="body1">{selectedInvoice.createdAtFormatted || 'N/A'}</Typography>

//                       <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
//                       <Typography variant="body1">{selectedInvoice.months ? `${selectedInvoice.months} month(s)` : 'N/A'}</Typography>

//                       <Typography variant="subtitle2" color="text.secondary">Razorpay Order</Typography>
//                       <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
//                         {selectedInvoice.razorpayOrderId || "N/A"}
//                       </Typography>
//                     </Stack>
//                   </CardContent>
//                 </Card>
//               </Grid>

//               {/** Card 3: Policy Information **/}
//               <Grid item xs={12} sm={6} md={3}>
//                 <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
//                   <CardContent>
//                     <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ fontFamily: 'Roboto, sans-serif' }}>
//                       Policy Information
//                     </Typography>
//                     <Typography variant="body1" sx={{ mt: 1 }}>
//                       {selectedInvoice.policyNames || 'No policies associated with this invoice.'}
//                     </Typography>
//                   </CardContent>
//                 </Card>
//               </Grid>

//               {/** Card 4: Tax Details **/}
//               <Grid item xs={12} sm={6} md={3}>
//                 <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
//                   <CardContent>
//                     <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ fontFamily: 'Roboto, sans-serif' }}>
//                       Tax Breakdown
//                     </Typography>
//                     {selectedInvoice.taxDetailsList && selectedInvoice.taxDetailsList.length > 0 ? (
//                       selectedInvoice.taxDetailsList.map((tax, idx) => (
//                         <Box key={idx} sx={{ mb: idx < selectedInvoice.taxDetailsList.length - 1 ? 2 : 0 }}>
//                           <Typography variant="subtitle2" color="info.main" fontWeight="bold">
//                             Tax Detail #{idx + 1}
//                           </Typography>
//                           <Stack spacing={0.5}>
//                             <Typography variant="body2" color="text.secondary">
//                               Policy ID: <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 'medium' }}>{tax.policyId}</Box>
//                             </Typography>
//                             <Typography variant="body2" color="warning.main" fontWeight="medium">
//                               GST Rate: {tax.gstRate}%
//                             </Typography>
//                             <Typography variant="body2" color="error.main" fontWeight="bold">
//                               Tax Amount: ₹{tax.taxAmount?.toLocaleString()}
//                             </Typography>
//                             <Typography variant="body2" color="success.main" fontWeight="bold">
//                               Total Amount: ₹{tax.totalAmount?.toLocaleString()}
//                             </Typography>
//                           </Stack>
//                           {idx !== selectedInvoice.taxDetailsList.length - 1 && <Divider sx={{ mt: 1, mb: 1 }} />}
//                         </Box>
//                       ))
//                     ) : (
//                       <Typography variant="body2" color="text.secondary">No tax details available.</Typography>
//                     )}
//                   </CardContent>
//                 </Card>
//               </Grid>
//             </Grid>
//           )}
//         </DialogContent>
//         <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
//           <Button
//             onClick={handleCloseDialog}
//             variant="contained"
//             sx={{
//               minWidth: 150,
//               py: 1.2,
//               borderRadius: 2,
//               fontWeight: 600,
//               textTransform: 'none',
//               background: theme.palette.secondary.main,
//               color: theme.palette.secondary.contrastText,
//               boxShadow: `0 4px 15px ${alpha(theme.palette.secondary.main, 0.3)}`,
//               transition: 'all 0.3s ease',
//               '&:hover': {
//                 transform: 'translateY(-2px)',
//                 boxShadow: `0 8px 25px ${alpha(theme.palette.secondary.main, 0.4)}`,
//                 background: theme.palette.secondary.dark,
//               }
//             }}
//           >
//             Close Details
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// }








//basic version
// // src/components/insurers/InsurerInvoiceHistory.jsx
// import React, { useState, useEffect } from 'react';
// import {
//   Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
//   TableHead, TableRow, TablePagination, IconButton, Dialog, DialogTitle,
//   DialogContent, DialogActions, TextField, InputAdornment, CircularProgress,
//   List, ListItem, ListItemText, Divider, Stack, Button, useTheme
// } from '@mui/material';
// import SearchIcon from "@mui/icons-material/Search";
// import VisibilityIcon from "@mui/icons-material/Visibility";
// import axios from 'axios';

// const API_BASE = "http://localhost:9999/api/insurer"; // Edit as needed

// const columns = [
//   { id: "id", label: "INVOICE ID", minWidth: 120 },
//   { id: "customerName", label: "Customer Name", minWidth: 180 },
//   { id: "policyNames", label: "Policy Names", minWidth: 200 },
//   { id: "amount", label: "Amount", minWidth: 100, align: "right", format: v => "₹" + v },
//   { id: "status", label: "Status", minWidth: 100 },
//   { id: "validUptoFormatted", label: "Valid Upto", minWidth: 150 },
//   { id: "createdAtFormatted", label: "Created At", minWidth: 150 },
//   { id: "actions", label: "Actions", minWidth: 80, align: "center" }
// ];

// export default function InsurerInvoiceHistory() {
//   const theme = useTheme();
//   const [enrichedInvoices, setEnrichedInvoices] = useState([]);
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [loading, setLoading] = useState(false);
//   const [selectedInvoice, setSelectedInvoice] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);

//   useEffect(() => {
//     setLoading(true);
//     axios.get(`${API_BASE}/invoices/history`)
//       .then(async response => {
//         const enriched = await Promise.all(response.data.map(async invoice => {
//           let customerName = 'Unknown', policyNames = 'N/A';
//           if (invoice.customerId) {
//             try {
//               const { data } = await axios.get(`${API_BASE}/customers/${invoice.customerId}`);
//               customerName = data.name || 'Unknown';
//             } catch { customerName = 'Error fetching customer'; }
//           } else customerName = 'No Customer ID';
//           const policyIds = invoice.policyIds || [];
//           if (policyIds.length) {
//             try {
//               const { data: policies } = await axios.post(`${API_BASE}/policies/names`, policyIds);
//               policyNames = Array.isArray(policies) ? policies.map(p => p.name).join(", ") : 'N/A';
//             } catch { policyNames = 'Error fetching policy names'; }
//           } else policyNames = 'No Policies Associated';
//           return {
//             ...invoice,
//             customerName,
//             policyNames,
//             validUptoFormatted: invoice.validUpto ? new Date(invoice.validUpto).toLocaleString() : 'N/A',
//             createdAtFormatted: invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : 'N/A'
//           }
//         }));
//         setEnrichedInvoices(enriched);
//       })
//       .catch(console.error)
//       .finally(() => setLoading(false));
//   }, []);

//   // Filter
//   const filteredInvoices = enrichedInvoices.filter(invoice =>
//     (invoice.customerName?.toLowerCase().includes(search.toLowerCase()) ||
//       invoice.policyNames?.toLowerCase().includes(search.toLowerCase()) ||
//       invoice.status?.toLowerCase().includes(search.toLowerCase()))
//   );

//   useEffect(() => setPage(0), [search]);

//   if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", my: 6 }} />;

//   // Details dialog
//   const handleViewDetails = (row) => {
//     setSelectedInvoice(row);
//     setDialogOpen(true);
//   };
//   const handleCloseDialog = () => setDialogOpen(false);

//   // Scrollbar styles
//   const scrollbarSx = {
//     '&::-webkit-scrollbar': {
//       height: 8,
//       width: 8,
//       backgroundColor: theme.palette.background.paper
//     },
//     '&::-webkit-scrollbar-thumb': {
//       borderRadius: 8,
//       backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)',
//     },
//     scrollbarColor: `${theme.palette.mode === 'light' ? '#bdbdbd #f5f5f5' : '#616161 #212121'}`,
//     scrollbarWidth: 'thin',
//   };

//   return (
//     <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, minHeight: "100vh" }}>
//       <Typography variant="h4" gutterBottom align="center">Invoice History</Typography>
//       <Box sx={{ maxWidth: 1300, mx: "auto" }}>
//         <TextField
//           fullWidth
//           size="small"
//           placeholder="Search by customer, policy, status..."
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//           sx={{ mb: 2 }}
//           InputProps={{
//             startAdornment: (
//               <InputAdornment position="start">
//                 <SearchIcon color="primary" />
//               </InputAdornment>
//             )
//           }}
//         />
//         <Paper
//           elevation={0}
//           sx={{
//             width: "100%",
//             overflow: "hidden",
//             borderRadius: 2,
//             border: `1px solid ${theme.palette.divider}`,
//             bgcolor: theme.palette.background.paper
//           }}
//         >
//           <TableContainer sx={{ maxHeight: 440, ...scrollbarSx }}>
//             <Table stickyHeader aria-label="sticky table">
//               <TableHead>
//                 <TableRow>
//                   {columns.map(column => (
//                     <TableCell
//                       key={column.id}
//                       align={column.align}
//                       sx={{
//                         minWidth: column.minWidth,
//                         bgcolor: theme.palette.primary.main,
//                         color: theme.palette.primary.contrastText,
//                         fontWeight: 700,
//                         textTransform: 'uppercase',
//                         borderBottom: `1px solid ${theme.palette.divider}`
//                       }}
//                     >
//                       {column.label}
//                     </TableCell>
//                   ))}
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {filteredInvoices
//                   .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
//                   .map((row, rowIdx, arr) => (
//                     <TableRow hover tabIndex={-1} key={row.id}>
//                       {columns.map((col) => {
//                         if (col.id === "actions") {
//                           return (
//                             <TableCell
//                               key={col.id}
//                               align={col.align}
//                               sx={{
//                                 borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`
//                               }}
//                             >
//                               <Stack alignItems="center" direction="row" spacing={1}>
//                                 <IconButton color="primary" onClick={() => handleViewDetails(row)}>
//                                   <VisibilityIcon />
//                                 </IconButton>
//                               </Stack>
//                             </TableCell>
//                           );
//                         }
//                         let v = row[col.id];
//                         if (col.format && typeof v === 'number') v = col.format(v);
//                         return (
//                           <TableCell
//                             key={col.id}
//                             align={col.align}
//                             sx={{
//                               borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`
//                             }}
//                           >
//                             {v}
//                           </TableCell>
//                         );
//                       })}
//                     </TableRow>
//                   ))}
//                 {filteredInvoices.length === 0 &&
//                   <TableRow>
//                     <TableCell colSpan={columns.length} align="center">
//                       No records found.
//                     </TableCell>
//                   </TableRow>
//                 }
//               </TableBody>
//             </Table>
//           </TableContainer>
//           <TablePagination
//             rowsPerPageOptions={[10, 25, 100]}
//             component="div"
//             count={filteredInvoices.length}
//             rowsPerPage={rowsPerPage}
//             page={page}
//             onPageChange={(_, np) => setPage(np)}
//             onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
//             sx={{
//               backgroundColor: theme.palette.background.paper,
//               borderTop: `1px solid ${theme.palette.divider}`,
//               boxShadow: "none",
//               borderBottomLeftRadius: 2,
//               borderBottomRightRadius: 2,
//               "& .MuiTablePagination-toolbar": {
//                 backgroundColor: "inherit"
//               },
//               "& .MuiIconButton-root": {
//                 background: 'none',
//                 color: theme.palette.text.primary,
//                 borderRadius: '50%',
//                 transition: "box-shadow 0.2s, background 0.2s, color 0.2s, transform 0.2s",
//                 boxShadow: "none",
//                 "&:hover, &:focus": {
//                   background: theme.palette.action.hover,
//                   color: theme.palette.primary.main,
//                   boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
//                   outline: "none",
//                   transform: "scale(1.08)"
//                 },
//                 "&.Mui-disabled": {
//                   color: theme.palette.action.disabled,
//                   background: 'none',
//                   boxShadow: "none"
//                 }
//               },
//               "& .MuiTablePagination-actions": {
//                 background: "none"
//               }
//             }}
//           />
//         </Paper>
//       </Box>

//       {/* Details Dialog */}
//       <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
//         <DialogTitle sx={{
//           background: theme.palette.primary.main,
//           color: theme.palette.primary.contrastText,
//           textAlign: "center"
//         }}>
//           Invoice Details
//         </DialogTitle>
//         <DialogContent>
//           {selectedInvoice && (
//             <List disablePadding>
//               {Object.entries({
//                 "ID": selectedInvoice.id,
//                 "Customer Name": selectedInvoice.customerName,
//                 "Policy Names": selectedInvoice.policyNames,
//                 "Insurer ID": selectedInvoice.insurerId || "N/A",
//                 "Amount": "₹" + selectedInvoice.amount,
//                 "Status": selectedInvoice.status && selectedInvoice.status.toUpperCase(),
//                 "Valid Upto": selectedInvoice.validUptoFormatted,
//                 "Created At": selectedInvoice.createdAtFormatted,
//                 "Razorpay Order ID": selectedInvoice.razorpayOrderId || "N/A",
//                 "Payment Link": selectedInvoice.paymentLink ? <a href={selectedInvoice.paymentLink} target="_blank" rel="noopener noreferrer">{selectedInvoice.paymentLink}</a> : "N/A",
//                 "Months": selectedInvoice.months,
//               }).map(([label, value]) => (
//                 <React.Fragment key={label}>
//                   <ListItem>
//                     <ListItemText primary={label} secondary={value} />
//                   </ListItem>
//                   <Divider />
//                 </React.Fragment>
//               ))}
//               {selectedInvoice.taxDetailsList && selectedInvoice.taxDetailsList.length > 0 && (
//                 <>
//                   <ListItem>
//                     <ListItemText primary="Tax Details" />
//                   </ListItem>
//                   {selectedInvoice.taxDetailsList.map((tax, index) => (
//                     <React.Fragment key={index}>
//                       <ListItem>
//                         <ListItemText
//                           secondary={(
//                             <>
//                               <Typography component="span" variant="body2">Policy ID: {tax.policyId}</Typography><br />
//                               <Typography component="span" variant="body2">GST Rate: {tax.gstRate}%</Typography><br />
//                               <Typography component="span" variant="body2">Tax Amount: ₹{tax.taxAmount}</Typography><br />
//                               <Typography component="span" variant="body2">Total Amount: ₹{tax.totalAmount}</Typography>
//                             </>
//                           )}
//                         />
//                       </ListItem>
//                       <Divider />
//                     </React.Fragment>
//                   ))}
//                 </>
//               )}
//             </List>
//           )}
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={handleCloseDialog} variant="contained" color="primary">Close</Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// }
