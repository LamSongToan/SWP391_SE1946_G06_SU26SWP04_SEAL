import { useMemo, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import AltRouteRoundedIcon from "@mui/icons-material/AltRouteRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import DomainVerificationRoundedIcon from "@mui/icons-material/DomainVerificationRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import { authStorage, logout } from "../api/http";
import AccountApprovalPanel from "../components/coordinator/AccountApprovalPanel";
import EventManagementPanel from "../components/coordinator/EventManagementPanel";
import RoundManagementPanel from "../components/coordinator/RoundManagementPanel";
import TrackManagementPanel from "../components/coordinator/TrackManagementPanel";
import UserProfilePanel from "../components/profile/UserProfilePanel";
import ChangePasswordPage from "./ChangePasswordPage";
import TeamManagementPanel from "../components/team/TeamManagementPanel";

const DRAWER_WIDTH = 292;

const STUDENT_CORE_NAV = [
  { key: "teams", label: "My Teams", icon: <GroupsRoundedIcon fontSize="small" /> },
  { key: "submissions", label: "Submissions", icon: <UploadFileRoundedIcon fontSize="small" /> },
];

const COORDINATOR_CORE_NAV = [
  { key: "users", label: "User Management", icon: <ManageAccountsRoundedIcon fontSize="small" /> },
  { key: "events", label: "Event Management", icon: <EventRoundedIcon fontSize="small" /> },
  { key: "tracks", label: "Category Management", icon: <CategoryRoundedIcon fontSize="small" /> },
  { key: "rounds", label: "Round Management", icon: <AltRouteRoundedIcon fontSize="small" /> },
];

const ACCOUNT_NAV = [
  { key: "account", label: "Account Setting", icon: <SettingsRoundedIcon fontSize="small" /> },
  { key: "password", label: "Change Password", icon: <LockRoundedIcon fontSize="small" /> },
];

export default function DashboardPage() {
  const auth = authStorage.get();
  const currentRole = auth?.roles?.includes("COORDINATOR") ? "COORDINATOR" : "STUDENT";

  const [activeKey, setActiveKey] = useState(currentRole === "COORDINATOR" ? "users" : "account");
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const coreNavItems = useMemo(
    () => (currentRole === "COORDINATOR" ? COORDINATOR_CORE_NAV : STUDENT_CORE_NAV),
    [currentRole]
  );

  const pageTitle = useMemo(() => {
    const allItems = [...coreNavItems, ...ACCOUNT_NAV];
    return allItems.find((item) => item.key === activeKey)?.label || "Dashboard";
  }, [coreNavItems, activeKey]);

  const placeholderCard = (title, description) => (
    <Card className="ms-data-card">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
        <Typography color="text.secondary">{description}</Typography>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    if (activeKey === "account") return <UserProfilePanel />;
    if (activeKey === "password") return <ChangePasswordPage />;

    if (currentRole === "COORDINATOR") {
      if (activeKey === "users") return <AccountApprovalPanel />;
      if (activeKey === "events") return <EventManagementPanel />;
      if (activeKey === "tracks") return <TrackManagementPanel />;
      if (activeKey === "rounds") return <RoundManagementPanel />;
      return null;
    }

    if (activeKey === "teams") {
      return <TeamManagementPanel />;
    }
    if (activeKey === "submissions") {
      return placeholderCard("Submissions", "Submission module will be integrated in a later sprint.");
    }
    return null;
  };

  const openProfileMenu = (event) => setProfileMenuAnchor(event.currentTarget);
  const closeProfileMenu = () => setProfileMenuAnchor(null);

  const jumpAccount = (key) => {
    setActiveKey(key);
    closeProfileMenu();
  };

  const runLogout = () => {
    closeProfileMenu();
    logout();
  };

  const onSelectNav = (key) => {
    setActiveKey(key);
    setMobileOpen(false);
  };

  const sidePanel = (
    <Box className="ms-sidebar-inner">
      <Box className="ms-sidebar-spacer" />

      <Box className="ms-brand">
        <Box className="ms-brand-badge">
          <DomainVerificationRoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography className="ms-brand-title" variant="h5">
            {currentRole === "COORDINATOR" ? "SEAL Admin" : "SEAL Workspace"}
          </Typography>
          <Typography className="ms-brand-subtitle" variant="caption">
            Enterprise Operations
          </Typography>
        </Box>
      </Box>

      <Box className="ms-nav-wrap">
        <Typography className="ms-nav-title">MAIN MENU</Typography>
        <List className="ms-nav-list">
          {coreNavItems.map((item) => (
            <ListItemButton
              key={item.key}
              selected={activeKey === item.key}
              onClick={() => onSelectNav(item.key)}
              className="ms-nav-item"
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Box sx={{ mt: "auto", p: 2 }}>
        <Button
          onClick={openProfileMenu}
          className="ms-profile-btn"
          sx={{ justifyContent: "flex-start", py: 1.2, px: 1.2, textTransform: "none" }}
          fullWidth
        >
          <Avatar sx={{ width: 40, height: 40, bgcolor: "#0f172a", mr: 1.1 }}>
            {(auth?.username || "U").slice(0, 2).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1, textAlign: "left" }}>
            <Typography sx={{ fontWeight: 700, color: "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {auth?.username || "Unknown"}
            </Typography>
            <Typography className="ms-profile-hint" sx={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {auth?.email || ""}
            </Typography>
          </Box>
          <ExpandMoreRoundedIcon sx={{ color: "#9fb2d7" }} />
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box className="ms-shell" sx={{ display: "flex" }}>
      <Drawer
        variant="permanent"
        PaperProps={{ className: "ms-sidebar", sx: { width: DRAWER_WIDTH } }}
        sx={{ display: { xs: "none", lg: "block" }, width: DRAWER_WIDTH }}
        open
      >
        {sidePanel}
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ className: "ms-sidebar", sx: { width: DRAWER_WIDTH } }}
        sx={{ display: { xs: "block", lg: "none" } }}
      >
        {sidePanel}
      </Drawer>

      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={closeProfileMenu}
        transformOrigin={{ horizontal: "right", vertical: "bottom" }}
        anchorOrigin={{ horizontal: "right", vertical: "top" }}
      >
        <MenuItem onClick={() => jumpAccount("account")}>
          <ListItemIcon><SettingsRoundedIcon fontSize="small" /></ListItemIcon>
          Account Setting
        </MenuItem>
        <MenuItem onClick={() => jumpAccount("password")}>
          <ListItemIcon><LockRoundedIcon fontSize="small" /></ListItemIcon>
          Change Password
        </MenuItem>
        <Divider />
        <MenuItem onClick={runLogout} sx={{ color: "error.main" }}>
          <ListItemIcon sx={{ color: "error.main" }}><LogoutRoundedIcon fontSize="small" /></ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Box component="main" className="ms-content" sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar position="sticky" className="ms-topbar" elevation={0}>
          <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
            <Toolbar disableGutters sx={{ justifyContent: "space-between", minHeight: 72, gap: 2 }}>
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                <IconButton
                  onClick={() => setMobileOpen(true)}
                  sx={{ display: { xs: "inline-flex", lg: "none" } }}
                >
                  <MenuRoundedIcon />
                </IconButton>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h4" className="ms-page-title" noWrap>
                    SEAL Dashboard
                  </Typography>
                  <Typography variant="body2" className="ms-page-subtitle" noWrap>
                    {pageTitle}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                <Chip className="ms-chip" size="small" icon={<TuneRoundedIcon />} label={`Role: ${currentRole}`} variant="outlined" />
                <Chip className="ms-chip" size="small" label={`${coreNavItems.length} modules`} variant="outlined" />
              </Stack>
            </Toolbar>
          </Container>
        </AppBar>

        <Container maxWidth={false} className="ms-page-body">
          <Box className="ms-breadcrumb">
            <HomeRoundedIcon sx={{ fontSize: 16 }} />
            <span>Dashboard</span>
            <span>/</span>
            <span style={{ color: "#1d2638", fontWeight: 600 }}>{pageTitle}</span>
          </Box>

          <Box className="ms-dashboard-strip">
            <Box className="ms-stat-card">
              <Stack direction="row" spacing={1.2} alignItems="center">
                <AccountCircleRoundedIcon color="primary" />
                <Box>
                  <Typography className="ms-stat-label">Current User</Typography>
                  <Typography className="ms-stat-value">{auth?.username || "N/A"}</Typography>
                </Box>
              </Stack>
            </Box>
            <Box className="ms-stat-card">
              <Stack direction="row" spacing={1.2} alignItems="center">
                <VerifiedUserRoundedIcon color="success" />
                <Box>
                  <Typography className="ms-stat-label">Role</Typography>
                  <Typography className="ms-stat-value">{currentRole}</Typography>
                </Box>
              </Stack>
            </Box>
            <Box className="ms-stat-card">
              <Stack direction="row" spacing={1.2} alignItems="center">
                <ViewModuleRoundedIcon color="secondary" />
                <Box>
                  <Typography className="ms-stat-label">Modules</Typography>
                  <Typography className="ms-stat-value">{coreNavItems.length}</Typography>
                </Box>
              </Stack>
            </Box>
            <Box className="ms-stat-card">
              <Stack direction="row" spacing={1.2} alignItems="center">
                <FactCheckRoundedIcon color="warning" />
                <Box>
                  <Typography className="ms-stat-label">Active Module</Typography>
                  <Typography className="ms-stat-value">{pageTitle}</Typography>
                </Box>
              </Stack>
            </Box>
          </Box>

          {renderContent()}
        </Container>
      </Box>
    </Box>
  );
}
