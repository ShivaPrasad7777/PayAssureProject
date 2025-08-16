import React, { useState, useEffect } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemText, Divider, Stack, Button, IconButton,
  TextField, InputAdornment, useTheme, Select, MenuItem, FormControl, InputLabel, alpha
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


const API_BASE = "http://localhost:9999/api/customer";


const columns = [
  { id: "id", label: "INVOICE ID", minWidth: 120 },
  { id: "policyNames", label: "Policy Names", minWidth: 200 },
  { id: "amount", label: "Amount", minWidth: 100, align: "right" },
  { id: "status", label: "Status", minWidth: 100 },
  { id: "validUptoFormatted", label: "Valid Upto", minWidth: 150 },
  { id: "createdAtFormatted", label: "Created At", minWidth: 150 },
  { id: "actions", label: "Actions", minWidth: 120, align: "center" },
];


const getStatusColor = (status, theme) => {
  switch (status?.toLowerCase()) {
    case "paid":
    case "completed":
    case "paidbycash":
      return theme.palette.success.main;
    case "processing":
    case "unpaid":
      return theme.palette.warning.main;
    case "failed":
      return theme.palette.error.main;
    default:
      return theme.palette.text.primary;
  }
};


export default function CustomerInvoiceHistory({ customerId }) {
  const theme = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);


  const scrollbarSx = {
    "&::-webkit-scrollbar": {
      height: 8,
      width: 8,
      backgroundColor: theme.palette.background.paper,
    },
    "&::-webkit-scrollbar-thumb": {
      borderRadius: 8,
      backgroundColor: theme.palette.mode === "light" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.12)",
    },
    scrollbarColor: theme.palette.mode === "light" ? "#bdbdbd #f5f5f5" : "#616161 #212121",
    scrollbarWidth: "thin",
  };


  useEffect(() => {
    if (!customerId) {
      setError("Customer ID is required.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);


    axios
      .get(`${API_BASE}/invoices/history/${customerId}`)
      .then((res) => {
        const commonDateOptions = {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        };


        const enriched = res.data.map((invoice) => ({
          ...invoice,
          id: invoice._id?.$oid || invoice.id || "N/A",
          policyNames: Array.isArray(invoice.policyNames)
            ? invoice.policyNames.join(", ")
            : Array.isArray(invoice.policyIds)
            ? invoice.policyIds.join(", ")
            : "",
          validUptoFormatted: invoice.validUpto
            ? new Date(invoice.validUpto.$date || invoice.validUpto).toLocaleString(
                "en-US",
                commonDateOptions
              )
            : "N/A",
          createdAtFormatted: invoice.createdAt
            ? new Date(invoice.createdAt.$date || invoice.createdAt).toLocaleString(
                "en-US",
                commonDateOptions
              )
            : "N/A",
          taxDetailsList: invoice.taxDetailsList || [],
          amount: invoice.amount || "N/A",
          status: invoice.status || "N/A",
          razorpayOrderId: invoice.razorpayOrderId || "N/A",
          paymentLink: invoice.paymentLink || "N/A",
          months: invoice.months || "N/A",
        }));


        setInvoices(enriched);
      })
      .catch((e) => {
        setError("Failed to load invoices.");
        console.error(e);
      })
      .finally(() => setLoading(false));
  }, [customerId]);


  useEffect(() => {
    const lowerSearch = search.toLowerCase();
    setFilteredInvoices(
      invoices.filter(
        (inv) =>
          (inv.id.toLowerCase().includes(lowerSearch) ||
            (inv.policyNames && inv.policyNames.toLowerCase().includes(lowerSearch))) &&
          (statusFilter === "All" || inv.status.toLowerCase() === statusFilter.toLowerCase())
      )
    );
    setPage(0);
  }, [search, statusFilter, invoices]);


  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };


  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedInvoice(null);
  };


  const handleDownloadPdf = (invoice) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Invoice Details", 14, 22);


    const data = [
      ["Invoice ID", invoice.id],
      ["Policy Names", invoice.policyNames],
      ["Amount", `₹${invoice.amount}`],
      ["Status", invoice.status.toUpperCase()],
      ["Valid Upto", invoice.validUptoFormatted],
      ["Created At", invoice.createdAtFormatted],
      ["Razorpay Order ID", invoice.razorpayOrderId],
      ["Payment Link", invoice.paymentLink],
      ["Months", invoice.months],
    ];


    if (invoice.taxDetailsList && invoice.taxDetailsList.length) {
      data.push(["Tax Details", ""]);
      invoice.taxDetailsList.forEach((tax, idx) => {
        data.push([
          `Policy ID (${tax.policyId})`,
          `GST Rate: ${tax.gstRate * 100}%, Tax: ₹${tax.taxAmount}, Total: ₹${invoice.amount}`,
        ]);
      });
    }


    autoTable(doc, {
      startY: 30,
      head: [["Field", "Value"]],
      body: data,
      theme: "striped",
      headStyles: { fillColor: [103, 58, 183] },
      styles: { fontSize: 11 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: "auto" } },
    });


    doc.save(`Invoice_${invoice.id}.pdf`);
  };


  if (loading)
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  if (error)
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );


  return (
    <Box sx={{ py: 4, px: { xs: 1, sm: 3 }, bgcolor: "#f0f2f5", minHeight: "100vh" }}>
      <Box
        sx={{
          py: 2,
          px: 2,
          mb: 4,
          background: "linear-gradient(45deg, #673AB7 30%, #9C27B0 90%)",
          color: "white",
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h4" align="center" fontWeight="bold">
          Invoice History
        </Typography>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, maxWidth: 1200, mx: "auto" }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search invoice ID or policy names"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
            sx={{
              backgroundColor: "#fff",
              borderRadius: 1,
              boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.12)}`,
              "&:hover": { boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}` },
            }}
          >
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="unpaid">Unpaid</MenuItem>
            <MenuItem value="paidbycash">Paid by Cash</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      <Paper sx={{ maxWidth: 1200, mx: "auto", borderRadius: 2, boxShadow: 3, overflow: "hidden", border: `1px solid ${theme.palette.divider}` }}>
        <TableContainer sx={{ maxHeight: 440, ...scrollbarSx }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map(
                  (col) =>
                    col.id !== "customerName" && (
                      <TableCell
                        key={col.id}
                        align={col.align || "left"}
                        sx={{
                          backgroundColor: theme.palette.primary.main,
                          color: "white",
                          fontWeight: "bold",
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          whiteSpace: "nowrap",
                          minWidth: col.minWidth,
                        }}
                      >
                        {col.label}
                      </TableCell>
                    )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length - 1} align="center" sx={{ py: 4 }}>
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
              {filteredInvoices
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((inv) => (
                  <TableRow hover key={inv.id}>
                    <TableCell>{inv.id}</TableCell>
                    <TableCell>{inv.policyNames}</TableCell>
                    <TableCell>{`₹${inv.amount}`}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, color: getStatusColor(inv.status, theme) }}>
                        {(inv.status ?? "").toUpperCase()}
                      </Typography>
                    </TableCell>
                    <TableCell>{inv.validUptoFormatted}</TableCell>
                    <TableCell>{inv.createdAtFormatted}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewDetails(inv)}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          View
                        </Button>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleDownloadPdf(inv)}
                          aria-label="Download pdf"
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredInvoices.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(+e.target.value);
            setPage(0);
          }}
          sx={{ backgroundColor: theme.palette.background.paper }}
        />
      </Paper>


      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: theme.palette.primary.main, color: theme.palette.common.white, textAlign: "center" }}>
          Invoice Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedInvoice ? (
            <List dense>
              {[
                ["Invoice ID", selectedInvoice.id],
                ["Policy Names", selectedInvoice.policyNames],
                ["Amount", `₹${selectedInvoice.amount}`],
                ["Status", selectedInvoice.status.toUpperCase()],
                ["Valid Upto", selectedInvoice.validUptoFormatted],
                ["Created At", selectedInvoice.createdAtFormatted],
                ["Razorpay Order ID", selectedInvoice.razorpayOrderId || "N/A"],
                ["Payment Link", selectedInvoice.paymentLink || "N/A"],
                ["Months", selectedInvoice.months || "N/A"],
              ].map(([label, value]) => (
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
                  <Divider />
                  {selectedInvoice.taxDetailsList.map((tax, idx) => (
                    <React.Fragment key={idx}>
                      <ListItem>
                        <ListItemText
                          secondary={
                            <>
                              <Typography>Policy ID: {tax.policyId}</Typography>
                              <Typography>GST Rate: {tax.gstRate * 100}%</Typography>
                              <Typography>Tax Amount: ₹{tax.taxAmount}</Typography>
                              <Typography>Total Amount: ₹{selectedInvoice.amount}</Typography>
                            </>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </>
              )}
            </List>
          ) : (
            <Typography>No invoice selected.</Typography>
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
