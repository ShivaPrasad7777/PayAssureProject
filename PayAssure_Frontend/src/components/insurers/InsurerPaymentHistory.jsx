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
