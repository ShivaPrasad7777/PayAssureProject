// src/components/customers/AutoPayToggle.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';

function AutoPayToggle({ customerId, policyId, amount, maxMonths, initialEnabled, initialSubscriptionId }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [subscriptionId, setSubscriptionId] = useState(initialSubscriptionId || '');
  const [months, setMonths] = useState(1); // Default to 1 month
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync state with props on mount (for initial values)
  useEffect(() => {
    setEnabled(initialEnabled);
    setSubscriptionId(initialSubscriptionId || '');
  }, [initialEnabled, initialSubscriptionId]);

  // Generate month options up to maxMonths
  const monthOptions = Array.from({ length: maxMonths }, (_, i) => i + 1);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      if (enabled) {
        // Disable auto pay
        await axios.post('http://localhost:9999/api/customer/autopay/disable', { customerId, subscriptionId, policyId });
        setEnabled(false);
        setSubscriptionId('');
      } else {
        // Enable auto pay with selected months
        const response = await axios.post(`http://localhost:9999/api/customer/autopay/enable/policy/${policyId}`, {
          customerId,
          months,
          amount,
        });
        const extractedId = response.data.includes('Subscription ID: ') 
          ? response.data.split('Subscription ID: ')[1] 
          : response.data;
        setSubscriptionId(extractedId);
        setEnabled(true);
      }
    } catch (err) {
      setError(err.response?.data || 'Error toggling auto pay');
    }
    setLoading(false);
  };

  return (
    <div>
      {!enabled && maxMonths > 0 && (
        <FormControl fullWidth sx={{ mb: 1 }}>
          <InputLabel>Select Months (Max {maxMonths})</InputLabel>
          <Select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            {monthOptions.map(opt => (
              <MenuItem key={opt} value={opt}>{opt} Month{opt > 1 ? 's' : ''}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      <Button onClick={handleToggle} disabled={loading || maxMonths === 0}>
        {loading ? 'Processing...' : (enabled ? 'Disable Auto Pay' : 'Enable Auto Pay')}
      </Button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {maxMonths === 0 && <p>No remaining months for auto pay.</p>}
    </div>
  );
}

export default AutoPayToggle;

// // src/components/customers/AutoPayToggle.jsx
// // Updated for per-policy auto pay with dynamic month selection (limited by maxMonths)

// import React, { useState } from 'react';
// import axios from 'axios';
// import { Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';

// function AutoPayToggle({ customerId, policyId, amount, maxMonths, initialEnabled }) {
//   const [enabled, setEnabled] = useState(initialEnabled);
//   const [subscriptionId, setSubscriptionId] = useState('');
//   const [months, setMonths] = useState(1); // Default to 1 month
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(false);

//   // Generate month options up to maxMonths
//   const monthOptions = Array.from({ length: maxMonths }, (_, i) => i + 1);

//   const handleToggle = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       if (enabled) {
//         // Disable auto pay
//         await axios.post('http://localhost:9999/api/customer/autopay/disable', { customerId, subscriptionId, policyId });
//         setEnabled(false);
//         setSubscriptionId('');
//       } else {
//         // Enable auto pay with selected months
//         const response = await axios.post(`http://localhost:9999/api/customer/autopay/enable/policy/${policyId}`, {
//           customerId,
//           months,
//           amount,
//         });
//         const extractedId = response.data.includes('Subscription ID: ') 
//           ? response.data.split('Subscription ID: ')[1] 
//           : response.data;
//         setSubscriptionId(extractedId);
//         setEnabled(true);
//       }
//     } catch (err) {
//       setError(err.response?.data || 'Error toggling auto pay');
//     }
//     setLoading(false);
//   };

//   return (
//     <div>
//       {!enabled && maxMonths > 0 && (
//         <FormControl fullWidth sx={{ mb: 1 }}>
//           <InputLabel>Select Months (Max {maxMonths})</InputLabel>
//           <Select
//             value={months}
//             onChange={(e) => setMonths(Number(e.target.value))}
//           >
//             {monthOptions.map(opt => (
//               <MenuItem key={opt} value={opt}>{opt} Month{opt > 1 ? 's' : ''}</MenuItem>
//             ))}
//           </Select>
//         </FormControl>
//       )}
//       <Button onClick={handleToggle} disabled={loading || maxMonths === 0}>
//         {loading ? 'Processing...' : (enabled ? 'Disable Auto Pay' : 'Enable Auto Pay')}
//       </Button>
//       {error && <p style={{ color: 'red' }}>{error}</p>}
//       {maxMonths === 0 && <p>No remaining months for auto pay.</p>}
//     </div>
//   );
// }

// export default AutoPayToggle;
