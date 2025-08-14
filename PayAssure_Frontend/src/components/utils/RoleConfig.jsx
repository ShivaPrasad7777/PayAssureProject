// src/components/utils/RoleConfig.jsx
import AdminDashboard from "../admin/AdminDashboard";
import CustomerDashboard from "../customers/CustomerDashboard";
import CustomerInvoiceList from "../customers/CustomerInvoiceList";
import CustomerPaymentPage from "../customers/CustomerPaymentPage";
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

const RoleConfig = {
  admin: {
    navigation: [
      { segment: "dashboard", title: "Dashboard", icon: <DashboardIcon /> },
    ],
    routes: {
      dashboard: AdminDashboard,
    },
  },
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
      { segment: "payment-history", title: "My Payments", icon: <PaymentsIcon /> }, // Changed icon & title
      { segment: "autopay", title: "Autopay Settings", icon: <CreditCardIcon /> }, // Changed icon & title
    ],
    routes: {
      dashboard: CustomerDashboard,
      "invoice-list": CustomerInvoiceList,
      "payment-history": CustomerPaymentHistory,
      "autopay": CustomerPolicies,
    },
  },
  // Add more roles if needed
};

export default RoleConfig;




// // src/components/utils/RoleConfig.jsx (Updated to include invoice-list for customer)
// import AdminDashboard from "../admin/AdminDashboard";
// import CustomerDashboard from "../customers/CustomerDashboard";
// import CustomerInvoiceList from "../customers/CustomerInvoiceList";
// import CustomerPaymentPage from "../customers/CustomerPaymentPage";
// import InsurerDashboard from "../insurers/InsurerDashboard";
// import InsurerAssignInvoice from "../insurers/InsurerAssignInvoice";
// import InsurerPaymentHistory from "../insurers/InsurerPaymentHistory";
// import InsurerInvoiceHistory from "../insurers/InsurerInvoiceHistory";
// import InsurerCashPayment from "../insurers/InsurerCashPayment";
// import CustomerPaymentHistory from "../customers/CustomerPaymentHistory";
// import CustomerPolicies from "../customers/CustomerPolicies";
// import CustomerSendEmail from "../customers/CustomerSendEmail";
// // Add more imports as needed

// import DashboardIcon from "@mui/icons-material/Dashboard";
// import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
// import ListAltIcon from "@mui/icons-material/ListAlt";
// import ReceiptIcon from "@mui/icons-material/Receipt";

// const RoleConfig = {
//   admin: {
//     navigation: [
//       { segment: "dashboard", title: "Dashboard", icon: <DashboardIcon /> },
//     ],
//     routes: {
//       dashboard: AdminDashboard,
//     },
//   },
//   insurer: {
//     navigation: [
//       { segment: "dashboard", title: "Dashboard", icon: <DashboardIcon /> },
//       { segment: "assign-invoice", title: "Assign Invoice", icon: <AssignmentIndIcon /> },
//       { segment: "invoice-list", title: "Invoice List", icon: <ListAltIcon /> },
//     { segment: "payment-history", title: "Payments History", icon: <ListAltIcon /> },
//     { segment: "pay-by-cash", title: "Pay By Cash", icon: <ListAltIcon /> },
//     { segment: "send-mail", title: "Send Remainders", icon: <ListAltIcon /> },
//     ],
//     routes: {
//       dashboard: InsurerDashboard,
//       "assign-invoice": InsurerAssignInvoice,
//       "pay-by-cash":InsurerCashPayment,
//       "invoice-list": InsurerInvoiceHistory,
//       "payment-history": InsurerPaymentHistory, 
//       "send-mail": CustomerSendEmail,
//     },
//   },
//   customer: {
//     navigation: [
//       { segment: "dashboard", title: "Dashboard", icon: <DashboardIcon /> },
//       { segment: "invoice-list", title: "Unpaid Invoices", icon: <ReceiptIcon /> },
//         { segment: "payment-history", title: "Payments", icon: <ReceiptIcon /> },  
//          { segment: "autopay", title: "Autopay", icon: <ReceiptIcon /> },
//         // Updated title for clarity
//     ],
//     routes: {
//       dashboard: CustomerDashboard,
//       "invoice-list": CustomerInvoiceList, // Page to view and pay invoices
//       "payment-history": CustomerPaymentHistory,
//       "autopay": CustomerPolicies,
//        // If needed for other payments
//     },
//   },
//   // Add more roles if needed
// };

// export default RoleConfig;





