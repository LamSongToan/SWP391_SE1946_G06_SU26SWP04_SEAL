import { useEffect, useMemo, useRef, useState } from "react";
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
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import DomainVerificationRoundedIcon from "@mui/icons-material/DomainVerificationRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import PermIdentityRoundedIcon from "@mui/icons-material/PermIdentityRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { authStorage, http, logout, resolveAssetUrl } from "../api/http";
import { useSearchParams } from "react-router-dom";
import AccountApprovalPanel from "../components/coordinator/AccountApprovalPanel";
import EventConfigurationPanel from "../components/coordinator/EventConfigurationPanel";
import UserProfilePanel from "../components/profile/UserProfilePanel";
import UserDirectoryPanel from "../components/user/UserDirectoryPanel";
import ChangePasswordPage from "./ChangePasswordPage";
import TeamManagementPanel from "../components/team/TeamManagementPanel";

const DRAWER_WIDTH = 292;

const STUDENT_CORE_NAV = [
  { key: "teams", label: "My Teams", icon: <GroupsRoundedIcon fontSize="small" /> },
  { key: "submissions", label: "Submissions", icon: <UploadFileRoundedIcon fontSize="small" /> },
];

const COORDINATOR_CORE_NAV = [
  { key: "users", label: "User Management", icon: <ManageAccountsRoundedIcon fontSize="small" /> },
  { key: "event-config", label: "Event Configuration", icon: <EventRoundedIcon fontSize="small" /> },
];

const ACCOUNT_NAV = [
  { key: "directory", label: "User Directory", icon: <SearchRoundedIcon fontSize="small" /> },
  { key: "account", label: "Profile", icon: <PermIdentityRoundedIcon fontSize="small" /> },
  { key: "password", label: "Change Password", icon: <LockRoundedIcon fontSize="small" /> },
];

const EVENT_DRAFT_STORAGE_PREFIX = "seal-event-config-draft:";
const PROFILE_DRAFT_STORAGE_KEY = "seal-profile-draft";

function getEventDraftStorageKey(eventId) {
  return `${EVENT_DRAFT_STORAGE_PREFIX}${eventId}`;
}

