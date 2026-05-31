import { useEffect, useMemo, useState } from "react";
import {
  Alert, AppBar, Box, Button, Card, CardContent,
  Chip, Container, Drawer, List, ListItemButton,
  ListItemText, Stack, Toolbar, Typography,
} from "@mui/material";
import { authStorage, http, logout } from "../api/http";
import AccountApprovalPanel from "../components/coordinator/AccountApprovalPanel";
import ChangePasswordPage from "./ChangePasswordPage";

const DRAWER_WIDTH = 280;

const STUDENT_NAV = ["Profile", "My Teams", "Submissions", "Change Password"];
const COORDINATOR_NAV = ["User Management", "Permission Management", "System Logs", "Change Password"];

export default function DashboardPage() {
  const auth = authStorage.get();
  const currentRole = auth?.roles?.includes("COORDINATOR") ? "COORDINATOR" : "STUDENT";
  const [activeNav, setActiveNav] = useState(0);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");

  const navItems = useMemo(
    () => (currentRole === "COORDINATOR" ? COORDINATOR_NAV : STUDENT_NAV),
    [currentRole]
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await http.get("/api/demo/me");
        setProfile(response.data?.data);
      } catch {
        setProfile(null);
      }
    };
    fetchProfile();
  }, []);

  const callStudentEndpoint = async () => {
    try {
      const response = await http.get("/api/demo/student");
      setMessage(response.data?.data);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Request failed");
    }
  };

  const callCoordinatorEndpoint = async () => {
    try {
      const response = await http.get("/api/demo/coordinator");
      setMessage(response.data?.data);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Request failed");
    }
  };

  const renderContent = () => {
    // Change Password — last nav item for both roles
    if (activeNav === navItems.length - 1) {
      return <ChangePasswordPage />;
    }
    // Coordinator: User Management (index 0)
    if (currentRole === "COORDINATOR" && activeNav === 0) {
      return <AccountApprovalPanel />;
    }
    // Default — profile/demo canvas
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Session Info</Typography>
          <Typography color="text.secondary">Logged in as: {auth?.email}</Typography>
          <Typography color="text.secondary">Username: {auth?.username || "N/A"}</Typography>
          <Typography color="text.secondary">Roles: {auth?.roles?.join(", ") || "N/A"}</Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ my: 2 }}>
            <Button onClick={callStudentEndpoint} variant="outlined">Call Student API</Button>
            <Button onClick={callCoordinatorEndpoint} variant="contained">Call Coordinator API</Button>
          </Stack>

          {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}

          <Typography variant="h6" sx={{ mb: 1 }}>Profile Response</Typography>
          <Box
            component="pre"
            sx={{
              bgcolor: "#f6f8fb",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              m: 0,
              overflow: "auto",
              p: 2,
            }}
          >
            {profile ? JSON.stringify(profile, null, 2) : "No profile loaded."}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer
        PaperProps={{ sx: { borderRight: "1px solid #e2e8f0", width: DRAWER_WIDTH } }}
        sx={{ display: { xs: "none", lg: "block" }, width: DRAWER_WIDTH }}
        variant="permanent"
      >
        <Toolbar />
        <Box sx={{ p: 2 }}>
          <Typography color="primary.main" sx={{ fontWeight: 800, mb: 0.4 }} variant="h6">
            {currentRole === "COORDINATOR" ? "SEAL Admin" : "SEAL Participant"}
          </Typography>
          <Typography color="text.secondary" variant="body2">Hackathon Management</Typography>
        </Box>
        <List sx={{ px: 1 }}>
          {navItems.map((item, idx) => (
            <ListItemButton
              key={item}
              selected={idx === activeNav}
              onClick={() => setActiveNav(idx)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemText primary={item} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ mt: "auto", p: 2 }}>
          <Button fullWidth onClick={logout} variant="outlined">Logout</Button>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar color="inherit" position="sticky">
          <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
            <Toolbar disableGutters sx={{ justifyContent: "space-between", minHeight: 70 }}>
              <Box>
                <Typography color="primary.main" sx={{ fontWeight: 800 }} variant="h5">
                  SEAL Dashboard
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {navItems[activeNav]}
                </Typography>
              </Box>
              <Stack alignItems="center" direction="row" spacing={1}>
                <Chip color="primary" label={auth?.username || "N/A"} variant="outlined" />
                <Chip color="secondary" label={auth?.roles?.join(", ") || "N/A"} variant="outlined" />
              </Stack>
            </Toolbar>
          </Container>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 3 }}>
          {renderContent()}
        </Container>
      </Box>
    </Box>
  );
}