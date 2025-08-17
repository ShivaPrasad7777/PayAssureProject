// src/components/utils/RoleConfig.jsx
import CustomerDashboard from "../customers/CustomerDashboard";
import CustomerInvoiceList from "../customers/CustomerInvoiceList";
import InsurerDashboard from "../insurers/InsurerDashboard";
import InsurerAssignInvoice from "../insurers/InsurerAssignInvoice";
import InsurerPaymentHistory from "../insurers/InsurerPaymentHistory";
import InsurerInvoiceHistory from "../insurers/InsurerInvoiceHistory";
import InsurerCashPayment from "../insurers/InsurerCashPayment";
import CustomerPaymentHistory from "../customers/CustomerPaymentHistory";
import CustomerPolicies from "../customers/CustomerPolicies";
import CustomerSendEmail from "../customers/CustomerSendEmail";
// Add more imports as needed

import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PaymentsIcon from "@mui/icons-material/Payments"; // More specific for payments
import CreditCardIcon from "@mui/icons-material/CreditCard"; // For autopay
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined"; // For send mail
import MoneyIcon from "@mui/icons-material/Money"; // For cash payments
import CustomerInvoiceHistory from "../customers/CustomerInvoiceHistory";

const RoleConfig = {
  
  insurer: {
    navigation: [
      { segment: "dashboard", title: "Dashboard", icon: <DashboardIcon /> },
      { segment: "assign-invoice", title: "Assign Invoice", icon: <AssignmentIndIcon /> },
      { segment: "invoice-list", title: "Invoice List", icon: <ListAltIcon /> },
      { segment: "payment-history", title: "Payment History", icon: <PaymentsIcon /> }, // Changed icon
      { segment: "pay-by-cash", title: "Pay By Cash", icon: <MoneyIcon /> }, // Changed icon
      { segment: "send-mail", title: "Send Reminders", icon: <EmailOutlinedIcon /> }, // Changed icon
    ],
    routes: {
      dashboard: InsurerDashboard,
      "assign-invoice": InsurerAssignInvoice,
      "pay-by-cash": InsurerCashPayment,
      "invoice-list": InsurerInvoiceHistory,
      "payment-history": InsurerPaymentHistory,
      "send-mail": CustomerSendEmail, // Assuming this is a shared component or needs to be specific
    },
  },
  customer: {
    navigation: [
      { segment: "dashboard", title: "Dashboard", icon: <DashboardIcon /> },
      { segment: "invoice-list", title: "Unpaid Invoices", icon: <ReceiptIcon /> },
      { segment: "invoice-history", title: "Invoice History", icon: <PaymentsIcon /> },
      { segment: "payment-history", title: "Payment History", icon: <PaymentsIcon /> }, // Changed icon & title
      { segment: "autopay", title: "Autopay Settings", icon: <CreditCardIcon /> }, // Changed icon & title
    ],
    routes: {
      dashboard: CustomerDashboard,
      "invoice-list": CustomerInvoiceList,
      "invoice-history" :CustomerInvoiceHistory,
      "payment-history": CustomerPaymentHistory,
      "autopay": CustomerPolicies,
    },
  },
  // Add more roles if needed
};

export default RoleConfig;