export default function DashboardPage() {
  const auth = authStorage.get();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentRole = useMemo(() => {
    const roles = auth?.roles || [];
    if (roles.includes("COORDINATOR")) return "COORDINATOR";
    if (roles.includes("MENTOR")) return "MENTOR";
    if (roles.includes("JUDGE")) return "JUDGE";
    if (roles.includes("STUDENT")) return "STUDENT";
    return roles[0] || "USER";
  }, [auth?.roles]);
  const [profileSummary, setProfileSummary] = useState(null);

  const [activeKey, setActiveKey] = useState("account");
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState(searchParams.get("query") || "");
  const [hasUnsavedEventChanges, setHasUnsavedEventChanges] = useState(false);
  const [hasUnsavedProfileChanges, setHasUnsavedProfileChanges] = useState(false);
  const lastApprovedSearchRef = useRef(searchParams.toString());
  const skipNextSearchGuardRef = useRef(false);

  const coreNavItems = useMemo(
    () => {
      if (currentRole === "COORDINATOR") return COORDINATOR_CORE_NAV;
      if (currentRole === "STUDENT") return STUDENT_CORE_NAV;
      return [];
    },
    [currentRole]
  );
  const allowedNavKeys = useMemo(
    () => new Set([...coreNavItems, ...ACCOUNT_NAV].map((item) => item.key)),
    [coreNavItems]
  );
  const sectionParam = searchParams.get("section");
  const queryParam = searchParams.get("query") || "";
  const normalizedSectionParam = useMemo(() => {
    if (["events", "tracks", "rounds"].includes(sectionParam)) {
      return "event-config";
    }
    return sectionParam;
  }, [sectionParam]);

  const pageTitle = useMemo(() => {
    const allItems = [...coreNavItems, ...ACCOUNT_NAV];
    return allItems.find((item) => item.key === activeKey)?.label || "Dashboard";
  }, [coreNavItems, activeKey]);

  const getUnsavedPromptForSearch = (searchString) => {
    const params = new URLSearchParams(searchString);
    const section = params.get("section") || "account";
    if (section === "event-config" && hasUnsavedEventChanges) {
      return "You have unsaved event changes. Leave this page without saving?";
    }
    if (section === "account" && hasUnsavedProfileChanges) {
      return "You have unsaved profile changes. Leave this page without saving?";
    }
    return "";
  };

  const clearDraftForSearch = (searchString) => {
    const params = new URLSearchParams(searchString);
    const section = params.get("section") || "account";
    if (section === "event-config") {
      const eventId = params.get("eventId");
      if (eventId) {
        sessionStorage.removeItem(getEventDraftStorageKey(eventId));
        window.dispatchEvent(new CustomEvent("seal-discard-event-draft", { detail: { eventId } }));
      }
      return;
    }
    if (section === "account") {
      sessionStorage.removeItem(PROFILE_DRAFT_STORAGE_KEY);
      window.dispatchEvent(new Event("seal-discard-profile-draft"));
    }
  };

  const confirmLeaveCurrentView = () => {
    const promptMessage = getUnsavedPromptForSearch(searchParams.toString());
    if (!promptMessage) return true;
    const discard = window.confirm(promptMessage);
    if (discard) {
      clearDraftForSearch(searchParams.toString());
    }
    return discard;
  };

  useEffect(() => {
    const nextKey = normalizedSectionParam && allowedNavKeys.has(normalizedSectionParam) ? normalizedSectionParam : "account";
    if (activeKey !== nextKey) {
      setActiveKey(nextKey);
    }
    if (normalizedSectionParam !== nextKey || sectionParam !== normalizedSectionParam) {
      const nextParams = { section: nextKey };
      if (nextKey === "directory" && queryParam.trim()) {
        nextParams.query = queryParam.trim();
      }
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeKey, allowedNavKeys, normalizedSectionParam, queryParam, sectionParam, setSearchParams]);

  useEffect(() => {
    const currentSearch = searchParams.toString();
    const previousSearch = lastApprovedSearchRef.current;

    if (skipNextSearchGuardRef.current) {
      skipNextSearchGuardRef.current = false;
      lastApprovedSearchRef.current = currentSearch;
      return;
    }

    if (currentSearch === previousSearch) {
      return;
    }

    const promptMessage = getUnsavedPromptForSearch(previousSearch);
    if (promptMessage) {
      const discard = window.confirm(promptMessage);
      if (!discard) {
        skipNextSearchGuardRef.current = true;
        setSearchParams(previousSearch, { replace: true });
        return;
      }
      clearDraftForSearch(previousSearch);
    }

    lastApprovedSearchRef.current = currentSearch;
  }, [hasUnsavedEventChanges, hasUnsavedProfileChanges, searchParams, setSearchParams]);

  useEffect(() => {
    setGlobalSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const markSkipGuard = () => {
      skipNextSearchGuardRef.current = true;
    };

    window.addEventListener("seal-skip-next-search-guard", markSkipGuard);
    return () => {
      window.removeEventListener("seal-skip-next-search-guard", markSkipGuard);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfileSummary = async () => {
      try {
        const response = await http.get("/api/users/me");
        if (mounted) {
          setProfileSummary(response.data?.data || null);
        }
      } catch {
        if (mounted) {
          setProfileSummary(null);
        }
      }
    };

    const handleProfileUpdated = (event) => {
      setProfileSummary(event.detail || null);
    };

    loadProfileSummary();
    window.addEventListener("seal-profile-updated", handleProfileUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("seal-profile-updated", handleProfileUpdated);
    };
  }, []);

  const placeholderCard = (title, description) => (
    <Card className="ms-data-card">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
        <Typography color="text.secondary">{description}</Typography>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    if (activeKey === "directory") return <UserDirectoryPanel currentRole={currentRole} initialQuery={queryParam} />;
    if (activeKey === "account") return <UserProfilePanel onDirtyChange={setHasUnsavedProfileChanges} />;
    if (activeKey === "password") return <ChangePasswordPage />;

    if (currentRole === "COORDINATOR") {
      if (activeKey === "users") return <AccountApprovalPanel />;
      if (activeKey === "event-config") return <EventConfigurationPanel onDirtyChange={setHasUnsavedEventChanges} />;
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

  const jumpToSection = (key) => {
    if (!confirmLeaveCurrentView()) return;
    const nextParams = { section: key };
    if (key === "directory" && queryParam.trim()) {
      nextParams.query = queryParam.trim();
    }
    skipNextSearchGuardRef.current = true;
    setSearchParams(nextParams);
    closeProfileMenu();
    setMobileOpen(false);
  };

  const submitGlobalSearch = (event) => {
    event.preventDefault();
    const nextParams = { section: "directory" };
    if (globalSearch.trim()) {
      nextParams.query = globalSearch.trim();
    }
    if (!confirmLeaveCurrentView()) return;
    skipNextSearchGuardRef.current = true;
    setSearchParams(nextParams);
    setMobileOpen(false);
  };

  const runLogout = () => {
    closeProfileMenu();
    logout();
  };

  const onSelectNav = (key) => {
    jumpToSection(key);
  };

  const goToProfileHome = () => {
    if (!confirmLeaveCurrentView()) return;
    skipNextSearchGuardRef.current = true;
    setSearchParams({ section: "account" });
    closeProfileMenu();
    setMobileOpen(false);
  };

  const sidePanel = (
    <Box className="ms-sidebar-inner">
      <Box className="ms-sidebar-spacer" />

      <Box
        className="ms-brand"
        onClick={goToProfileHome}
        sx={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
      >
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
        <MenuItem onClick={() => jumpToSection("account")}>
          <ListItemIcon><PermIdentityRoundedIcon fontSize="small" /></ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => jumpToSection("password")}>
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
                <Box
                  component="form"
                  onSubmit={submitGlobalSearch}
                  sx={{ display: { xs: "none", md: "block" }, width: { md: 260, lg: 320 } }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    placeholder="Search users, teams, events..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon sx={{ color: "#64748b", fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      sx: {
                        height: 40,
                        borderRadius: 999,
                        backgroundColor: "#fff",
                      },
                    }}
                  />
                </Box>
                <Chip className="ms-chip" size="small" icon={<TuneRoundedIcon />} label={`Role: ${currentRole}`} variant="outlined" />
                <Chip className="ms-chip" size="small" label={`${coreNavItems.length} modules`} variant="outlined" />
                <Button
                  onClick={openProfileMenu}
                  sx={{
                    minWidth: 0,
                    maxWidth: { xs: 46, sm: 220 },
                    height: 44,
                    px: { xs: 0.75, sm: 1.1 },
                    py: 0.5,
                    gap: 0.9,
                    borderRadius: 999,
                    textTransform: "none",
                    color: "text.primary",
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.paper",
                    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                    "&:hover": {
                      backgroundColor: "#f8fafc",
                      borderColor: "#d7deea",
                    },
                  }}
                >
                  <Avatar
                    src={resolveAssetUrl(profileSummary?.avatarUrl) || undefined}
                    sx={{ width: 30, height: 30, bgcolor: "#0f172a" }}
                  >
                    {(auth?.username || "U").slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0, flex: 1, textAlign: "left" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {profileSummary?.fullName || auth?.username || "Unknown"}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      @{profileSummary?.username || auth?.username || ""}
                    </Typography>
                  </Box>
                  <ExpandMoreRoundedIcon sx={{ color: "#64748b", fontSize: 18, display: { xs: "none", sm: "block" } }} />
                </Button>
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

          {renderContent()}
        </Container>
      </Box>
    </Box>
  );
}
