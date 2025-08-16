import React, { useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  Switch,
  FormControlLabel,
  Divider,
  Stack,
  alpha,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import EmailIcon from "@mui/icons-material/Email";
import WorkIcon from "@mui/icons-material/Work";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

const AppTitle = ({ user, onLogout, mode, setMode }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleProfileOpen = () => {
    setProfileOpen(true);
    handleMenuClose();
  };
  const handleProfileClose = () => setProfileOpen(false);
  const handleLogoutClick = () => {
    handleMenuClose();
    onLogout();
  };
  const handleModeToggle = () => {
    setMode(mode === "dark" ? "light" : "dark");
  };

  // Fix: safely get first character of a string with no syntax errors
  const initial =
    (user && user.name && user.name[0]?.toUpperCase()) ||
    (user && user.fullName && user.fullName?.toUpperCase()) ||
    (user && user.email && user.email?.toUpperCase()) ||
    null;

  // Gradient header background color - matches your other header
  const headerBgColor = `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`;

  const avatarBorderAndBgColor = mode === "dark" ? theme.palette.primary.main : theme.palette.primary.dark;
  const avatarContrastTextColor = theme.palette.getContrastText(avatarBorderAndBgColor);

  return (
    <>
      <Box
        sx={{
          position: "relative",
          background: headerBgColor, // Use gradient here
          minHeight: 64,
          width: "100%",
          display: "flex",
          alignItems: "center",
          px: { xs: 2, md: 3 },
          boxShadow: `0 6px 20px ${alpha(theme.palette.common.black, 0.15)}`,
          zIndex: theme.zIndex.appBar,
        }}
      >
        {/* Centered Title */}
        <Typography
          variant="h5"
          noWrap
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            mx: "auto",
            width: "fit-content",
            fontWeight: 700,
            letterSpacing: 1.5,
            color: '#FFFFFF',
            textAlign: "center",
            top: "50%",
            transform: "translateY(-50%)",
            userSelect: "none",
            pointerEvents: "none",
            textShadow: `1px 1px 3px ${alpha(theme.palette.common.black, 0.3)}`,
          }}
        >
          PayAssure
        </Typography>

        {/* Right Avatar and Menu */}
        <Box sx={{ ml: "auto", zIndex: 2 }}>
          <IconButton
            onClick={handleMenuOpen}
            size="large"
            sx={{
              p: 0,
              borderRadius: "50%",
              border: `2px solid ${avatarBorderAndBgColor}`,
              transition: "transform 0.2s ease-in-out",
              "&:hover": {
                transform: "scale(1.1)",
                borderColor: theme.palette.secondary.main,
                bgcolor: alpha(avatarBorderAndBgColor, 0.1),
              },
            }}
            aria-label="profile menu"
          >
            <Avatar
              sx={{
                bgcolor: avatarBorderAndBgColor,
                color: avatarContrastTextColor,
                width: 40,
                height: 40,
                fontWeight: "bold",
                fontSize: 20,
              }}
            >
              {initial || <PersonIcon />}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                borderRadius: 2,
                boxShadow: `0 8px 30px ${alpha(theme.palette.common.black, 0.2)}`,
                bgcolor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                minWidth: 200,
                overflow: "hidden",
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              },
            }}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={handleProfileOpen} sx={{ py: 1.5 }}>
              <AccountCircleIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
              <Typography color="text.primary">View Profile</Typography>
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={(e) => e.stopPropagation()} disableRipple sx={{ py: 1.5 }}>
              <Brightness4Icon sx={{ mr: 1.5, color: theme.palette.info.main }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={mode === "dark"}
                    onChange={handleModeToggle}
                    size="small"
                    color="primary"
                    sx={{ ml: 'auto' }}
                  />
                }
                labelPlacement="start"
                label={
                  <Typography variant="body2" color="text.primary">
                    {mode === "dark" ? "Dark Mode" : "Light Mode"}
                  </Typography>
                }
              />
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={handleLogoutClick}
              sx={{
                color: theme.palette.error.main,
                py: 1.5,
                "&:hover": {
                  bgcolor: alpha(theme.palette.error.main, 0.08),
                },
              }}
            >
              <LogoutIcon sx={{ mr: 1.5 }} />
              <Typography color="inherit">Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Profile Dialog */}
      <Dialog
        open={profileOpen}
        onClose={handleProfileClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            borderRadius: 3,
            p: 3,
            boxShadow: `0 10px 40px ${alpha(theme.palette.common.black, 0.25)}`,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            textAlign: "center",
            position: "relative",
            pb: 2,
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "50px",
              height: "3px",
              bgcolor: theme.palette.primary.main,
              borderRadius: "2px",
            },
          }}
        >
          User Profile
          <IconButton
            aria-label="close"
            onClick={handleProfileClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: theme.palette.text.secondary,
              "&:hover": {
                color: theme.palette.primary.main,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", py: 3 }}>
          <Avatar
            sx={{
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              width: 72,
              height: 72,
              mx: "auto",
              mb: 3,
              border: `3px solid ${theme.palette.primary.light}`,
              fontWeight: "bold",
              fontSize: 32,
              boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            {initial || <PersonIcon sx={{ fontSize: 40 }} />}
          </Avatar>
          <Stack spacing={1.5} alignItems="center">
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {user?.name || user?.fullName || "N/A"}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <EmailIcon sx={{ color: theme.palette.text.secondary, fontSize: 18 }} />
              <Typography variant="body2" color="text.secondary">
                {user?.email || "N/A"}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <WorkIcon sx={{ color: theme.palette.text.secondary, fontSize: 18 }} />
              <Typography variant="body2" color="text.secondary">
                Role: {user?.role || "N/A"}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <VpnKeyIcon sx={{ color: theme.palette.text.secondary, fontSize: 18 }} />
              <Typography variant="body2" color="text.secondary">
                ID: {user?.id || "N/A"}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AccessTimeIcon sx={{ color: theme.palette.text.secondary, fontSize: 18 }} />
              <Typography variant="body2" color="text.secondary">
                Joined:{" "}
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pt: 3, pb: 2 }}>
          <Button
            variant="contained"
            onClick={handleProfileClose}
            sx={{
              minWidth: 150,
              borderRadius: 3,
              fontWeight: 600,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
              boxShadow: `0 3px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
              transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: `0 6px 15px ${alpha(theme.palette.primary.main, 0.4)}`,
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AppTitle;



















// import React, { useState } from "react";
// import {
//   Box,
//   Typography,
//   Avatar,
//   IconButton,
//   Menu,
//   MenuItem,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   useTheme,
//   Switch,
//   FormControlLabel,
//   Divider,
//   Stack,
//   alpha,
// } from "@mui/material";
// import PersonIcon from "@mui/icons-material/Person";
// import CloseIcon from "@mui/icons-material/Close";
// import Brightness4Icon from "@mui/icons-material/Brightness4";
// import LogoutIcon from "@mui/icons-material/Logout";
// import AccountCircleIcon from "@mui/icons-material/AccountCircle";
// import EmailIcon from "@mui/icons-material/Email";
// import WorkIcon from "@mui/icons-material/Work";
// import VpnKeyIcon from "@mui/icons-material/VpnKey";
// import AccessTimeIcon from "@mui/icons-material/AccessTime";

// const AppTitle = ({ user, onLogout, mode, setMode }) => {
//   const theme = useTheme();
//   const [anchorEl, setAnchorEl] = useState(null);
//   const [profileOpen, setProfileOpen] = useState(false);

//   const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
//   const handleMenuClose = () => setAnchorEl(null);
//   const handleProfileOpen = () => {
//     setProfileOpen(true);
//     handleMenuClose();
//   };
//   const handleProfileClose = () => setProfileOpen(false);
//   const handleLogoutClick = () => {
//     handleMenuClose();
//     onLogout();
//   };
//   const handleModeToggle = () => {
//     setMode(mode === "dark" ? "light" : "dark");
//   };

//   const initial =
//     user?.name?.[0]?.toUpperCase() ||
//     user?.fullName?.[0]?.toUpperCase() ||
//     user?.email?.[0]?.toUpperCase() ||
//     null;

//   // Header background color - this will remain subtle and themed
//   const headerBgColor =
//     mode === "dark"
//       ? alpha(theme.palette.background.paper, 0.95)
//       : alpha(theme.palette.primary.light, 0.05);

//   // Avatar border and background color - designed to contrast with the headerBgColor
//   const avatarBorderAndBgColor = mode === "dark" ? theme.palette.primary.main : theme.palette.primary.dark;
//   const avatarContrastTextColor = theme.palette.getContrastText(avatarBorderAndBgColor);


//   return (
//     <>
//       <Box
//         sx={{
//           position: "relative",
//           background: headerBgColor, // Subtle background color
//           minHeight: 64,
//           width: "100%",
//           display: "flex",
//           alignItems: "center",
//           px: { xs: 2, md: 3 },
//           boxShadow: `0 6px 20px ${alpha(theme.palette.common.black, 0.15)}`,
//           zIndex: theme.zIndex.appBar,
//         }}
//       >
//         {/* Centered Title */}
//         <Typography
//           variant="h5"
//           noWrap
//           sx={{
//             position: "absolute",
//             left: 0,
//             right: 0,
//             mx: "auto",
//             width: "fit-content",
//             fontWeight: 700,
//             letterSpacing: 1.5,
//             color: '#FFFFFF', // FORCED WHITE COLOR FOR "PayAssure"
//             textAlign: "center",
//             top: "50%",
//             transform: "translateY(-50%)",
//             userSelect: "none",
//             pointerEvents: "none",
//             textShadow: `1px 1px 3px ${alpha(theme.palette.common.black, 0.3)}`, // Increased shadow for better visibility on lighter backgrounds
//           }}
//         >
//           PayAssure
//         </Typography>

//         {/* Right Avatar and Menu */}
//         <Box sx={{ ml: "auto", zIndex: 2 }}>
//           <IconButton
//             onClick={handleMenuOpen}
//             size="large"
//             sx={{
//               p: 0,
//               borderRadius: "50%",
//               border: `2px solid ${avatarBorderAndBgColor}`,
//               transition: "transform 0.2s ease-in-out",
//               "&:hover": {
//                 transform: "scale(1.1)",
//                 borderColor: theme.palette.secondary.main,
//                 bgcolor: alpha(avatarBorderAndBgColor, 0.1),
//               },
//             }}
//             aria-label="profile menu"
//           >
//             <Avatar
//               sx={{
//                 bgcolor: avatarBorderAndBgColor,
//                 color: avatarContrastTextColor,
//                 width: 40,
//                 height: 40,
//                 fontWeight: "bold",
//                 fontSize: 20,
//               }}
//             >
//               {initial || <PersonIcon />}
//             </Avatar>
//           </IconButton>
//           <Menu
//             anchorEl={anchorEl}
//             open={Boolean(anchorEl)}
//             onClose={handleMenuClose}
//             PaperProps={{
//               sx: {
//                 borderRadius: 2,
//                 boxShadow: `0 8px 30px ${alpha(theme.palette.common.black, 0.2)}`,
//                 bgcolor: theme.palette.background.paper, // Menu background follows theme's paper color
//                 color: theme.palette.text.primary, // Default text color for menu items
//                 minWidth: 200,
//                 overflow: "hidden",
//                 border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
//               },
//             }}
//             anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
//             transformOrigin={{ vertical: "top", horizontal: "right" }}
//           >
//             <MenuItem onClick={handleProfileOpen} sx={{ py: 1.5 }}>
//               <AccountCircleIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
//               <Typography color="text.primary">View Profile</Typography>
//             </MenuItem>
//             <Divider sx={{ my: 0.5 }} />
//             <MenuItem onClick={(e) => e.stopPropagation()} disableRipple sx={{ py: 1.5 }}>
//               <Brightness4Icon sx={{ mr: 1.5, color: theme.palette.info.main }} />
//               <FormControlLabel
//                 control={
//                   <Switch
//                     checked={mode === "dark"}
//                     onChange={handleModeToggle}
//                     size="small"
//                     color="primary"
//                     sx={{ ml: 'auto' }}
//                   />
//                 }
//                 labelPlacement="start"
//                 label={
//                   <Typography variant="body2" color="text.primary">
//                     {mode === "dark" ? "Dark Mode" : "Light Mode"}
//                   </Typography>
//                 }
//               />
//             </MenuItem>
//             <Divider sx={{ my: 0.5 }} />
//             <MenuItem
//               onClick={handleLogoutClick}
//               sx={{
//                 color: theme.palette.error.main,
//                 py: 1.5,
//                 "&:hover": {
//                   bgcolor: alpha(theme.palette.error.main, 0.08),
//                 },
//               }}
//             >
//               <LogoutIcon sx={{ mr: 1.5 }} />
//               <Typography color="inherit">Logout</Typography>
//             </MenuItem>
//           </Menu>
//         </Box>
//       </Box>

//       {/* Profile Dialog */}
//       <Dialog
//         open={profileOpen}
//         onClose={handleProfileClose}
//         maxWidth="xs"
//         fullWidth
//         PaperProps={{
//           sx: {
//             bgcolor: theme.palette.background.paper,
//             color: theme.palette.text.primary,
//             borderRadius: 3,
//             p: 3,
//             boxShadow: `0 10px 40px ${alpha(theme.palette.common.black, 0.25)}`,
//             border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
//           },
//         }}
//       >
//         <DialogTitle
//           sx={{
//             fontWeight: 700,
//             textAlign: "center",
//             position: "relative",
//             pb: 2,
//             "&::after": {
//               content: '""',
//               position: "absolute",
//               bottom: 0,
//               left: "50%",
//               transform: "translateX(-50%)",
//               width: "50px",
//               height: "3px",
//               bgcolor: theme.palette.primary.main,
//               borderRadius: "2px",
//             },
//           }}
//         >
//           User Profile
//           <IconButton
//             aria-label="close"
//             onClick={handleProfileClose}
//             sx={{
//               position: "absolute",
//               right: 8,
//               top: 8,
//               color: theme.palette.text.secondary,
//               "&:hover": {
//                 color: theme.palette.primary.main,
//               },
//             }}
//           >
//             <CloseIcon />
//           </IconButton>
//         </DialogTitle>
//         <DialogContent sx={{ textAlign: "center", py: 3 }}>
//           <Avatar
//             sx={{
//               bgcolor: theme.palette.primary.main,
//               color: theme.palette.primary.contrastText,
//               width: 72,
//               height: 72,
//               mx: "auto",
//               mb: 3,
//               border: `3px solid ${theme.palette.primary.light}`,
//               fontWeight: "bold",
//               fontSize: 32,
//               boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.2)}`,
//             }}
//           >
//             {initial || <PersonIcon sx={{ fontSize: 40 }} />}
//           </Avatar>
//           <Stack spacing={1.5} alignItems="center">
//             <Typography variant="h6" fontWeight={600} gutterBottom>
//               {user?.name || user?.fullName || "N/A"}
//             </Typography>
//             <Stack direction="row" alignItems="center" spacing={1}>
//               <EmailIcon sx={{ color: theme.palette.text.secondary, fontSize: 18 }} />
//               <Typography variant="body2" color="text.secondary">
//                 {user?.email || "N/A"}
//               </Typography>
//             </Stack>
//             <Stack direction="row" alignItems="center" spacing={1}>
//               <WorkIcon sx={{ color: theme.palette.text.secondary, fontSize: 18 }} />
//               <Typography variant="body2" color="text.secondary">
//                 Role: {user?.role || "N/A"}
//               </Typography>
//             </Stack>
//             <Stack direction="row" alignItems="center" spacing={1}>
//               <VpnKeyIcon sx={{ color: theme.palette.text.secondary, fontSize: 18 }} />
//               <Typography variant="body2" color="text.secondary">
//                 ID: {user?.id || "N/A"}
//               </Typography>
//             </Stack>
//             <Stack direction="row" alignItems="center" spacing={1}>
//               <AccessTimeIcon sx={{ color: theme.palette.text.secondary, fontSize: 18 }} />
//               <Typography variant="body2" color="text.secondary">
//                 Joined:{" "}
//                 {user?.createdAt
//                   ? new Date(user.createdAt).toLocaleDateString("en-US", {
//                       year: "numeric",
//                       month: "long",
//                       day: "numeric",
//                     })
//                   : "N/A"}
//               </Typography>
//             </Stack>
//           </Stack>
//         </DialogContent>
//         <DialogActions sx={{ justifyContent: "center", pt: 3, pb: 2 }}>
//           <Button
//             variant="contained"
//             onClick={handleProfileClose}
//             sx={{
//               minWidth: 150,
//               borderRadius: 3,
//               fontWeight: 600,
//               background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
//               boxShadow: `0 3px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
//               transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
//               "&:hover": {
//                 transform: "translateY(-2px)",
//                 boxShadow: `0 6px 15px ${alpha(theme.palette.primary.main, 0.4)}`,
//               },
//             }}
//           >
//             Close
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </>
//   );
// };

// export default AppTitle;




// // src/components/utils/AppTitle.jsx (Updated to display full user details in View Profile dialog)
// import React, { useState } from "react";
// import {
//   Box,
//   Typography,
//   Avatar,
//   IconButton,
//   Menu,
//   MenuItem,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   useTheme,
//   Switch,
// } from "@mui/material";
// import PersonIcon from "@mui/icons-material/Person";
// import CloseIcon from "@mui/icons-material/Close";
// import Brightness4Icon from "@mui/icons-material/Brightness4"; // Icon for mode toggle

// const HEADER_BG = "#1d1d1d"; // Matches your side nav color

// const AppTitle = ({ user, onLogout, mode, setMode }) => {
//   const theme = useTheme();
//   const [anchorEl, setAnchorEl] = useState(null);
//   const [profileOpen, setProfileOpen] = useState(false);

//   const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
//   const handleMenuClose = () => setAnchorEl(null);
//   const handleProfileOpen = () => {
//     setProfileOpen(true);
//     handleMenuClose();
//   };
//   const handleProfileClose = () => setProfileOpen(false);
//   const handleLogoutClick = () => {
//     handleMenuClose();
//     onLogout();
//   };
//   const handleModeToggle = () => {
//     setMode(mode === "dark" ? "light" : "dark");
//     handleMenuClose();
//   };

//   const initial =
//     user?.name?.[0]?.toUpperCase() ||
//     user?.fullName?.[0]?.toUpperCase() ||
//     user?.email?.[0]?.toUpperCase() ||
//     null;

//   return (
//     <>
//       <Box
//         sx={{
//           position: "relative",
//           bgcolor: HEADER_BG,
//           minHeight: 64,
//           width: "100%",
//           display: "flex",
//           alignItems: "center",
//           px: 3,
//         }}
//       >
//         {/* Centered Title */}
//         <Typography
//           variant="h5"
//           sx={{
//             position: "absolute",
//             left: 0,
//             right: 0,
//             mx: "auto",
//             width: "fit-content",
//             fontWeight: 700,
//             letterSpacing: 1,
//             color: "#fff",
//             textAlign: "center",
//             top: "50%",
//             transform: "translateY(-50%)",
//             userSelect: "none",
//             pointerEvents: "none",
//           }}
//         >
//           Billing and Payment Portal
//         </Typography>

//         {/* Right Avatar */}
//         <Box sx={{ ml: "auto", zIndex: 1 }}>
//           <IconButton
//             onClick={handleMenuOpen}
//             size="large"
//             sx={{
//               bgcolor: HEADER_BG,
//               color: "#fff",
//               "&:hover": { bgcolor: "#23272f" },
//               borderRadius: "50%",
//               width: 40,
//               height: 40,
//             }}
//             aria-label="profile menu"
//           >
//             <Avatar
//               sx={{
//                 bgcolor: HEADER_BG,
//                 color: "#fff",
//                 width: 36,
//                 height: 36,
//                 border: "2px solid #fff",
//                 fontWeight: "bold",
//                 fontSize: 18,
//               }}
//             >
//               {initial || <PersonIcon />}
//             </Avatar>
//           </IconButton>
//           <Menu
//             anchorEl={anchorEl}
//             open={Boolean(anchorEl)}
//             onClose={handleMenuClose}
//             PaperProps={{
//               sx: {
//                 bgcolor: HEADER_BG,
//                 color: "#fff",
//                 minWidth: 160,
//               },
//             }}
//             anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
//             transformOrigin={{ vertical: "top", horizontal: "right" }}
//           >
//             <MenuItem onClick={handleProfileOpen}>View Profile</MenuItem>
//             <MenuItem onClick={handleModeToggle}>
//               <Brightness4Icon sx={{ mr: 1 }} />
//               {mode === "dark" ? "Light Mode" : "Dark Mode"}
//             </MenuItem>
//             <MenuItem
//               onClick={handleLogoutClick}
//               sx={{ color: theme.palette.error.main }}
//             >
//               Logout
//             </MenuItem>
//           </Menu>
//         </Box>
//       </Box>

//       {/* Profile Dialog - Updated to display email, id, role, name, createdAt */}
//       <Dialog
//         open={profileOpen}
//         onClose={handleProfileClose}
//         maxWidth="xs"
//         fullWidth
//         PaperProps={{
//           sx: {
//             bgcolor: HEADER_BG,
//             color: "#fff",
//             borderRadius: 2,
//             p: 2,
//             position: "relative",
//           },
//         }}
//       >
//         <DialogTitle
//           sx={{ fontWeight: 600, textAlign: "center", position: "relative" }}
//         >
//           User Profile
//           <IconButton
//             aria-label="close"
//             onClick={handleProfileClose}
//             sx={{
//               position: "absolute",
//               right: 8,
//               top: 8,
//               color: "#fff",
//             }}
//           >
//             <CloseIcon />
//           </IconButton>
//         </DialogTitle>
//         <DialogContent sx={{ textAlign: "center", py: 2 }}>
//           <Avatar
//             sx={{
//               bgcolor: HEADER_BG,
//               color: "#fff",
//               width: 56,
//               height: 56,
//               mx: "auto",
//               mb: 2,
//               border: "2px solid #fff",
//               fontWeight: "bold",
//               fontSize: 24,
//             }}
//           >
//             {initial || <PersonIcon />}
//           </Avatar>
//           <Typography variant="h6" gutterBottom>
//             {user?.name || "N/A"}
//           </Typography>
//           <Typography variant="body2" sx={{ color: "#bbb" }} gutterBottom>
//             Email: {user?.email || "N/A"}
//           </Typography>
//           <Typography variant="body2" sx={{ color: "#bbb" }} gutterBottom>
//             Role: {user?.role || "N/A"}
//           </Typography>
//           <Typography variant="body2" sx={{ color: "#bbb" }} gutterBottom>
//             ID: {user?.id || "N/A"}
//           </Typography>
//           <Typography variant="body2" sx={{ color: "#bbb" }}>
//             Created At: {user?.createdAt ? new Date(user.createdAt).toLocaleString() : "N/A"}
//           </Typography>
//         </DialogContent>
//         <DialogActions sx={{ justifyContent: "center" }}>
//           <Button
//             variant="contained"
//             onClick={handleProfileClose}
//             sx={{ minWidth: 120 }}
//           >
//             Close
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </>
//   );
// };

// export default AppTitle;