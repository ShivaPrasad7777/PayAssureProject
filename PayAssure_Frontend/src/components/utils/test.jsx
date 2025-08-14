import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  styled
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CalendarToday, AccountCircle, MonetizationOn, Receipt } from '@mui/icons-material';

// Custom theme with rich colors (avoiding blue)
const theme = createTheme({
  palette: {
    primary: {
      main: '#6a1b9a', // Deep purple
    },
    secondary: {
      main: '#00796b', // Teal
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#f57c00',
    },
    success: {
      main: '#388e3c',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: "'Poppins', sans-serif",
  },
});

// Sample customer data
const customers = [
  {
    id: 1,
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    policies: [
      { id: 'POL001', type: 'Health Plus', premium: 250, dueDate: '2023-06-15', status: 'unpaid' },
      { id: 'POL002', type: 'Auto Shield', premium: 180, dueDate: '2023-07-01', status: 'unpaid' }
    ]
  },
  {
    id: 2,
    name: 'Sarah Williams',
    email: 'sarah.w@example.com',
    policies: [
      { id: 'POL003', type: 'Home Secure', premium: 320, dueDate: '2023-06-20', status: 'unpaid' },
      { id: 'POL004', type: 'Life Protect', premium: 150, dueDate: '2023-07-10', status: 'unpaid' }
    ]
  },
  {
    id: 3,
    name: 'Michael Brown',
    email: 'michael.b@example.com',
    policies: [
      { id: 'POL005', type: 'Travel Guard', premium: 190, dueDate: '2023-06-25', status: 'paid' },
      { id: 'POL006', type: 'Health Plus', premium: 250, dueDate: '2023-07-05', status: 'unpaid' }
    ]
  }
];

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: '12px',
  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 20px rgba(0, 0, 0, 0.15)'
  }
}));

const PolicyStatusChip = styled(Chip)(({ status }) => ({
  backgroundColor: status === 'paid' ? '#4caf50' : '#ff9800',
  color: 'white',
  fontWeight: 'bold'
}));

