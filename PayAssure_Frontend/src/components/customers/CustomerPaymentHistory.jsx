import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, InputAdornment, CircularProgress,
  List, ListItem, ListItemText, Divider, Stack, Button, useTheme, IconButton
} from '@mui/material';
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from '@mui/icons-material/Download';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = "http://localhost:9999/api/customer";

const columns = [
  { id: "id", label: "ID", minWidth: 120 },
  { id: "policyNames", label: "Policy Names", minWidth: 200 },
  { id: "amount", label: "Amount", minWidth: 100, align: "right", format: v => "₹" + v },
  { id: "method", label: "Method", minWidth: 100 },
  { id: "paidAtFormatted", label: "Paid At", minWidth: 150 },
  { id: "actions", label: "Actions", minWidth: 80, align: "center" }
];

export default function CustomerPaymentHistory({ customerId }) {
  const theme = useTheme();
  const [enrichedPayments, setEnrichedPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState(null);

  const scrollbarSx = {
    '&::-webkit-scrollbar': {
      height: 8,
      width: 8,
      backgroundColor: theme.palette.background.paper
    },
    '&::-webkit-scrollbar-thumb': {
      borderRadius: 8,
      backgroundColor:
        theme.palette.mode === 'light'
          ? 'rgba(0,0,0,0.15)'
          : 'rgba(255,255,255,0.12)',
    },
    scrollbarColor:
      `${theme.palette.mode === 'light' ? '#bdbdbd #f5f5f5' : '#616161 #212121'}`,
    scrollbarWidth: 'thin',
  };

  useEffect(() => {
    if (!customerId) {
      setError('No customer ID provided. Please log in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    axios.get(`${API_BASE}/payments/history/${customerId}`)
      .then(async response => {
        if (!response.data.length) {
          setError('No payment records found for this customer.');
          setEnrichedPayments([]);
          return;
        }

        const enriched = await Promise.all(response.data.map(async payment => {
          let policyNames = 'N/A';
          if (payment.invoiceId) {
            try {
              const { data: invoice } = await axios.get(`${API_BASE}/invoices/${payment.invoiceId}`);
              const policyIds = invoice?.policyIds || [];
              if (policyIds.length > 0) {
                try {
                  const { data: policyNamesArray } = await axios.post(
                    `${API_BASE}/policies/names`,
                    policyIds
                  );
                  policyNames = Array.isArray(policyNamesArray) ? policyNamesArray.join(", ") : 'N/A';
                } catch {
                  policyNames = 'Error fetching policy names';
                }
              } else {
                policyNames = 'No Policies Associated';
              }
            } catch {
              policyNames = 'Error fetching invoice';
            }
          } else if (
            payment.policyNames &&
            Array.isArray(payment.policyNames) &&
            payment.policyNames.length > 0
          ) {
            policyNames = payment.policyNames.join(", ");
          } else {
            policyNames = 'No Invoice / Policies';
          }

          return {
            ...payment,
            policyNames,
            paidAtFormatted: payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'N/A',
          };
        }));

        setEnrichedPayments(enriched);
      })
      .catch(() => {
        setError('Failed to load payment history. Please try again.');
        setEnrichedPayments([]);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  const filteredPayments = enrichedPayments.filter(payment =>
    (payment.policyNames?.toLowerCase().includes(search.toLowerCase()) ||
      payment.method?.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => setPage(0), [search]);

  if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", my: 6 }} />;
  if (error) return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="h6" color="error">{error}</Typography>
    </Box>
  );

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setDialogOpen(true);
  };
  const handleCloseDialog = () => setDialogOpen(false);

  // Corrected Download PDF handler using 'autoTable(doc, options)'
  const handleDownloadPdf = (payment) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Payment Details", 14, 22);
    const details = [
      ["ID", payment.id || "N/A"],
      ["Invoice ID", payment.invoiceId || "N/A"],
      ["Policy Names", Array.isArray(payment.policyNames) ? payment.policyNames.join(", ") : payment.policyNames || "N/A"],
      ["Insurer ID", payment.insurerId || "N/A"],
      ["Amount", `₹${payment.amount}`],
      ["Status", payment.status?.toUpperCase() || "N/A"],
      ["Method", payment.method || "N/A"],
      ["Auto Pay", payment.autoPay ? "Yes" : "No"],
      ["Paid At", payment.paidAtFormatted || "N/A"],
      ["Razorpay Payment ID", payment.razorpayPaymentId || "N/A"],
      ["Razorpay Subscription ID", payment.razorpaySubscriptionId || "N/A"],
    ];
    if (payment.taxDetails) {
      details.push([
        "Tax Details",
        `Type: ${payment.taxDetails.taxType}
Rate: ${payment.taxDetails.taxRate}%
Tax Amount: ₹${payment.taxDetails.taxAmount}
Total Amount: ₹${payment.taxDetails.totalAmount}`
      ]);
    }

    autoTable(doc, {
      startY: 30,
      head: [['Field', 'Value']],
      body: details,
      styles: { fontSize: 11 },
      headStyles: { fillColor: [103, 58, 183] },
      theme: 'striped',
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' } }
    });

    doc.save(`payment_${payment.id || 'detail'}.pdf`);
  };

  return (
    <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, minHeight: "100vh" }}>
      <Box sx={{
        py: 2, px: 2, mb: 4,
        background: 'linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)',
        color: 'white',
        borderRadius: 2,
        boxShadow: 3,
      }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
          My Payment History
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1300, mx: "auto" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by policy, method..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            )
          }}
        />
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
                {filteredPayments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row, rowIndex, arr) => (
                    <TableRow hover tabIndex={-1} key={row.id}>
                      {columns.map(col => {
                        if (col.id === "actions") {
                          return (
                            <TableCell
                              key={col.id}
                              align={col.align}
                              sx={{ borderBottom: rowIndex === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}
                            >
                              <Stack alignItems="center" direction="row" spacing={1} justifyContent="center">
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() => handleViewDetails(row)}
                                  size="small"
                                  sx={{ minWidth: 'auto' }}
                                >
                                  View
                                </Button>
                                <IconButton
                                  aria-label="download pdf"
                                  color="primary"
                                  size="small"
                                  onClick={() => handleDownloadPdf(row)}
                                >
                                  <DownloadIcon />
                                </IconButton>
                              </Stack>
                            </TableCell>
                          );
                        }
                        let value = row[col.id];
                        if (col.id === "amount") {
                          value =
                            row.taxDetails && typeof row.taxDetails.totalAmount === 'number'
                              ? `₹${row.taxDetails.totalAmount}`
                              : `₹${row.amount}`;
                        } else if (col.format && typeof value === 'number') {
                          value = col.format(value);
                        }
                        return (
                          <TableCell
                            key={col.id}
                            align={col.align}
                            sx={{ borderBottom: rowIndex === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}
                          >
                            {value}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                }
                {filteredPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 100]}
            component="div"
            count={filteredPayments.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
            sx={{
              backgroundColor: theme.palette.background.paper,
              borderTop: `1px solid ${theme.palette.divider}`,
              boxShadow: "none",
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
              "& .MuiTablePagination-toolbar": { backgroundColor: "inherit" },
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
              },
              "& .MuiTablePagination-actions": {
                background: "none"
              }
            }}
          />
        </Paper>
      </Box>

      {/* Payment Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{
          background: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          textAlign: "center"
        }}>
          Payment Details
        </DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <List disablePadding>
              {Object.entries({
                "ID": selectedPayment.id,
                "Invoice ID": selectedPayment.invoiceId || "N/A",
                "Policy Names": selectedPayment.policyNames?.join
                  ? selectedPayment.policyNames.join(", ")
                  : selectedPayment.policyNames || "N/A",
                "Insurer ID": selectedPayment.insurerId || "N/A",
                "Amount": "₹" + selectedPayment.amount,
                "Status": selectedPayment.status?.toUpperCase(),
                "Method": selectedPayment.method,
                "Auto Pay": selectedPayment.autoPay ? "Yes" : "No",
                "Paid At": selectedPayment.paidAtFormatted,
                "Razorpay Payment ID": selectedPayment.razorpayPaymentId || "N/A",
                "Razorpay Subscription ID": selectedPayment.razorpaySubscriptionId || "N/A",
              }).map(([label, value]) => (
                <React.Fragment key={label}>
                  <ListItem>
                    <ListItemText primary={label} secondary={value} />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
              {selectedPayment.taxDetails && (
                <>
                  <ListItem>
                    <ListItemText
                      primary="Tax Details"
                      secondary={
                        <>
                          <Typography component="span" variant="body2">
                            Type: {selectedPayment.taxDetails.taxType}
                          </Typography><br />
                          <Typography component="span" variant="body2">
                            Rate: {selectedPayment.taxDetails.taxRate}%
                          </Typography><br />
                          <Typography component="span" variant="body2">
                            Tax Amount: ₹{selectedPayment.taxDetails.taxAmount}
                          </Typography><br />
                          <Typography component="span" variant="body2">
                            Total Amount: ₹{selectedPayment.taxDetails.totalAmount}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  <Divider />
                </>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}















// import React, { useState, useEffect } from 'react';
// import {
//   Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
//   TableHead, TableRow, TablePagination, Dialog, DialogTitle,
//   DialogContent, DialogActions, TextField, InputAdornment, CircularProgress,
//   List, ListItem, ListItemText, Divider, Stack, Button, useTheme
// } from '@mui/material';
// import SearchIcon from "@mui/icons-material/Search";
// import axios from 'axios';

// const API_BASE = "http://localhost:9999/api/customer"; // Backend API base URL

// const columns = [
//   { id: "id", label: "ID", minWidth: 120 },
//   { id: "policyNames", label: "Policy Names", minWidth: 200 },
//   { id: "amount", label: "Amount", minWidth: 100, align: "right", format: v => "₹" + v },
//   { id: "method", label: "Method", minWidth: 100 },
//   { id: "paidAtFormatted", label: "Paid At", minWidth: 150 },
//   { id: "actions", label: "Actions", minWidth: 80, align: "center" }
// ];

// export default function CustomerPaymentHistory({ customerId }) {
//   const theme = useTheme();
//   const [enrichedPayments, setEnrichedPayments] = useState([]);
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [loading, setLoading] = useState(true);
//   const [selectedPayment, setSelectedPayment] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     if (!customerId) {
//       setError('No customer ID provided. Please log in again.');
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     axios.get(`${API_BASE}/payments/history/${customerId}`)
//       .then(async response => {
//         if (!response.data.length) {
//           setError('No payment records found for this customer.');
//           setEnrichedPayments([]);
//           return;
//         }

//         const enriched = await Promise.all(response.data.map(async payment => {
//           let policyNames = 'N/A';

//           if (payment.invoiceId) {
//             try {
//               const { data: invoice } = await axios.get(`${API_BASE}/invoices/${payment.invoiceId}`);
//               const policyIds = invoice?.policyIds || [];

//               if (policyIds.length > 0) {
//                 try {
//                   const { data: policyNamesArray } = await axios.post(`${API_BASE}/policies/names`, policyIds);
//                   policyNames = Array.isArray(policyNamesArray) ? policyNamesArray.join(", ") : 'N/A';
//                 } catch (err) {
//                   console.error('Error fetching policy names:', err);
//                   policyNames = 'Error fetching policy names';
//                 }
//               } else {
//                 policyNames = 'No Policies Associated';
//               }
//             } catch (err) {
//               console.error('Error fetching invoice:', err);
//               policyNames = 'Error fetching invoice';
//             }
//           } else if (
//             payment.policyNames &&
//             Array.isArray(payment.policyNames) &&
//             payment.policyNames.length > 0
//           ) {
//             policyNames = payment.policyNames.join(", ");
//           } else {
//             policyNames = 'No Invoice / Policies';
//           }

//           return {
//             ...payment,
//             policyNames,
//             paidAtFormatted: payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'N/A',
//           };
//         }));

//         setEnrichedPayments(enriched);
//       })
//       .catch(err => {
//         console.error('Error fetching payments:', err);
//         setError('Failed to load payment history. Please try again.');
//         setEnrichedPayments([]);
//       })
//       .finally(() => setLoading(false));
//   }, [customerId]);

//   const filteredPayments = enrichedPayments.filter(payment =>
//     (payment.policyNames?.toLowerCase().includes(search.toLowerCase()) ||
//       payment.method?.toLowerCase().includes(search.toLowerCase()))
//   );

//   useEffect(() => setPage(0), [search]);

//   if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", my: 6 }} />;

//   if (error) return (
//     <Box sx={{ py: 4, textAlign: 'center' }}>
//       <Typography variant="h6" color="error">{error}</Typography>
//     </Box>
//   );

//   const handleViewDetails = (payment) => {
//     setSelectedPayment(payment);
//     setDialogOpen(true);
//   };
//   const handleCloseDialog = () => setDialogOpen(false);

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
//       <Box
//         sx={{
//           py: 2,
//           px: 2,
//           mb: 4,
//           background: 'linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)',
//           color: 'white',
//           borderRadius: 2,
//           boxShadow: 3,
//         }}
//       >
//         <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
//           My Payment History
//         </Typography>
//       </Box>

//       <Box sx={{ maxWidth: 1300, mx: "auto" }}>
//         <TextField
//           fullWidth
//           size="small"
//           placeholder="Search by policy, method..."
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
//                 {filteredPayments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, rowIndex, arr) => (
//                   <TableRow hover tabIndex={-1} key={row.id}>
//                     {columns.map(col => {
//                       if (col.id === "actions") {
//                         return (
//                           <TableCell
//                             key={col.id}
//                             align={col.align}
//                             sx={{ borderBottom: rowIndex === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}
//                           >
//                             <Stack alignItems="center" direction="row" spacing={1}>
//                               <Button
//                                 variant="contained"
//                                 color="primary"
//                                 onClick={() => handleViewDetails(row)}
//                                 size="small"
//                                 sx={{ minWidth: 'auto' }}
//                               >
//                                 View
//                               </Button>
//                             </Stack>
//                           </TableCell>
//                         );
//                       }
//                       // --------- Only edit below block for the Amount column ---------
//                       let value = row[col.id];
//                       if (col.id === "amount") {
//                         value =
//                           row.taxDetails && typeof row.taxDetails.totalAmount === 'number'
//                             ? `₹${row.taxDetails.totalAmount}`
//                             : `₹${row.amount}`;
//                       } else if (col.format && typeof value === 'number') {
//                         value = col.format(value);
//                       }
//                       // ------------------------------------------------------------
//                       return (
//                         <TableCell
//                           key={col.id}
//                           align={col.align}
//                           sx={{ borderBottom: rowIndex === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}
//                         >
//                           {value}
//                         </TableCell>
//                       );
//                     })}
//                   </TableRow>
//                 ))}
//                 {filteredPayments.length === 0 && (
//                   <TableRow>
//                     <TableCell colSpan={columns.length} align="center">
//                       No records found.
//                     </TableCell>
//                   </TableRow>
//                 )}
//               </TableBody>
//             </Table>
//           </TableContainer>
//           <TablePagination
//             rowsPerPageOptions={[10, 25, 100]}
//             component="div"
//             count={filteredPayments.length}
//             rowsPerPage={rowsPerPage}
//             page={page}
//             onPageChange={(_, newPage) => setPage(newPage)}
//             onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
//             sx={{
//               backgroundColor: theme.palette.background.paper,
//               borderTop: `1px solid ${theme.palette.divider}`,
//               boxShadow: "none",
//               borderBottomLeftRadius: 2,
//               borderBottomRightRadius: 2,
//               "& .MuiTablePagination-toolbar": { backgroundColor: "inherit" },
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

//       {/* Payment Details Dialog */}
//       <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
//         <DialogTitle sx={{
//           background: theme.palette.primary.main,
//           color: theme.palette.primary.contrastText,
//           textAlign: "center"
//         }}>
//           Payment Details
//         </DialogTitle>
//         <DialogContent>
//           {selectedPayment && (
//             <List disablePadding>
//               {Object.entries({
//                 "ID": selectedPayment.id,
//                 "Invoice ID": selectedPayment.invoiceId || "N/A",
//                 "Policy Names": selectedPayment.policyNames?.join ? selectedPayment.policyNames.join(", ") : selectedPayment.policyNames || "N/A",
//                 "Insurer ID": selectedPayment.insurerId || "N/A",
//                 "Amount": "₹" + selectedPayment.amount,
//                 "Status": selectedPayment.status?.toUpperCase(),
//                 "Method": selectedPayment.method,
//                 "Auto Pay": selectedPayment.autoPay ? "Yes" : "No",
//                 "Paid At": selectedPayment.paidAtFormatted,
//                 "Razorpay Payment ID": selectedPayment.razorpayPaymentId || "N/A",
//                 "Razorpay Subscription ID": selectedPayment.razorpaySubscriptionId || "N/A",
//               }).map(([label, value]) => (
//                 <React.Fragment key={label}>
//                   <ListItem>
//                     <ListItemText primary={label} secondary={value} />
//                   </ListItem>
//                   <Divider />
//                 </React.Fragment>
//               ))}
//               {selectedPayment.taxDetails && (
//                 <>
//                   <ListItem>
//                     <ListItemText
//                       primary="Tax Details"
//                       secondary={
//                         <>
//                           <Typography component="span" variant="body2">Type: {selectedPayment.taxDetails.taxType}</Typography><br />
//                           <Typography component="span" variant="body2">Rate: {selectedPayment.taxDetails.taxRate}%</Typography><br />
//                           <Typography component="span" variant="body2">Tax Amount: ₹{selectedPayment.taxDetails.taxAmount}</Typography><br />
//                           <Typography component="span" variant="body2">Total Amount: ₹{selectedPayment.taxDetails.totalAmount}</Typography>
//                         </>
//                       }
//                     />
//                   </ListItem>
//                   <Divider />
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


//working
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

// const API_BASE = "http://localhost:9999/api/customer"; // Backend API base URL

// const columns = [
//   { id: "id", label: "ID", minWidth: 120 },
//   { id: "policyNames", label: "Policy Names", minWidth: 200 },
//   { id: "amount", label: "Amount", minWidth: 100, align: "right", format: v => "₹" + v },
//   { id: "method", label: "Method", minWidth: 100 },
//   { id: "paidAtFormatted", label: "Paid At", minWidth: 150 },
//   { id: "actions", label: "Actions", minWidth: 80, align: "center" }
// ];

// export default function CustomerPaymentHistory({ customerId }) {
//   const theme = useTheme();
//   const [enrichedPayments, setEnrichedPayments] = useState([]);
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [loading, setLoading] = useState(true);
//   const [selectedPayment, setSelectedPayment] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     if (!customerId) {
//       setError('No customer ID provided. Please log in again.');
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     axios.get(`${API_BASE}/payments/history/${customerId}`)
//       .then(async response => {
//         if (!response.data.length) {
//           setError('No payment records found for this customer.');
//           setEnrichedPayments([]);
//           return;
//         }

//         const enriched = await Promise.all(response.data.map(async payment => {
//           let policyNames = 'N/A';

//           if (payment.invoiceId) {
//             // Fetch policy names from invoice and then policy service
//             try {
//               const { data: invoice } = await axios.get(`${API_BASE}/invoices/${payment.invoiceId}`);
//               const policyIds = invoice?.policyIds || [];

//               if (policyIds.length > 0) {
//                 try {
//                   const { data: policyNamesArray } = await axios.post(`${API_BASE}/policies/names`, policyIds);
//                   policyNames = Array.isArray(policyNamesArray) ? policyNamesArray.join(", ") : 'N/A';
//                 } catch (err) {
//                   console.error('Error fetching policy names:', err);
//                   policyNames = 'Error fetching policy names';
//                 }
//               } else {
//                 policyNames = 'No Policies Associated';
//               }
//             } catch (err) {
//               console.error('Error fetching invoice:', err);
//               policyNames = 'Error fetching invoice';
//             }
//           } else if (payment.policyNames && Array.isArray(payment.policyNames) && payment.policyNames.length > 0) {
//             // Use policy names directly from payment (for autopay payments)
//             policyNames = payment.policyNames.join(", ");
//           } else {
//             policyNames = 'No Invoice / Policies';
//           }

//           return {
//             ...payment,
//             policyNames,
//             paidAtFormatted: payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'N/A',
//           };
//         }));

//         setEnrichedPayments(enriched);
//       })
//       .catch(err => {
//         console.error('Error fetching payments:', err);
//         setError('Failed to load payment history. Please try again.');
//         setEnrichedPayments([]);
//       })
//       .finally(() => setLoading(false));
//   }, [customerId]);

//   // Filter payments based on search query (case-insensitive on policy names or method)
//   const filteredPayments = enrichedPayments.filter(payment =>
//     (payment.policyNames?.toLowerCase().includes(search.toLowerCase()) ||
//       payment.method?.toLowerCase().includes(search.toLowerCase()))
//   );

//   useEffect(() => setPage(0), [search]);

//   if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", my: 6 }} />;

//   if (error) return (
//     <Box sx={{ py: 4, textAlign: 'center' }}>
//       <Typography variant="h6" color="error">{error}</Typography>
//     </Box>
//   );

//   // Dialog handlers
//   const handleViewDetails = (payment) => {
//     setSelectedPayment(payment);
//     setDialogOpen(true);
//   };
//   const handleCloseDialog = () => setDialogOpen(false);

//   // Scrollbar styles (optional)
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
//       {/* Updated Header with Gradient */}
//       <Box
//         sx={{
//           py: 2,
//           px: 2,
//           mb: 4,
//           background: 'linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)',
//           color: 'white',
//           borderRadius: 2,
//           boxShadow: 3,
//         }}
//       >
//         <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
//           My Payment History
//         </Typography>
//       </Box>

//       <Box sx={{ maxWidth: 1300, mx: "auto" }}>
//         <TextField
//           fullWidth
//           size="small"
//           placeholder="Search by policy, method..."
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
//                 {filteredPayments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, rowIndex, arr) => (
//                   <TableRow hover tabIndex={-1} key={row.id}>
//                     {columns.map(col => {
//                       if (col.id === "actions") {
//                         return (
//                           <TableCell
//                             key={col.id}
//                             align={col.align}
//                             sx={{ borderBottom: rowIndex === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}
//                           >
//                             <Stack alignItems="center" direction="row" spacing={1}>
//                               {/* Replaced icon button with a text button */}
//                               <Button
//                                 variant="contained"
//                                 color="primary"
//                                 onClick={() => handleViewDetails(row)}
//                                 size="small"
//                                 sx={{ minWidth: 'auto' }}
//                               >
//                                 View
//                               </Button>
//                             </Stack>
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
//                           sx={{ borderBottom: rowIndex === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}
//                         >
//                           {value}
//                         </TableCell>
//                       );
//                     })}
//                   </TableRow>
//                 ))}
//                 {filteredPayments.length === 0 && (
//                   <TableRow>
//                     <TableCell colSpan={columns.length} align="center">
//                       No records found.
//                     </TableCell>
//                   </TableRow>
//                 )}
//               </TableBody>
//             </Table>
//           </TableContainer>
//           <TablePagination
//             rowsPerPageOptions={[10, 25, 100]}
//             component="div"
//             count={filteredPayments.length}
//             rowsPerPage={rowsPerPage}
//             page={page}
//             onPageChange={(_, newPage) => setPage(newPage)}
//             onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
//             sx={{
//               backgroundColor: theme.palette.background.paper,
//               borderTop: `1px solid ${theme.palette.divider}`,
//               boxShadow: "none",
//               borderBottomLeftRadius: 2,
//               borderBottomRightRadius: 2,
//               "& .MuiTablePagination-toolbar": { backgroundColor: "inherit" },
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

//       {/* Payment Details Dialog */}
//       <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
//         <DialogTitle sx={{
//           background: theme.palette.primary.main,
//           color: theme.palette.primary.contrastText,
//           textAlign: "center"
//         }}>
//           Payment Details
//         </DialogTitle>
//         <DialogContent>
//           {selectedPayment && (
//             <List disablePadding>
//               {Object.entries({
//                 "ID": selectedPayment.id,
//                 "Invoice ID": selectedPayment.invoiceId || "N/A",
//                 "Policy Names": selectedPayment.policyNames?.join ? selectedPayment.policyNames.join(", ") : selectedPayment.policyNames || "N/A",
//                 "Insurer ID": selectedPayment.insurerId || "N/A",
//                 "Amount": "₹" + selectedPayment.amount,
//                 "Status": selectedPayment.status?.toUpperCase(),
//                 "Method": selectedPayment.method,
//                 "Auto Pay": selectedPayment.autoPay ? "Yes" : "No",
//                 "Paid At": selectedPayment.paidAtFormatted,
//                 "Razorpay Payment ID": selectedPayment.razorpayPaymentId || "N/A",
//                 "Razorpay Subscription ID": selectedPayment.razorpaySubscriptionId || "N/A",
//               }).map(([label, value]) => (
//                 <React.Fragment key={label}>
//                   <ListItem>
//                     <ListItemText primary={label} secondary={value} />
//                   </ListItem>
//                   <Divider />
//                 </React.Fragment>
//               ))}
//               {selectedPayment.taxDetails && (
//                 <>
//                   <ListItem>
//                     <ListItemText
//                       primary="Tax Details"
//                       secondary={
//                         <>
//                           <Typography component="span" variant="body2">Type: {selectedPayment.taxDetails.taxType}</Typography><br />
//                           <Typography component="span" variant="body2">Rate: {selectedPayment.taxDetails.taxRate}%</Typography><br />
//                           <Typography component="span" variant="body2">Tax Amount: ₹{selectedPayment.taxDetails.taxAmount}</Typography><br />
//                           <Typography component="span" variant="body2">Total Amount: ₹{selectedPayment.taxDetails.totalAmount}</Typography>
//                         </>
//                       }
//                     />
//                   </ListItem>
//                   <Divider />
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

// const API_BASE = "http://localhost:9999/api/customer"; // Backend API base URL

// const columns = [
//   { id: "id", label: "ID", minWidth: 120 },
//   { id: "policyNames", label: "Policy Names", minWidth: 200 },
//   { id: "amount", label: "Amount", minWidth: 100, align: "right", format: v => "₹" + v },
//   { id: "method", label: "Method", minWidth: 100 },
//   { id: "paidAtFormatted", label: "Paid At", minWidth: 150 },
//   { id: "actions", label: "Actions", minWidth: 80, align: "center" }
// ];

// export default function CustomerPaymentHistory({ customerId }) {
//   const theme = useTheme();
//   const [enrichedPayments, setEnrichedPayments] = useState([]);
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [loading, setLoading] = useState(true);
//   const [selectedPayment, setSelectedPayment] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     if (!customerId) {
//       setError('No customer ID provided. Please log in again.');
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     axios.get(`${API_BASE}/payments/history/${customerId}`)
//       .then(async response => {
//         if (!response.data.length) {
//           setError('No payment records found for this customer.');
//           setEnrichedPayments([]);
//           return;
//         }

//         const enriched = await Promise.all(response.data.map(async payment => {
//           let policyNames = 'N/A';

//           if (payment.invoiceId) {
//             // Fetch policy names from invoice and then policy service
//             try {
//               const { data: invoice } = await axios.get(`${API_BASE}/invoices/${payment.invoiceId}`);
//               const policyIds = invoice?.policyIds || [];

//               if (policyIds.length > 0) {
//                 try {
//                   const { data: policyNamesArray } = await axios.post(`${API_BASE}/policies/names`, policyIds);
//                   policyNames = Array.isArray(policyNamesArray) ? policyNamesArray.join(", ") : 'N/A';
//                 } catch (err) {
//                   console.error('Error fetching policy names:', err);
//                   policyNames = 'Error fetching policy names';
//                 }
//               } else {
//                 policyNames = 'No Policies Associated';
//               }
//             } catch (err) {
//               console.error('Error fetching invoice:', err);
//               policyNames = 'Error fetching invoice';
//             }
//           } else if (payment.policyNames && Array.isArray(payment.policyNames) && payment.policyNames.length > 0) {
//             // Use policy names directly from payment (for autopay payments)
//             policyNames = payment.policyNames.join(", ");
//           } else {
//             policyNames = 'No Invoice / Policies';
//           }

//           return {
//             ...payment,
//             policyNames,
//             paidAtFormatted: payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'N/A',
//           };
//         }));

//         setEnrichedPayments(enriched);
//       })
//       .catch(err => {
//         console.error('Error fetching payments:', err);
//         setError('Failed to load payment history. Please try again.');
//         setEnrichedPayments([]);
//       })
//       .finally(() => setLoading(false));
//   }, [customerId]);

//   // Filter payments based on search query (case-insensitive on policy names or method)
//   const filteredPayments = enrichedPayments.filter(payment =>
//     (payment.policyNames?.toLowerCase().includes(search.toLowerCase()) ||
//       payment.method?.toLowerCase().includes(search.toLowerCase()))
//   );

//   useEffect(() => setPage(0), [search]);

//   if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", my: 6 }} />;

//   if (error) return (
//     <Box sx={{ py: 4, textAlign: 'center' }}>
//       <Typography variant="h6" color="error">{error}</Typography>
//     </Box>
//   );

//   // Dialog handlers
//   const handleViewDetails = (payment) => {
//     setSelectedPayment(payment);
//     setDialogOpen(true);
//   };
//   const handleCloseDialog = () => setDialogOpen(false);

//   // Scrollbar styles (optional)
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
//       <Typography variant="h4" gutterBottom align="center">My Payment History</Typography>
//       <Box sx={{ maxWidth: 1300, mx: "auto" }}>
//         <TextField
//           fullWidth
//           size="small"
//           placeholder="Search by policy, method..."
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
//                 {filteredPayments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, rowIndex, arr) => (
//                   <TableRow hover tabIndex={-1} key={row.id}>
//                     {columns.map(col => {
//                       if (col.id === "actions") {
//                         return (
//                           <TableCell
//                             key={col.id}
//                             align={col.align}
//                             sx={{ borderBottom: rowIndex === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}
//                           >
//                             <Stack alignItems="center" direction="row" spacing={1}>
//                               <IconButton color="primary" onClick={() => handleViewDetails(row)}>
//                                 <VisibilityIcon />
//                               </IconButton>
//                             </Stack>
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
//                           sx={{ borderBottom: rowIndex === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}
//                         >
//                           {value}
//                         </TableCell>
//                       );
//                     })}
//                   </TableRow>
//                 ))}
//                 {filteredPayments.length === 0 && (
//                   <TableRow>
//                     <TableCell colSpan={columns.length} align="center">
//                       No records found.
//                     </TableCell>
//                   </TableRow>
//                 )}
//               </TableBody>
//             </Table>
//           </TableContainer>
//           <TablePagination
//             rowsPerPageOptions={[10, 25, 100]}
//             component="div"
//             count={filteredPayments.length}
//             rowsPerPage={rowsPerPage}
//             page={page}
//             onPageChange={(_, newPage) => setPage(newPage)}
//             onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
//             sx={{
//               backgroundColor: theme.palette.background.paper,
//               borderTop: `1px solid ${theme.palette.divider}`,
//               boxShadow: "none",
//               borderBottomLeftRadius: 2,
//               borderBottomRightRadius: 2,
//               "& .MuiTablePagination-toolbar": { backgroundColor: "inherit" },
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

//       {/* Payment Details Dialog */}
//       <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
//         <DialogTitle sx={{
//           background: theme.palette.primary.main,
//           color: theme.palette.primary.contrastText,
//           textAlign: "center"
//         }}>
//           Payment Details
//         </DialogTitle>
//         <DialogContent>
//           {selectedPayment && (
//             <List disablePadding>
//               {Object.entries({
//                 "ID": selectedPayment.id,
//                 "Invoice ID": selectedPayment.invoiceId || "N/A",
//                 "Policy Names": selectedPayment.policyNames?.join ? selectedPayment.policyNames.join(", ") : selectedPayment.policyNames || "N/A",
//                 "Insurer ID": selectedPayment.insurerId || "N/A",
//                 "Amount": "₹" + selectedPayment.amount,
//                 "Status": selectedPayment.status?.toUpperCase(),
//                 "Method": selectedPayment.method,
//                 "Auto Pay": selectedPayment.autoPay ? "Yes" : "No",
//                 "Paid At": selectedPayment.paidAtFormatted,
//                 "Razorpay Payment ID": selectedPayment.razorpayPaymentId || "N/A",
//                 "Razorpay Subscription ID": selectedPayment.razorpaySubscriptionId || "N/A",
//               }).map(([label, value]) => (
//                 <React.Fragment key={label}>
//                   <ListItem>
//                     <ListItemText primary={label} secondary={value} />
//                   </ListItem>
//                   <Divider />
//                 </React.Fragment>
//               ))}
//               {selectedPayment.taxDetails && (
//                 <>
//                   <ListItem>
//                     <ListItemText
//                       primary="Tax Details"
//                       secondary={
//                         <>
//                           <Typography component="span" variant="body2">Type: {selectedPayment.taxDetails.taxType}</Typography><br />
//                           <Typography component="span" variant="body2">Rate: {selectedPayment.taxDetails.taxRate}%</Typography><br />
//                           <Typography component="span" variant="body2">Tax Amount: ₹{selectedPayment.taxDetails.taxAmount}</Typography><br />
//                           <Typography component="span" variant="body2">Total Amount: ₹{selectedPayment.taxDetails.totalAmount}</Typography>
//                         </>
//                       }
//                     />
//                   </ListItem>
//                   <Divider />
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












// src/components/customer/CustomerPaymentHistory.jsx
// src/components/customer/CustomerPaymentHistory.jsx
// src/components/customer/CustomerPaymentHistory.jsx
// src/components/customer/CustomerPaymentHistory.jsx
// src/components/customer/CustomerPaymentHistory.jsx
// src/components/customer/CustomerPaymentHistory.jsx
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

// const API_BASE = "http://localhost:9999/api/customer"; // Ensure this matches your backend API base for customer endpoints

// const columns = [
//   { id: "id", label: "ID", minWidth: 120 },
//   { id: "policyNames", label: "Policy Names", minWidth: 200 },
//   { id: "amount", label: "Amount", minWidth: 100, align: "right", format: v => "₹" + v },
//   { id: "method", label: "Method", minWidth: 100 },
//   { id: "paidAtFormatted", label: "Paid At", minWidth: 150 },
//   { id: "actions", label: "Actions", minWidth: 80, align: "center" }
// ];

// export default function CustomerPaymentHistory({ customerId }) {  // customerId passed as prop from login/auth
//   const theme = useTheme();
//   const [enrichedPayments, setEnrichedPayments] = useState([]);
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [loading, setLoading] = useState(true);  // Start as true to show loading initially
//   const [selectedPayment, setSelectedPayment] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [error, setError] = useState(null);  // Added for error handling

//   useEffect(() => {
//     if (!customerId) {
//       setError('No customer ID provided. Please log in again.');
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setError(null);
//     axios.get(`${API_BASE}/payments/history/${customerId}`)
//       .then(async response => {
//         if (response.data.length === 0) {
//           setError('No payment records found for this customer.');
//         }
//         const enriched = await Promise.all(response.data.map(async payment => {
//           let policyNames = 'N/A';
//           if (payment.invoiceId) {
//             try {
//               const { data: inv } = await axios.get(`${API_BASE}/invoices/${payment.invoiceId}`);
//               const policyIds = inv.policyIds || [];
//               if (policyIds.length > 0) {
//                 try {
//                   const { data: policyNamesArray } = await axios.post(`${API_BASE}/policies/names`, policyIds);
//                   policyNames = Array.isArray(policyNamesArray) ? policyNamesArray.join(", ") : 'N/A';
//                 } catch (err) {
//                   console.error('Error fetching policy names:', err);
//                   policyNames = 'Error fetching policy names';
//                 }
//               } else {
//                 policyNames = 'No Policies Associated';
//               }
//             } catch (err) {
//               console.error('Error fetching invoice:', err);
//               policyNames = 'Error fetching invoice';
//             }
//           } else {
//             policyNames = 'No Invoice ID';
//           }
//           return {
//             ...payment,
//             policyNames,
//             paidAtFormatted: payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'N/A'
//           }
//         }));
//         setEnrichedPayments(enriched);
//       })
//       .catch(err => {
//         console.error('Error fetching payments:', err);
//         setError('Failed to load payment history. Please try again.');
//       })
//       .finally(() => setLoading(false));
//   }, [customerId]);

//   // Filter
//   const filteredPayments = enrichedPayments.filter(payment =>
//     (payment.policyNames?.toLowerCase().includes(search.toLowerCase()) ||
//       payment.method?.toLowerCase().includes(search.toLowerCase()))
//   );

//   useEffect(() => setPage(0), [search]);

//   if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", my: 6 }} />;

//   if (error) return (
//     <Box sx={{ py: 4, textAlign: 'center' }}>
//       <Typography variant="h6" color="error">{error}</Typography>
//     </Box>
//   );

//   // Details dialog
//   const handleViewDetails = (row) => {
//     setSelectedPayment(row);
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
//       <Typography variant="h4" gutterBottom align="center">My Payment History</Typography>
//       <Box sx={{ maxWidth: 1300, mx: "auto" }}>
//         <TextField
//           fullWidth
//           size="small"
//           placeholder="Search by policy, method..."
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
//                 {filteredPayments
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
//                 {filteredPayments.length === 0 &&
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
//             count={filteredPayments.length}
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
//           Payment Details
//         </DialogTitle>
//         <DialogContent>
//           {selectedPayment && (
//             <List disablePadding>
//               {Object.entries({
//                 "ID": selectedPayment.id,
//                 "Invoice ID": selectedPayment.invoiceId || "N/A",
//                 "Policy Names": selectedPayment.policyNames,
//                 "Insurer ID": selectedPayment.insurerId || "N/A",
//                 "Amount": "₹" + selectedPayment.amount,
//                 "Status": selectedPayment.status && selectedPayment.status.toUpperCase(),
//                 "Method": selectedPayment.method,
//                 "Auto Pay": selectedPayment.isAutoPay ? "Yes" : "No",
//                 "Paid At": selectedPayment.paidAtFormatted,
//                 "Razorpay Payment ID": selectedPayment.razorpayPaymentId || "N/A",
//                 "Razorpay Subscription ID": selectedPayment.razorpaySubscriptionId || "N/A",
//               }).map(([label, value]) => (
//                 <React.Fragment key={label}>
//                   <ListItem>
//                     <ListItemText primary={label} secondary={value} />
//                   </ListItem>
//                   <Divider />
//                 </React.Fragment>
//               ))}
//               {selectedPayment.taxDetails && (
//                 <>
//                   <ListItem>
//                     <ListItemText
//                       primary="Tax Details"
//                       secondary={(
//                         <>
//                           <Typography component="span" variant="body2">Type: {selectedPayment.taxDetails.taxType}</Typography><br />
//                           <Typography component="span" variant="body2">Rate: {selectedPayment.taxDetails.taxRate}%</Typography><br />
//                           <Typography component="span" variant="body2">Tax Amount: ₹{selectedPayment.taxDetails.taxAmount}</Typography><br />
//                           <Typography component="span" variant="body2">Total Amount: ₹{selectedPayment.taxDetails.totalAmount}</Typography>
//                         </>
//                       )}
//                     />
//                   </ListItem>
//                   <Divider />
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
