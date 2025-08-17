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