const InvoiceAssigner = () => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedPolicies, setSelectedPolicies] = useState([]);
  const [months, setMonths] = useState(1);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setSelectedPolicies([]);
    setGeneratedInvoice(null);
  };

  const handlePolicyToggle = (policyId) => {
    setSelectedPolicies(prev => 
      prev.includes(policyId) 
        ? prev.filter(id => id !== policyId) 
        : [...prev, policyId]
    );
  };

  const handleGenerateInvoice = () => {
    if (selectedPolicies.length === 0) return;
    
    const invoice = {
      id: `INV-${Date.now()}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      date: new Date().toISOString().split('T')[0],
      items: selectedCustomer.policies
        .filter(policy => selectedPolicies.includes(policy.id))
        .map(policy => ({
          policyId: policy.id,
          policyType: policy.type,
          premiumAmount: policy.premium,
          duration: `${months} month(s)`,
          total: policy.premium * months
        })),
      totalAmount: selectedCustomer.policies
        .filter(policy => selectedPolicies.includes(policy.id))
        .reduce((sum, policy) => sum + (policy.premium * months), 0)
    };
    
    setGeneratedInvoice(invoice);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ padding: 4, maxWidth: 1200, margin: '0 auto' }}>
        <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', mb: 4 }}>
          <Receipt sx={{ verticalAlign: 'middle', mr: 1 }} /> Invoice Assignment System
        </Typography>
        
        <Grid container spacing={4}>
          {/* Customer List Column */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: '12px', boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'secondary.main' }}>
                  Customers
                </Typography>
                <Divider sx={{ my: 2 }} />
                {customers.map(customer => (
                  <StyledCard 
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    sx={{ 
                      cursor: 'pointer',
                      borderLeft: selectedCustomer?.id === customer.id ? `4px solid ${theme.palette.primary.main}` : 'none'
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AccountCircle sx={{ color: 'primary.main', mr: 1 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {customer.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {customer.email}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">
                          {customer.policies.length} policies
                        </Typography>
                        <Typography variant="caption">
                          {customer.policies.filter(p => p.status === 'unpaid').length} unpaid
                        </Typography>
                      </Box>
                    </CardContent>
                  </StyledCard>
                ))}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Policy and Invoice Column */}
          <Grid item xs={12} md={8}>
            {selectedCustomer ? (
              <Box>
                <Card sx={{ borderRadius: '12px', boxShadow: 3, mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: 'secondary.main' }}>
                      Unpaid Policies - {selectedCustomer.name}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell />
                            <TableCell>Policy ID</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Premium</TableCell>
                            <TableCell>Due Date</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedCustomer.policies
                            .filter(policy => policy.status === 'unpaid')
                            .map(policy => (
                              <TableRow 
                                key={policy.id}
                                hover
                                selected={selectedPolicies.includes(policy.id)}
                                onClick={() => handlePolicyToggle(policy.id)}
                                sx={{ cursor: 'pointer' }}
                              >
                                <TableCell padding="checkbox">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedPolicies.includes(policy.id)}
                                    onChange={() => {}}
                                  />
                                </TableCell>
                                <TableCell>{policy.id}</TableCell>
                                <TableCell>{policy.type}</TableCell>
                                <TableCell>${policy.premium}</TableCell>
                                <TableCell>{policy.dueDate}</TableCell>
                                <TableCell>
                                  <PolicyStatusChip 
                                    label={policy.status.toUpperCase()} 
                                    status={policy.status}
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {selectedCustomer.policies.filter(p => p.status === 'unpaid').length === 0 && (
                      <Typography variant="body1" sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                        No unpaid policies found for this customer.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
                
                {selectedPolicies.length > 0 && (
                  <Card sx={{ borderRadius: '12px', boxShadow: 3, mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ color: 'secondary.main' }}>
                        Assign Premiums
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>Duration</InputLabel>
                          <Select
                            value={months}
                            label="Duration"
                            onChange={(e) => setMonths(e.target.value)}
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                              <MenuItem key={month} value={month}>
                                {month} month{month > 1 ? 's' : ''}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        <Button
                          variant="contained"
                          color="primary"
                          size="large"
                          onClick={handleGenerateInvoice}
                          startIcon={<MonetizationOn />}
                          sx={{ 
                            textTransform: 'none',
                            borderRadius: '8px',
                            padding: '8px 20px'
                          }}
                        >
                          Generate Invoice
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                )}
                
                {generatedInvoice && (
                  <Card sx={{ borderRadius: '12px', boxShadow: 3 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" sx={{ color: 'secondary.main' }}>
                          Generated Invoice
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          #{generatedInvoice.id}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ mb: 3 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Customer:</Typography>
                            <Typography>{generatedInvoice.customerName}</Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Date:</Typography>
                            <Typography>{generatedInvoice.date}</Typography>
                          </Grid>
                        </Grid>
                      </Box>
                      
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Policy ID</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Premium</TableCell>
                              <TableCell>Duration</TableCell>
                              <TableCell align="right">Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {generatedInvoice.items.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.policyId}</TableCell>
                                <TableCell>{item.policyType}</TableCell>
                                <TableCell>${item.premiumAmount}</TableCell>
                                <TableCell>{item.duration}</TableCell>
                                <TableCell align="right">${item.total}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell colSpan={4} align="right" sx={{ fontWeight: 'bold' }}>Total Amount:</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                ${generatedInvoice.totalAmount}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                )}
              </Box>
            ) : (
              <Card sx={{ borderRadius: '12px', boxShadow: 3, textAlign: 'center', p: 4 }}>
                <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                  Select a customer to view their unpaid policies and assign premiums
                </Typography>
              </Card>
            )}
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
};

export default testpage;
