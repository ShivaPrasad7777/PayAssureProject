import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";

const API_BASE = "http://localhost:9999/api/insurer";

const columns = [
  { id: "id", label: "PAYMENT ID", minWidth: 140 },
  { id: "customerName", label: "CUSTOMER", minWidth: 180 },
  {
    id: "amount",
    label: "AMOUNT",
    minWidth: 120,
    align: "right",
    // We won't use this format function directly in rendering; handle in body
  },
  { id: "status", label: "STATUS", minWidth: 120 },
  { id: "method", label: "METHOD", minWidth: 140 },
  { id: "paidAtFormatted", label: "PAID AT", minWidth: 160 },
  { id: "actions", label: "ACTIONS", minWidth: 100, align: "center" },
];

export default function InsurerPaymentHistory() {
  const theme = useTheme();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/payments/history`);
        const enriched = await Promise.all(
          res.data.map(async (payment) => {
            let customerName = "Unknown";
            if (payment.customerId) {
              try {
                const custRes = await axios.get(`${API_BASE}/customers/${payment.customerId}`);
                customerName = custRes.data?.name || "Unknown";
              } catch {
                customerName = "Error fetching customer";
              }
            }
            const paidAtFormatted = payment.paidAt
              ? new Date(payment.paidAt).toLocaleString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "N/A";
            return {
              ...payment,
              customerName,
              paidAtFormatted,
              method: payment.method || "N/A",
            };
          })
        );
        setPayments(enriched);
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, []);

  const filteredPayments = payments.filter((payment) => {
    const normalizedSearch = search.toLowerCase();
    const normalizedMethodFilter = methodFilter.toLowerCase();

    const matchesSearch =
      (payment.id || "").toLowerCase().includes(normalizedSearch) ||
      (payment.customerName || "").toLowerCase().includes(normalizedSearch) ||
      (payment.method || "").toLowerCase().includes(normalizedSearch) ||
      (payment.status || "").toLowerCase().includes(normalizedSearch);

    const matchesMethod =
      methodFilter === "All" || (payment.method || "").toLowerCase() === normalizedMethodFilter;

    return matchesSearch && matchesMethod;
  });

  useEffect(() => {
    setPage(0);
  }, [search, methodFilter]);

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPayment(null);
  };

  return (
    <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, minHeight: "100vh" }}>
      <Box
        sx={{
          py: 2,
          px: 2,
          mb: 4,
          background: `linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)`,
          color: "white",
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: "bold" }}>
          Payment History
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1300, mx: "auto" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by ID, customer, status, or method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
                boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.05)}`,
                border: `1px solid ${theme.palette.divider}`,
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`,
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                },
                "&.Mui-focused": {
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
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="method-filter-label">Method</InputLabel>
            <Select
              labelId="method-filter-label"
              id="method-filter"
              value={methodFilter}
              label="Method"
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <MenuItem value="All">All Methods</MenuItem>
              <MenuItem value="razorpay">Razorpay</MenuItem>
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="autopaid">Auto Paid</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {loading ? (
          <Typography align="center" sx={{ py: 10 }}>
            Loading payment data...
          </Typography>
        ) : (
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              overflow: "hidden",
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.background.paper,
            }}
          >
            <TableContainer sx={{ maxHeight: 440 }}>
              <Table stickyHeader aria-label="payment history table">
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        align={column.align}
                        sx={{
                          minWidth: column.minWidth,
                          bgcolor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((row, rowIdx, arr) => (
                        <TableRow
                          hover
                          tabIndex={-1}
                          key={row.id}
                          sx={{ cursor: "pointer" }}
                          onClick={() => handleView(row)}
                        >
                          {columns.map((col) => {
                            if (col.id === "actions") {
                              return (
                                <TableCell
                                  key={col.id}
                                  align={col.align}
                                  sx={{
                                    borderBottom:
                                      rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`,
                                  }}
                                >
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    startIcon={<VisibilityIcon />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleView(row);
                                    }}
                                    sx={{
                                      borderRadius: 1,
                                      fontWeight: 600,
                                      textTransform: "none",
                                      transition: "all 0.2s ease-in-out",
                                      "&:hover": {
                                        transform: "scale(1.05)",
                                        boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
                                      },
                                    }}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              );
                            }

                            let value = row[col.id];
                            // Here update the amount column to show GST-inclusive total amount for autopay
                            if (col.id === "amount") {
                              value =
                                row.method?.toLowerCase() === "autopaid" &&
                                row.taxDetails &&
                                typeof row.taxDetails.totalAmount === "number"
                                  ? `${row.taxDetails.totalAmount.toLocaleString()}`
                                  : col.format && typeof value === "number"
                                  ? col.format(value)
                                  : value;
                            } else if (col.format && typeof value === "number") {
                              value = col.format(value);
                            }

                            return (
                              <TableCell
                                key={col.id}
                                align={col.align}
                                sx={{
                                  borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`,
                                }}
                              >
                                {value}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
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
              onPageChange={(_, np) => setPage(np)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(+e.target.value);
                setPage(0);
              }}
              sx={{
                backgroundColor: theme.palette.background.paper,
                borderTop: `1px solid ${theme.palette.divider}`,
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
                "& .MuiTablePagination-toolbar": { backgroundColor: "inherit" },
                "& .MuiIconButton-root": {
                  background: "none",
                  color: theme.palette.text.primary,
                  borderRadius: "50%",
                  transition: "box-shadow 0.2s, background 0.2s, color 0.2s, transform 0.2s",
                  boxShadow: "none",
                  "&:hover, &:focus": {
                    background: theme.palette.action.hover,
                    color: theme.palette.primary.main,
                    boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
                    outline: "none",
                    transform: "scale(1.08)",
                  },
                  "&.Mui-disabled": {
                    color: theme.palette.action.disabled,
                    background: "none",
                    boxShadow: "none",
                  },
                },
              }}
            />
          </Paper>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ background: theme.palette.primary.main, color: theme.palette.primary.contrastText, textAlign: "center" }}>
          Payment Details
        </DialogTitle>

        <DialogContent dividers>
          {selectedPayment ? (
            <List disablePadding>
              <ListItem>
                <ListItemText primary="Payment ID" secondary={selectedPayment.id || "N/A"} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Customer Name" secondary={selectedPayment.customerName || "N/A"} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Amount"
                  secondary={
                    selectedPayment.method?.toLowerCase() === "autopaid" &&
                    selectedPayment.taxDetails &&
                    selectedPayment.taxDetails.totalAmount !== undefined
                      ? `${selectedPayment.taxDetails.totalAmount.toLocaleString()}`
                      : selectedPayment.amount
                      ? `${selectedPayment.amount.toLocaleString()}`
                      : "N/A"
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="Status" secondary={selectedPayment.status?.toUpperCase() || "N/A"} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Method" secondary={selectedPayment.method?.toUpperCase() || "N/A"} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Paid At" secondary={selectedPayment.paidAtFormatted || "N/A"} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Razorpay Payment ID" secondary={selectedPayment.razorpayPaymentId || "N/A"} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Razorpay Signature" secondary={selectedPayment.razorpaySignature || "N/A"} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Invoice ID" secondary={selectedPayment.invoiceId || "N/A"} />
              </ListItem>

              {/* Show policy IDs and names ONLY if method is "autopaid" */}
              {selectedPayment.method?.toLowerCase() === "autopaid" && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" sx={{ px: 2, mb: 1 }}>
                    Policies
                  </Typography>
                  <ListItem>
                    <ListItemText
                      primary="Policy IDs"
                      secondary={
                        Array.isArray(selectedPayment.policyIds) && selectedPayment.policyIds.length > 0
                          ? selectedPayment.policyIds.join(", ")
                          : "N/A"
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Policy Names"
                      secondary={
                        Array.isArray(selectedPayment.policyNames) && selectedPayment.policyNames.length > 0
                          ? selectedPayment.policyNames.join(", ")
                          : "N/A"
                      }
                    />
                  </ListItem>
                </>
              )}
            </List>
          ) : (
            <Typography>No payment selected.</Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained" color="primary" fullWidth>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}










// import React, { useState, useEffect } from "react";
// import {
//   Box,
//   Typography,
//   Paper,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   TablePagination,
//   Button,
//   useTheme,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   InputAdornment,
//   List,
//   ListItem,
//   ListItemText,
//   Divider,
//   Stack,
//   Select,
//   MenuItem,
//   FormControl,
//   InputLabel,
//   alpha,
// } from "@mui/material";

// import SearchIcon from "@mui/icons-material/Search";
// import VisibilityIcon from "@mui/icons-material/Visibility";
// import LaunchIcon from "@mui/icons-material/Launch";
// import axios from "axios";

// const API_BASE = "http://localhost:9999/api/insurer";

// const columns = [
//   { id: "id", label: "PAYMENT ID", minWidth: 140 },
//   { id: "customerName", label: "CUSTOMER", minWidth: 180 },
//   { id: "amount", label: "AMOUNT", minWidth: 120, align: "right", format: (v) => `₹${v?.toLocaleString()}` },
//   { id: "status", label: "STATUS", minWidth: 120 },
//   { id: "method", label: "METHOD", minWidth: 140 },
//   { id: "paidAtFormatted", label: "PAID AT", minWidth: 160 },
//   { id: "actions", label: "ACTIONS", minWidth: 100, align: "center" },
// ];

// export default function InsurerPaymentHistory() {
//   const theme = useTheme();

//   const [payments, setPayments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [methodFilter, setMethodFilter] = useState("All");
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [selectedPayment, setSelectedPayment] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);

//   useEffect(() => {
//     async function fetchPayments() {
//       setLoading(true);
//       try {
//         const res = await axios.get(`${API_BASE}/payments/history`);
//         const enriched = await Promise.all(
//           res.data.map(async (payment) => {
//             let customerName = "Unknown";
//             if (payment.customerId) {
//               try {
//                 const custRes = await axios.get(`${API_BASE}/customers/${payment.customerId}`);
//                 customerName = custRes.data?.name || "Unknown";
//               } catch {
//                 customerName = "Error fetching customer";
//               }
//             }
//             const paidAtFormatted = payment.paidAt
//               ? new Date(payment.paidAt).toLocaleString("en-US", {
//                   year: "numeric",
//                   month: "short",
//                   day: "numeric",
//                   hour: "2-digit",
//                   minute: "2-digit",
//                   hour12: true,
//                 })
//               : "N/A";
//             return {
//               ...payment,
//               customerName,
//               paidAtFormatted,
//               method: payment.method || "N/A",
//             };
//           })
//         );
//         setPayments(enriched);
//       } catch (error) {
//         console.error("Error fetching payments:", error);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchPayments();
//   }, []);

//   const filteredPayments = payments.filter((payment) => {
//     const normalizedSearch = search.toLowerCase();
//     const normalizedMethodFilter = methodFilter.toLowerCase();

//     const matchesSearch =
//       (payment.id || "").toLowerCase().includes(normalizedSearch) ||
//       (payment.customerName || "").toLowerCase().includes(normalizedSearch) ||
//       (payment.method || "").toLowerCase().includes(normalizedSearch) ||
//       (payment.status || "").toLowerCase().includes(normalizedSearch);

//     const matchesMethod = methodFilter === "All" || (payment.method || "").toLowerCase() === normalizedMethodFilter;

//     return matchesSearch && matchesMethod;
//   });

//   useEffect(() => {
//     setPage(0);
//   }, [search, methodFilter]);

//   const handleView = (payment) => {
//     setSelectedPayment(payment);
//     setDialogOpen(true);
//   };

//   const handleCloseDialog = () => {
//     setDialogOpen(false);
//     setSelectedPayment(null);
//   };

//   return (
//     <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, minHeight: "100vh" }}>
//       <Box
//         sx={{
//           py: 2,
//           px: 2,
//           mb: 4,
//           background: `linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)`,
//           color: "white",
//           borderRadius: 2,
//           boxShadow: 3,
//         }}
//       >
//         <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: "bold" }}>
//           Payment History
//         </Typography>
//       </Box>

//       <Box sx={{ maxWidth: 1300, mx: "auto" }}>
//         <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
//           <TextField
//             fullWidth
//             size="small"
//             placeholder="Search by ID, customer, status, or method..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             sx={{
//               "& .MuiOutlinedInput-root": {
//                 borderRadius: 2,
//                 backgroundColor: theme.palette.background.paper,
//                 boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.05)}`,
//                 border: `1px solid ${theme.palette.divider}`,
//                 transition: "all 0.3s ease",
//                 "&:hover": {
//                   boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`,
//                   borderColor: alpha(theme.palette.primary.main, 0.3),
//                 },
//                 "&.Mui-focused": {
//                   boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
//                   borderColor: theme.palette.primary.main,
//                 },
//               },
//             }}
//             InputProps={{
//               startAdornment: (
//                 <InputAdornment position="start">
//                   <SearchIcon color="primary" />
//                 </InputAdornment>
//               ),
//             }}
//           />
//           <FormControl size="small" sx={{ minWidth: 180 }}>
//             <InputLabel id="method-filter-label">Method</InputLabel>
//             <Select
//               labelId="method-filter-label"
//               id="method-filter"
//               value={methodFilter}
//               label="Method"
//               onChange={(e) => setMethodFilter(e.target.value)}
//             >
//               <MenuItem value="All">All Methods</MenuItem>
//               <MenuItem value="razorpay">Razorpay</MenuItem>
//               <MenuItem value="cash">Cash</MenuItem>
//               <MenuItem value="autopaid">Auto Paid</MenuItem>
//             </Select>
//           </FormControl>
//         </Stack>

//         {loading ? (
//           <Typography align="center" sx={{ py: 10 }}>
//             Loading payment data...
//           </Typography>
//         ) : (
//           <Paper
//             elevation={0}
//             sx={{
//               width: "100%",
//               overflow: "hidden",
//               borderRadius: 2,
//               border: `1px solid ${theme.palette.divider}`,
//               bgcolor: theme.palette.background.paper,
//             }}
//           >
//             <TableContainer sx={{ maxHeight: 440 }}>
//               <Table stickyHeader aria-label="payment history table">
//                 <TableHead>
//                   <TableRow>
//                     {columns.map((column) => (
//                       <TableCell
//                         key={column.id}
//                         align={column.align}
//                         sx={{
//                           minWidth: column.minWidth,
//                           bgcolor: theme.palette.primary.main,
//                           color: theme.palette.primary.contrastText,
//                           fontWeight: 700,
//                           textTransform: "uppercase",
//                           borderBottom: `1px solid ${theme.palette.divider}`,
//                         }}
//                       >
//                         {column.label}
//                       </TableCell>
//                     ))}
//                   </TableRow>
//                 </TableHead>
//                 <TableBody>
//                   {filteredPayments.length === 0 ? (
//                     <TableRow>
//                       <TableCell colSpan={columns.length} align="center">
//                         No records found.
//                       </TableCell>
//                     </TableRow>
//                   ) : (
//                     filteredPayments
//                       .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
//                       .map((row, rowIdx, arr) => (
//                         <TableRow
//                           hover
//                           tabIndex={-1}
//                           key={row.id}
//                           sx={{ cursor: "pointer" }}
//                           onClick={() => handleView(row)}
//                         >
//                           {columns.map((col) => {
//                             if (col.id === "actions") {
//                               return (
//                                 <TableCell
//                                   key={col.id}
//                                   align={col.align}
//                                   sx={{
//                                     borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`,
//                                   }}
//                                 >
//                                   <Button
//                                     variant="contained"
//                                     color="primary"
//                                     size="small"
//                                     startIcon={<VisibilityIcon />}
//                                     onClick={(e) => {
//                                       e.stopPropagation();
//                                       handleView(row);
//                                     }}
//                                     sx={{
//                                       borderRadius: 1,
//                                       fontWeight: 600,
//                                       textTransform: "none",
//                                       transition: "all 0.2s ease-in-out",
//                                       "&:hover": {
//                                         transform: "scale(1.05)",
//                                         boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
//                                       },
//                                     }}
//                                   >
//                                     View
//                                   </Button>
//                                 </TableCell>
//                               );
//                             }

//                             if (col.id === "status") {
//                               return (
//                                 <TableCell
//                                   key={col.id}
//                                   align={col.align}
//                                   sx={{
//                                     borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`,
//                                   }}
//                                 >
//                                   {row[col.id]?.toUpperCase() || "N/A"}
//                                 </TableCell>
//                               );
//                             }

//                             let v = row[col.id];
//                             if (col.format && typeof v === "number") v = col.format(v);

//                             return (
//                               <TableCell
//                                 key={col.id}
//                                 align={col.align}
//                                 sx={{
//                                   borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`,
//                                 }}
//                               >
//                                 {v}
//                               </TableCell>
//                             );
//                           })}
//                         </TableRow>
//                       ))
//                   )}
//                 </TableBody>
//               </Table>
//             </TableContainer>
//             <TablePagination
//               rowsPerPageOptions={[10, 25, 100]}
//               component="div"
//               count={filteredPayments.length}
//               rowsPerPage={rowsPerPage}
//               page={page}
//               onPageChange={(_, np) => setPage(np)}
//               onRowsPerPageChange={(e) => {
//                 setRowsPerPage(+e.target.value);
//                 setPage(0);
//               }}
//               sx={{
//                 backgroundColor: theme.palette.background.paper,
//                 borderTop: `1px solid ${theme.palette.divider}`,
//                 borderBottomLeftRadius: 2,
//                 borderBottomRightRadius: 2,
//                 "& .MuiTablePagination-toolbar": { backgroundColor: "inherit" },
//                 "& .MuiIconButton-root": {
//                   background: "none",
//                   color: theme.palette.text.primary,
//                   borderRadius: "50%",
//                   transition: "box-shadow 0.2s, background 0.2s, color 0.2s, transform 0.2s",
//                   boxShadow: "none",
//                   "&:hover, &:focus": {
//                     background: theme.palette.action.hover,
//                     color: theme.palette.primary.main,
//                     boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
//                     outline: "none",
//                     transform: "scale(1.08)",
//                   },
//                   "&.Mui-disabled": {
//                     color: theme.palette.action.disabled,
//                     background: "none",
//                     boxShadow: "none",
//                   },
//                 },
//               }}
//             />
//           </Paper>
//         )}
//       </Box>

//       <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
//         <DialogTitle sx={{ background: theme.palette.primary.main, color: theme.palette.primary.contrastText, textAlign: "center" }}>
//           Payment Details
//         </DialogTitle>

//         <DialogContent dividers>
//           {selectedPayment ? (
//             <List disablePadding>
//               <ListItem>
//                 <ListItemText primary="Payment ID" secondary={selectedPayment.id || "N/A"} />
//               </ListItem>
//               <ListItem>
//                 <ListItemText primary="Customer Name" secondary={selectedPayment.customerName || "N/A"} />
//               </ListItem>
//               <ListItem>
//                 <ListItemText primary="Amount" secondary={selectedPayment.amount ? `₹${selectedPayment.amount}` : "N/A"} />
//               </ListItem>
//               <ListItem>
//                 <ListItemText primary="Status" secondary={selectedPayment.status?.toUpperCase() || "N/A"} />
//               </ListItem>
//               <ListItem>
//                 <ListItemText primary="Method" secondary={selectedPayment.method?.toUpperCase() || "N/A"} />
//               </ListItem>
//               <ListItem>
//                 <ListItemText primary="Paid At" secondary={selectedPayment.paidAtFormatted || "N/A"} />
//               </ListItem>
//               <ListItem>
//                 <ListItemText primary="Razorpay Payment ID" secondary={selectedPayment.razorpayPaymentId || "N/A"} />
//               </ListItem>
//               <ListItem>
//                 <ListItemText primary="Razorpay Signature" secondary={selectedPayment.razorpaySignature || "N/A"} />
//               </ListItem>
//               <ListItem>
//                 <ListItemText primary="Invoice ID" secondary={selectedPayment.invoiceId || "N/A"} />
//               </ListItem>

//               {/* Show policy IDs and names ONLY if method is "autopaid" */}
//               {selectedPayment.method?.toLowerCase() === "autopaid" && (
//                 <>
//                   <Divider sx={{ my: 2 }} />
//                   <Typography variant="h6" sx={{ px: 2, mb: 1 }}>
//                     Policies
//                   </Typography>
//                   <ListItem>
//                     <ListItemText
//                       primary="Policy IDs"
//                       secondary={
//                         Array.isArray(selectedPayment.policyIds) && selectedPayment.policyIds.length > 0
//                           ? selectedPayment.policyIds.join(", ")
//                           : "N/A"
//                       }
//                     />
//                   </ListItem>
//                   <ListItem>
//                     <ListItemText
//                       primary="Policy Names"
//                       secondary={
//                         Array.isArray(selectedPayment.policyNames) && selectedPayment.policyNames.length > 0
//                           ? selectedPayment.policyNames.join(", ")
//                           : "N/A"
//                       }
//                     />
//                   </ListItem>
//                 </>
//               )}
//             </List>
//           ) : (
//             <Typography>No payment selected.</Typography>
//           )}
//         </DialogContent>

//         <DialogActions>
//           <Button onClick={handleCloseDialog} variant="contained" color="primary" fullWidth>
//             Close
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// }





//workign
// import React, { useState, useEffect } from "react";
// import {
//   Box,
//   Typography,
//   Paper,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   TablePagination,
//   Button,
//   useTheme,
//   Chip,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   InputAdornment,
//   List,
//   ListItem,
//   ListItemText,
//   Divider,
//   Stack,
//   Select,
//   MenuItem,
//   FormControl,
//   InputLabel,
//   alpha,
// } from "@mui/material";

// import SearchIcon from "@mui/icons-material/Search";
// import VisibilityIcon from "@mui/icons-material/Visibility";
// import LaunchIcon from "@mui/icons-material/Launch";
// import axios from "axios";

// const API_BASE = "http://localhost:9999/api/insurer";

// const columns = [
//   { id: "id", label: "PAYMENT ID", minWidth: 140 },
//   { id: "customerName", label: "CUSTOMER", minWidth: 180 },
//   { id: "amount", label: "AMOUNT", minWidth: 120, align: "right", format: (v) => `₹${v?.toLocaleString()}` },
//   { id: "status", label: "STATUS", minWidth: 120 },
//   { id: "method", label: "METHOD", minWidth: 140 },
//   { id: "paidAtFormatted", label: "PAID AT", minWidth: 160 },
//   { id: "actions", label: "ACTIONS", minWidth: 100, align: "center" },
// ];

// export default function InsurerPaymentHistory() {
//   const theme = useTheme();

//   const [payments, setPayments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [methodFilter, setMethodFilter] = useState("All");
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [selectedPayment, setSelectedPayment] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);

//   useEffect(() => {
//     async function fetchPayments() {
//       setLoading(true);
//       try {
//         const res = await axios.get(`${API_BASE}/payments/history`);

//         // Enrich payment data with customer name only (no policy names)
//         const enriched = await Promise.all(
//           res.data.map(async (payment) => {
//             let customerName = "Unknown";
//             if (payment.customerId) {
//               try {
//                 const custRes = await axios.get(`${API_BASE}/customers/${payment.customerId}`);
//                 customerName = custRes.data?.name || "Unknown";
//               } catch {
//                 customerName = "Error fetching customer";
//               }
//             }

//             // Format paidAt date
//             const paidAtFormatted = payment.paidAt
//               ? new Date(payment.paidAt).toLocaleString("en-US", {
//                   year: "numeric",
//                   month: "short",
//                   day: "numeric",
//                   hour: "2-digit",
//                   minute: "2-digit",
//                   hour12: true,
//                 })
//               : "N/A";

//             return {
//               ...payment,
//               customerName,
//               paidAtFormatted,
//               method: payment.method || "N/A",
//             };
//           })
//         );

//         setPayments(enriched);
//       } catch (error) {
//         console.error("Error fetching payments:", error);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchPayments();
//   }, []);

//   // Filter payments by search and method filter
//   const filteredPayments = payments.filter((payment) => {
//     const normalizedSearch = search.toLowerCase();
//     const normalizedMethodFilter = methodFilter.toLowerCase();

//     const matchesSearch =
//       (payment.id || "").toLowerCase().includes(normalizedSearch) ||
//       (payment.customerName || "").toLowerCase().includes(normalizedSearch) ||
//       (payment.method || "").toLowerCase().includes(normalizedSearch) ||
//       (payment.status || "").toLowerCase().includes(normalizedSearch);

//     const matchesMethod = methodFilter === "All" || (payment.method || "").toLowerCase() === normalizedMethodFilter;

//     return matchesSearch && matchesMethod;
//   });

//   useEffect(() => {
//     setPage(0);
//   }, [search, methodFilter]);

//   const handleView = (payment) => {
//     setSelectedPayment(payment);
//     setDialogOpen(true);
//   };

//   const handleCloseDialog = () => {
//     setDialogOpen(false);
//     setSelectedPayment(null);
//   };

//   const scrollbarSx = {
//     "&::-webkit-scrollbar": {
//       height: 8,
//       width: 8,
//       backgroundColor: theme.palette.background.paper,
//     },
//     "&::-webkit-scrollbar-thumb": {
//       borderRadius: 8,
//       backgroundColor: theme.palette.mode === "light" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.12)",
//     },
//     scrollbarColor: `${theme.palette.mode === "light" ? "#bdbdbd #f5f5f5" : "#616161 #212121"}`,
//     scrollbarWidth: "thin",
//   };

//   return (
//     <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, minHeight: "100vh" }}>
//       {/* Header with updated styling */}
//       <Box
//         sx={{
//           py: 2,
//           px: 2,
//           mb: 4,
//           background: `linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)`,
//           color: 'white',
//           borderRadius: 2,
//           boxShadow: 3,
//         }}
//       >
//         <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
//           Payment History
//         </Typography>
//       </Box>

//       <Box sx={{ maxWidth: 1300, mx: "auto" }}>
//         <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
//           <TextField
//             fullWidth
//             size="small"
//             placeholder="Search by ID, customer, status, or method..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             sx={{
//               "& .MuiOutlinedInput-root": {
//                 borderRadius: 2,
//                 backgroundColor: theme.palette.background.paper,
//                 boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.05)}`,
//                 border: `1px solid ${theme.palette.divider}`,
//                 transition: "all 0.3s ease",
//                 "&:hover": {
//                   boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.1)}`,
//                   borderColor: alpha(theme.palette.primary.main, 0.3),
//                 },
//                 "&.Mui-focused": {
//                   boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
//                   borderColor: theme.palette.primary.main,
//                 },
//               },
//             }}
//             InputProps={{
//               startAdornment: (
//                 <InputAdornment position="start">
//                   <SearchIcon color="primary" />
//                 </InputAdornment>
//               ),
//             }}
//           />
//           <FormControl size="small" sx={{ minWidth: 180 }}>
//             <InputLabel id="method-filter-label">Method</InputLabel>
//             <Select
//               labelId="method-filter-label"
//               id="method-filter"
//               value={methodFilter}
//               label="Method"
//               onChange={(e) => setMethodFilter(e.target.value)}
//             >
//               <MenuItem value="All">All Methods</MenuItem>
//               <MenuItem value="razorpay">Razorpay</MenuItem>
//               <MenuItem value="cash">Cash</MenuItem>
//               <MenuItem value="autopaid">Auto Paid</MenuItem>
//             </Select>
//           </FormControl>
//         </Stack>

//         {loading ? (
//           <Typography align="center" sx={{ py: 10 }}>
//             Loading payment data...
//           </Typography>
//         ) : (
//           <Paper
//             elevation={0}
//             sx={{
//               width: "100%",
//               overflow: "hidden",
//               borderRadius: 2,
//               border: `1px solid ${theme.palette.divider}`,
//               bgcolor: theme.palette.background.paper,
//             }}
//           >
//             <TableContainer sx={{ maxHeight: 440, ...scrollbarSx }}>
//               <Table stickyHeader aria-label="payment history table">
//                 <TableHead>
//                   <TableRow>
//                     {columns.map((column) => (
//                       <TableCell
//                         key={column.id}
//                         align={column.align}
//                         sx={{
//                           minWidth: column.minWidth,
//                           bgcolor: theme.palette.primary.main,
//                           color: theme.palette.primary.contrastText,
//                           fontWeight: 700,
//                           textTransform: "uppercase",
//                           borderBottom: `1px solid ${theme.palette.divider}`,
//                         }}
//                       >
//                         {column.label}
//                       </TableCell>
//                     ))}
//                   </TableRow>
//                 </TableHead>
//                 <TableBody>
//                   {filteredPayments.length === 0 ? (
//                     <TableRow>
//                       <TableCell colSpan={columns.length} align="center">
//                         No records found.
//                       </TableCell>
//                     </TableRow>
//                   ) : (
//                     filteredPayments
//                       .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
//                       .map((row, rowIdx, arr) => (
//                         <TableRow
//                           hover
//                           tabIndex={-1}
//                           key={row.id}
//                           sx={{ cursor: "pointer" }}
//                           onClick={() => handleView(row)}
//                         >
//                           {columns.map((col) => {
//                             if (col.id === "actions") {
//                               return (
//                                 <TableCell
//                                   key={col.id}
//                                   align={col.align}
//                                   sx={{
//                                     borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`,
//                                   }}
//                                 >
//                                   <Button
//                                     variant="contained"
//                                     color="primary"
//                                     size="small"
//                                     startIcon={<VisibilityIcon />}
//                                     onClick={(e) => {
//                                       e.stopPropagation();
//                                       handleView(row);
//                                     }}
//                                     sx={{
//                                       borderRadius: 1,
//                                       fontWeight: 600,
//                                       textTransform: "none",
//                                       transition: "all 0.2s ease-in-out",
//                                       "&:hover": {
//                                         transform: "scale(1.05)",
//                                         boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
//                                       },
//                                     }}
//                                   >
//                                     View
//                                   </Button>
//                                 </TableCell>
//                               );
//                             }

//                             // Render status as normal text
//                             if (col.id === "status") {
//                               return (
//                                 <TableCell
//                                   key={col.id}
//                                   align={col.align}
//                                   sx={{
//                                     borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`,
//                                   }}
//                                 >
//                                   {row[col.id]?.toUpperCase() || "N/A"}
//                                 </TableCell>
//                               );
//                             }

//                             let v = row[col.id];
//                             if (col.format && typeof v === "number") v = col.format(v);

//                             return (
//                               <TableCell
//                                 key={col.id}
//                                 align={col.align}
//                                 sx={{
//                                   borderBottom: rowIdx === arr.length - 1 ? "none" : `1px solid ${theme.palette.divider}`,
//                                 }}
//                               >
//                                 {v}
//                               </TableCell>
//                             );
//                           })}
//                         </TableRow>
//                       ))
//                   )}
//                 </TableBody>
//               </Table>
//             </TableContainer>
//             <TablePagination
//               rowsPerPageOptions={[10, 25, 100]}
//               component="div"
//               count={filteredPayments.length}
//               rowsPerPage={rowsPerPage}
//               page={page}
//               onPageChange={(_, np) => setPage(np)}
//               onRowsPerPageChange={(e) => {
//                 setRowsPerPage(+e.target.value);
//                 setPage(0);
//               }}
//               sx={{
//                 backgroundColor: theme.palette.background.paper,
//                 borderTop: `1px solid ${theme.palette.divider}`,
//                 borderBottomLeftRadius: 2,
//                 borderBottomRightRadius: 2,
//                 "& .MuiTablePagination-toolbar": { backgroundColor: "inherit" },
//                 "& .MuiIconButton-root": {
//                   background: "none",
//                   color: theme.palette.text.primary,
//                   borderRadius: "50%",
//                   transition: "box-shadow 0.2s, background 0.2s, color 0.2s, transform 0.2s",
//                   boxShadow: "none",
//                   "&:hover, &:focus": {
//                     background: theme.palette.action.hover,
//                     color: theme.palette.primary.main,
//                     boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
//                     outline: "none",
//                     transform: "scale(1.08)",
//                   },
//                   "&.Mui-disabled": {
//                     color: theme.palette.action.disabled,
//                     background: "none",
//                     boxShadow: "none",
//                   },
//                 },
//               }}
//             />
//           </Paper>
//         )}
//       </Box>

//       <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
//         <DialogTitle sx={{ background: theme.palette.primary.main, color: theme.palette.primary.contrastText, textAlign: "center" }}>
//           Payment Details
//         </DialogTitle>

//         <DialogContent>
//           {selectedPayment && (
//             <List disablePadding>
//               {Object.entries({
//                 "Payment ID": selectedPayment.id,
//                 "Customer Name": selectedPayment.customerName,
//                 "Amount": `₹${selectedPayment.amount}`,
//                 "Status": selectedPayment.status?.toUpperCase(),
//                 "Method": selectedPayment.method?.toUpperCase(),
//                 "Paid At": selectedPayment.paidAtFormatted,
//                 "Razorpay Payment ID": selectedPayment.razorpayPaymentId || "N/A",
//                 "Razorpay Signature": selectedPayment.razorpaySignature || "N/A",
//                 "Invoice ID": selectedPayment.invoiceId || "N/A",
//               }).map(([label, value]) => (
//                 <React.Fragment key={label}>
//                   <ListItem>
//                     <ListItemText
//                       primary={label}
//                       secondary={
//                         label === "Payment Link" ? (
//                           <a href={value} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: theme.palette.primary.main }}>
//                             {value} <LaunchIcon fontSize="small" />
//                           </a>
//                         ) : (
//                           value
//                         )
//                       }
//                     />
//                   </ListItem>
//                   <Divider />
//                 </React.Fragment>
//               ))}
//             </List>
//           )}
//         </DialogContent>

//         <DialogActions>
//           <Button onClick={handleCloseDialog} variant="contained" color="primary">
//             Close
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// }



// basic
// import React, { useState, useEffect } from "react";
// import {
//   Box,
//   Typography,
//   Paper,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   TablePagination,
//   IconButton,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   InputAdornment,
//   CircularProgress,
//   List,
//   ListItem,
//   ListItemText,
//   Divider,
//   Stack,
//   Button,
//   useTheme,
// } from "@mui/material";
// import SearchIcon from "@mui/icons-material/Search";
// import VisibilityIcon from "@mui/icons-material/Visibility";
// import axios from "axios";

// const API_BASE = "http://localhost:9999/api/insurer";

// const columns = [
//   { id: "id", label: "PAYMENT ID", minWidth: 120 },
//   { id: "customerName", label: "Customer Name", minWidth: 180 },
//   { id: "policyNames", label: "Policy Names", minWidth: 200 },
//   { id: "amount", label: "Amount", minWidth: 100, align: "right", format: (v) => `₹${v}` },
//   { id: "method", label: "Method", minWidth: 100 },
//   { id: "paidAtFormatted", label: "Paid At", minWidth: 150 },
//   { id: "actions", label: "Actions", minWidth: 80, align: "center" },
// ];

// export default function InsurerPaymentHistory() {
//   const theme = useTheme();
//   const [payments, setPayments] = useState([]);
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [loading, setLoading] = useState(false);
//   const [selectedPayment, setSelectedPayment] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);

//   useEffect(() => {
//     async function fetchPayments() {
//       setLoading(true);
//       try {
//         const response = await axios.get(`${API_BASE}/payments/history`);
//         const rawPayments = response.data;

//         // Enrich payments with customer name and policy names for display:
//         const enriched = await Promise.all(
//           rawPayments.map(async (payment) => {
//             // Fetch customer name
//             let customerName = "Unknown";
//             if (payment.customerId) {
//               try {
//                 const cRes = await axios.get(`${API_BASE}/customers/${payment.customerId}`);
//                 customerName = cRes.data?.name || "Unknown";
//               } catch {
//                 customerName = "Error fetching customer";
//               }
//             }

//             // Prepare policy names
//             let policyNames = "N/A";

//             if (payment.invoiceId) {
//               // Regular (invoice) payment - fetch invoice & policies
//               try {
//                 const invRes = await axios.get(`${API_BASE}/invoices/${payment.invoiceId}`);
//                 const policyIds = invRes.data?.policyIds || [];
//                 if (policyIds.length) {
//                   try {
//                     const polRes = await axios.post(`${API_BASE}/policies/names`, policyIds);
//                     const policies = polRes.data;
//                     // policies could be list of strings or objects with .name
//                     if (Array.isArray(policies) && policies.length > 0) {
//                       if (typeof policies[0] === "string") {
//                         policyNames = policies.join(", ");
//                       } else {
//                         policyNames = policies.map((p) => p.name).join(", ");
//                       }
//                     } else {
//                       policyNames = "No Policies Found";
//                     }
//                   } catch {
//                     policyNames = "Error fetching policies";
//                   }
//                 } else {
//                   policyNames = "No Policies Associated";
//                 }
//               } catch {
//                 policyNames = "Invoice Not Found";
//               }
//             } else if (payment.policyIds && Array.isArray(payment.policyIds) && payment.policyIds.length > 0) {
//               // Autopay - payment with no invoice but has policyIds - fetch policies directly
//               try {
//                 const polRes = await axios.post(`${API_BASE}/policies/names`, payment.policyIds);
//                 const policies = polRes.data;
//                 if (Array.isArray(policies) && policies.length > 0) {
//                   if (typeof policies[0] === "string") {
//                     policyNames = policies.join(", ");
//                   } else {
//                     policyNames = policies.map((p) => p.name).join(", ");
//                   }
//                 } else {
//                   policyNames = "No Policies Found";
//                 }
//               } catch {
//                 policyNames = "Error fetching policies";
//               }
//             } else if (payment.policyNames && Array.isArray(payment.policyNames) && payment.policyNames.length > 0) {
//               // Sometimes policyNames are saved directly in payment
//               policyNames = payment.policyNames.join(", ");
//             } else {
//               policyNames = "No Policies Info";
//             }

//             return {
//               ...payment,
//               customerName,
//               policyNames,
//               paidAtFormatted: payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "N/A",
//             };
//           })
//         );

//         setPayments(enriched);
//       } catch (error) {
//         console.error("Error fetching payments:", error);
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchPayments();
//   }, []);

//   // Filter payments by search input on policy names, customer name or method
//   const filteredPayments = payments.filter(
//     (p) =>
//       p.customerName?.toLowerCase().includes(search.toLowerCase()) ||
//       p.policyNames?.toLowerCase().includes(search.toLowerCase()) ||
//       p.method?.toLowerCase().includes(search.toLowerCase())
//   );

//   useEffect(() => {
//     setPage(0);
//   }, [search]);

//   const handleViewDetails = (payment) => {
//     setSelectedPayment(payment);
//     setDialogOpen(true);
//   };

//   const handleCloseDialog = () => {
//     setDialogOpen(false);
//     setSelectedPayment(null);
//   };

//   // Scrollbar styling for table container
//   const scrollbarSx = {
//     "&::-webkit-scrollbar": {
//       height: 8,
//       width: 8,
//       backgroundColor: theme.palette.background.paper,
//     },
//     "&::-webkit-scrollbar-thumb": {
//       borderRadius: 8,
//       backgroundColor: theme.palette.mode === "light" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.12)",
//     },
//     scrollbarColor: theme.palette.mode === "light" ? "#bdbdbd #f5f5f5" : "#616161 #212121",
//     scrollbarWidth: "thin",
//   };

//   if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", my: 6 }} />;

//   return (
//     <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, minHeight: "100vh" }}>
//       <Typography variant="h4" gutterBottom align="center">
//         Payment History
//       </Typography>

//       <Box sx={{ maxWidth: 1300, mx: "auto" }}>
//         <TextField
//           fullWidth
//           size="small"
//           placeholder="Search by customer, policy, or method"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           sx={{ mb: 2 }}
//           InputProps={{
//             startAdornment: (
//               <InputAdornment position="start">
//                 <SearchIcon color="primary" />
//               </InputAdornment>
//             ),
//           }}
//         />

//         <Paper
//           elevation={0}
//           sx={{
//             width: "100%",
//             overflow: "hidden",
//             borderRadius: 2,
//             border: `1px solid ${theme.palette.divider}`,
//             bgcolor: theme.palette.background.paper,
//           }}
//         >
//           <TableContainer sx={{ maxHeight: 440, ...scrollbarSx }}>
//             <Table stickyHeader aria-label="payment history table">
//               <TableHead>
//                 <TableRow>
//                   {columns.map((col) => (
//                     <TableCell
//                       key={col.id}
//                       align={col.align || "left"}
//                       sx={{
//                         minWidth: col.minWidth,
//                         bgcolor: theme.palette.primary.main,
//                         color: theme.palette.primary.contrastText,
//                         fontWeight: "bold",
//                         textTransform: "uppercase",
//                         borderBottom: `1px solid ${theme.palette.divider}`,
//                       }}
//                     >
//                       {col.label}
//                     </TableCell>
//                   ))}
//                 </TableRow>
//               </TableHead>

//               <TableBody>
//                 {filteredPayments.length === 0 ? (
//                   <TableRow>
//                     <TableCell colSpan={columns.length} align="center">
//                       No records found.
//                     </TableCell>
//                   </TableRow>
//                 ) : (
//                   filteredPayments
//                     .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
//                     .map((row) => (
//                       <TableRow hover tabIndex={-1} key={row.id}>
//                         {columns.map((col) => {
//                           if (col.id === "actions") {
//                             return (
//                               <TableCell key={col.id} align="center">
//                                 <Stack direction="row" justifyContent="center" spacing={1}>
//                                   <IconButton
//                                     color="primary"
//                                     onClick={() => handleViewDetails(row)}
//                                   >
//                                     <VisibilityIcon />
//                                   </IconButton>
//                                 </Stack>
//                               </TableCell>
//                             );
//                           }
//                           let val = row[col.id];
//                           if (col.id === "policyNames" && Array.isArray(val)) {
//                             val = val.join(", ");
//                           }
//                           if (col.format && typeof val === "number") {
//                             val = col.format(val);
//                           }
//                           return (
//                             <TableCell
//                               key={col.id}
//                               align={col.align || "left"}
//                             >
//                               {val}
//                             </TableCell>
//                           );
//                         })}
//                       </TableRow>
//                     ))
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
//             onRowsPerPageChange={(e) => {
//               setRowsPerPage(+e.target.value);
//               setPage(0);
//             }}
//             sx={{
//               bgcolor: theme.palette.background.paper,
//               borderTop: `1px solid ${theme.palette.divider}`,
//               boxShadow: "none",
//               borderBottomLeftRadius: 8,
//               borderBottomRightRadius: 8,
//               "& .MuiTablePagination-toolbar": { bgcolor: "inherit" },
//               "& .MuiIconButton-root": {
//                 bgcolor: "transparent",
//                 color: theme.palette.text.primary,
//                 borderRadius: "50%",
//                 transition: "all 0.2s",
//                 "&:hover": {
//                   bgcolor: theme.palette.action.hover,
//                   color: theme.palette.primary.main,
//                 },
//                 "&.Mui-disabled": {
//                   color: theme.palette.action.disabled,
//                 },
//               },
//             }}
//           />
//         </Paper>
//       </Box>

//       <Dialog
//         open={dialogOpen}
//         onClose={handleCloseDialog}
//         maxWidth="md"
//         fullWidth
//       >
//         <DialogTitle
//           sx={{
//             bgcolor: theme.palette.primary.main,
//             color: theme.palette.primary.contrastText,
//             textAlign: "center",
//           }}
//         >
//           Payment Details
//         </DialogTitle>
//         <DialogContent dividers>
//           {selectedPayment && (
//             <List disablePadding>
//               {Object.entries({
//                 "ID": selectedPayment.id,
//                 "Customer Name": selectedPayment.customerName,
//                 "Policy Names": selectedPayment.policyNames?.join
//                   ? selectedPayment.policyNames.join(", ")
//                   : selectedPayment.policyNames || "N/A",
//                 "Amount": `₹${selectedPayment.amount}`,
//                 "Method": selectedPayment.method,
//                 "Status": selectedPayment.status?.toUpperCase(),
//                 "Paid At": selectedPayment.paidAtFormatted,
//                 "Razorpay Payment ID":
//                   selectedPayment.razorpayPaymentId || "N/A",
//                 "Razorpay Subscription ID":
//                   selectedPayment.razorpaySubscriptionId || "N/A",
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
//                           <Typography variant="body2">
//                             Type: {selectedPayment.taxDetails.taxType}
//                           </Typography>
//                           <Typography variant="body2">
//                             Rate: {selectedPayment.taxDetails.taxRate}%
//                           </Typography>
//                           <Typography variant="body2">
//                             Tax Amount: {selectedPayment.taxDetails.taxAmount}
//                           </Typography>
//                           <Typography variant="body2">
//                             Total: {selectedPayment.taxDetails.totalAmount}
//                           </Typography>
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
//           <Button onClick={handleCloseDialog} variant="contained" color="primary">
//             Close
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// }



// // src/components/insurers/InsurerPaymentHistory.jsx
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
//   { id: "id", label: "PAYMENT ID", minWidth: 120 },
//   { id: "customerName", label: "Customer Name", minWidth: 180 },
//   { id: "policyNames", label: "Policy Names", minWidth: 200 },
//   { id: "amount", label: "Amount", minWidth: 100, align: "right", format: v => "₹" + v },
//   { id: "method", label: "Method", minWidth: 100 },
//   { id: "paidAtFormatted", label: "Paid At", minWidth: 150 },
//   { id: "actions", label: "Actions", minWidth: 80, align: "center" }
// ];

// export default function InsurerPaymentHistory() {
//   const theme = useTheme();
//   const [enrichedPayments, setEnrichedPayments] = useState([]);
//   const [search, setSearch] = useState("");
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [loading, setLoading] = useState(false);
//   const [selectedPayment, setSelectedPayment] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);

//   useEffect(() => {
//     setLoading(true);
//     axios.get(`${API_BASE}/payments/history`)
//       .then(async response => {
//         const enriched = await Promise.all(response.data.map(async payment => {
//           let customerName = 'Unknown', policyNames = 'N/A';
//           if (payment.customerId) {
//             try {
//               const { data } = await axios.get(`${API_BASE}/customers/${payment.customerId}`);
//               customerName = data.name || 'Unknown';
//             } catch { customerName = 'Error fetching customer'; }
//           } else customerName = 'No Customer ID';
//           if (payment.invoiceId) {
//             try {
//               const { data: inv } = await axios.get(`${API_BASE}/invoices/${payment.invoiceId}`);
//               const policyIds = inv.policyIds || [];
//               if (policyIds.length) {
//                 try {
//                   const { data: policies } = await axios.post(`${API_BASE}/policies/names`, policyIds);
//                   policyNames = Array.isArray(policies) ? policies.map(p => p.name).join(", ") : 'N/A';
//                 } catch { policyNames = 'Error fetching policy names'; }
//               } else policyNames = 'No Policies Associated';
//             } catch { policyNames = 'Error fetching invoice'; }
//           } else policyNames = 'No Invoice ID';
//           return {
//             ...payment,
//             customerName,
//             policyNames,
//             paidAtFormatted: payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'N/A'
//           }
//         }));
//         setEnrichedPayments(enriched);
//       })
//       .catch(console.error)
//       .finally(() => setLoading(false));
//   }, []);

//   // Filter
//   const filteredPayments = enrichedPayments.filter(payment =>
//     (payment.customerName?.toLowerCase().includes(search.toLowerCase()) ||
//       payment.policyNames?.toLowerCase().includes(search.toLowerCase()) ||
//       payment.method?.toLowerCase().includes(search.toLowerCase()))
//   );

//   useEffect(() => setPage(0), [search]);

//   if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", my: 6 }} />;

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
//       <Typography variant="h4" gutterBottom align="center">Payment History</Typography>
//       <Box sx={{ maxWidth: 1300, mx: "auto" }}>
//         <TextField
//           fullWidth
//           size="small"
//           placeholder="Search by customer, policy, method..."
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
//           {/* --- Pagination fixed sx below --- */}
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
//                 "Customer Name": selectedPayment.customerName,
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





// // src/components/insurers/InsurerPaymentHistory.jsx
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import {
//   Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
//   TextField, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Chip, CircularProgress
// } from '@mui/material';
// import { styled } from '@mui/material/styles';

// const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
//   marginTop: theme.spacing(3),
//   boxShadow: theme.shadows[5],
// }));

// const DetailChip = styled(Chip)(({ theme }) => ({
//   marginBottom: theme.spacing(1),
// }));

// export default function InsurerPaymentHistory() {
//   const [payments, setPayments] = useState([]);
//   const [filteredPayments, setFilteredPayments] = useState([]);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [selectedPayment, setSelectedPayment] = useState(null);
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [enrichedPayments, setEnrichedPayments] = useState([]);  // Store enriched data with names

//   // Fetch all payments from backend (sorted newest to oldest)
//   useEffect(() => {
//     setLoading(true);
//     axios.get('http://localhost:9999/api/insurer/payments/history')  // Adjust URL/port if needed
//       .then(response => {
//         setPayments(response.data);
//         setFilteredPayments(response.data);  // Initially, show all
//       })
//       .catch(error => console.error('Error fetching payments:', error))
//       .finally(() => setLoading(false));
//   }, []);

//   // Enrich payments with customer name and policy names
//   useEffect(() => {
//     const enrichData = async () => {
//       const enriched = await Promise.all(payments.map(async (payment) => {
//         let customerName = 'Unknown';
//         let policyNames = 'N/A';

//         // Step 1: Fetch customer name by customerId (skip if no customerId)
//         if (payment.customerId) {
//           try {
//             const customerResponse = await axios.get(`http://localhost:9999/api/insurer/customers/${payment.customerId}`);
//             customerName = customerResponse.data.name || 'Unknown';
//           } catch (error) {
//             console.error(`Error fetching customer for payment ${payment.id}:`, error.message);
//             customerName = 'Error fetching customer';
//           }
//         } else {
//           customerName = 'No Customer ID';
//         }

//         // Step 2: Fetch invoice by invoiceId to get policyIds (skip if no invoiceId)
//         if (payment.invoiceId) {
//           try {
//             const invoiceResponse = await axios.get(`http://localhost:9999/api/insurer/invoices/${payment.invoiceId}`);
//             const policyIds = invoiceResponse.data.policyIds || [];

//             // Step 3: Fetch policy names if policyIds exist
//             if (policyIds.length > 0) {
//               try {
//                 const policiesResponse = await axios.post('http://localhost:9999/api/insurer/policies/names', policyIds);  // CHANGED: Send policyIds as array directly (no { policyIds } object)
//                 policyNames = policiesResponse.data.map(p => p.name).join(', ') || 'N/A';
//               } catch (policyError) {
//                 console.error(`Error fetching policy names for payment ${payment.id}:`, policyError.message);
//                 policyNames = 'Error fetching policy names';
//               }
//             } else {
//               policyNames = 'No Policies Associated';
//             }
//           } catch (invoiceError) {
//             console.error(`Error fetching invoice for payment ${payment.id}:`, invoiceError.message);
//             policyNames = 'Error fetching invoice';
//           }
//         } else {
//           policyNames = 'No Invoice ID';
//         }

//         return { ...payment, customerName, policyNames };
//       }));
//       setEnrichedPayments(enriched);
//       setFilteredPayments(enriched);  // Update filtered with enriched data
//     };

//     if (payments.length > 0) {
//       enrichData();
//     }
//   }, [payments]);

//   // Handle search/filter in frontend (filters by any matching field, including names)
//   const handleSearch = (e) => {
//     const term = e.target.value.toLowerCase();
//     setSearchTerm(term);
//     const filtered = enrichedPayments.filter(payment =>
//       Object.values(payment).some(value =>
//         value && value.toString().toLowerCase().includes(term)
//       )
//     );
//     setFilteredPayments(filtered);
//   };

//   // Open details dialog
//   const handleViewDetails = (payment) => {
//     setSelectedPayment(payment);
//     setDialogOpen(true);
//   };

//   // Close details dialog
//   const handleCloseDialog = () => {
//     setDialogOpen(false);
//     setSelectedPayment(null);
//   };

//   if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto' }} />;

//   return (
//     <Box sx={{ p: 4, maxWidth: '100%', minHeight: '100vh', background: '#ffffff' }}>
//       <Typography variant="h4" gutterBottom sx={{ color: '#7e57c2', fontWeight: 'bold', textAlign: 'center' }}>
//         Payment History
//       </Typography>

//       {/* Search Input */}
//       <TextField
//         fullWidth
//         variant="outlined"
//         label="Search by Customer Name, Policy Names, Status, Method, etc."
//         value={searchTerm}
//         onChange={handleSearch}
//         sx={{ mb: 3 }}
//       />

//       {/* Payments Table */}
//       <StyledTableContainer component={Paper}>
//         <Table>
//           <TableHead>
//             <TableRow>
//               <TableCell><strong>ID</strong></TableCell>
//               <TableCell><strong>Customer Name</strong></TableCell>
//               <TableCell><strong>Policy Names</strong></TableCell>
//               <TableCell><strong>Amount</strong></TableCell>
//               <TableCell><strong>Status</strong></TableCell>
//               <TableCell><strong>Method</strong></TableCell>
//               <TableCell><strong>Paid At</strong></TableCell>
//               <TableCell><strong>Actions</strong></TableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {filteredPayments.map((payment) => (
//               <TableRow key={payment.id}>
//                 <TableCell>{payment.id}</TableCell>
//                 <TableCell>{payment.customerName}</TableCell>
//                 <TableCell>{payment.policyNames}</TableCell>
//                 <TableCell>₹{payment.amount}</TableCell>
//                 <TableCell>
//                   <Chip
//                     label={payment.status.toUpperCase()}
//                     color={payment.status === 'paid' ? 'success' : 'error'}
//                   />
//                 </TableCell>
//                 <TableCell>{payment.method}</TableCell>
//                 <TableCell>{new Date(payment.paidAt).toLocaleString()}</TableCell>
//                 <TableCell>
//                   <Button
//                     variant="outlined"
//                     color="primary"
//                     onClick={() => handleViewDetails(payment)}
//                   >
//                     View Details
//                   </Button>
//                 </TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </StyledTableContainer>

//       {/* Payment Details Dialog (Updated to include customer name and policy names) */}
//       <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
//         <DialogTitle sx={{ backgroundColor: '#7e57c2', color: 'white', textAlign: 'center' }}>
//           Payment Details
//         </DialogTitle>
//         <DialogContent sx={{ p: 3 }}>
//           {selectedPayment && (
//             <Grid container spacing={2}>
//               <Grid item xs={12}>
//                 <DetailChip label={`ID: ${selectedPayment.id}`} variant="outlined" />
//               </Grid>
//               <Grid item xs={6}>
//                 <Typography><strong>Invoice ID:</strong> {selectedPayment.invoiceId}</Typography>
//               </Grid>
//               <Grid item xs={6}>
//                 <Typography><strong>Customer Name:</strong> {selectedPayment.customerName}</Typography>
//               </Grid>
//               <Grid item xs={6}>
//                 <Typography><strong>Policy Names:</strong> {selectedPayment.policyNames}</Typography>
//               </Grid>
//               <Grid item xs={6}>
//                 <Typography><strong>Insurer ID:</strong> {selectedPayment.insurerId}</Typography>
//               </Grid>
//               <Grid item xs={6}>
//                 <Typography><strong>Amount:</strong> ₹{selectedPayment.amount}</Typography>
//               </Grid>
//               <Grid item xs={6}>
//                 <Typography><strong>Status:</strong> {selectedPayment.status}</Typography>
//               </Grid>
//               <Grid item xs={6}>
//                 <Typography><strong>Method:</strong> {selectedPayment.method}</Typography>
//               </Grid>
//               <Grid item xs={6}>
//                 <Typography><strong>Auto Pay:</strong> {selectedPayment.isAutoPay ? 'Yes' : 'No'}</Typography>
//               </Grid>
//               <Grid item xs={6}>
//                 <Typography><strong>Paid At:</strong> {new Date(selectedPayment.paidAt).toLocaleString()}</Typography>
//               </Grid>
//               <Grid item xs={6}>
//                 <Typography><strong>Razorpay Payment ID:</strong> {selectedPayment.razorpayPaymentId || 'N/A'}</Typography>
//               </Grid>
//               <Grid item xs={6}>
//                 <Typography><strong>Razorpay Subscription ID:</strong> {selectedPayment.razorpaySubscriptionId || 'N/A'}</Typography>
//               </Grid>
//               {selectedPayment.taxDetails && (
//                 <Grid item xs={12}>
//                   <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>Tax Details</Typography>
//                   <Typography><strong>Type:</strong> {selectedPayment.taxDetails.taxType}</Typography>
//                   <Typography><strong>Rate:</strong> {selectedPayment.taxDetails.taxRate}%</Typography>
//                   <Typography><strong>Tax Amount:</strong> ₹{selectedPayment.taxDetails.taxAmount}</Typography>
//                   <Typography><strong>Total Amount:</strong> ₹{selectedPayment.taxDetails.totalAmount}</Typography>
//                 </Grid>
//               )}
//             </Grid>
//           )}
//         </DialogContent>
//         <DialogActions sx={{ justifyContent: 'center' }}>
//           <Button onClick={handleCloseDialog} variant="contained" sx={{ backgroundColor: '#7e57c2', color: 'white' }}>
//             Close
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// }
