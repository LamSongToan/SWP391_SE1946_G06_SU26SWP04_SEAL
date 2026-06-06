import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { label: "About", href: "/#about" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Events", href: "/#events" },
  { label: "Contact", href: "/#contact" },
];

export default function PublicShell({ children }) {
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const isRegister = location.pathname === "/register";
  const isAuthPage = ["/login", "/register", "/forgot-password", "/verify-reset-otp", "/reset-password"].includes(location.pathname);

  return (
    <Box className={`ms-public-shell${isAuthPage ? " is-auth" : ""}`}>
      <AppBar color="inherit" position="sticky" className="ms-public-topbar" elevation={0}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: 74, gap: 2 }}>
            <Typography
              color="primary.main"
              component={RouterLink}
              sx={{
                fontSize: 28,
                fontWeight: 800,
                textDecoration: "none",
                letterSpacing: 0,
                lineHeight: 1,
              }}
              to="/"
            >
              SEAL
            </Typography>

            <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
              <Box className="ms-public-nav" sx={{ display: { xs: "none", md: "flex" } }}>
                {NAV_ITEMS.map((item) => (
                  <Button
                    key={item.label}
                    component="a"
                    href={item.href}
                    className="ms-public-navbtn"
                    color="inherit"
                    size="small"
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                color="primary"
                component={RouterLink}
                to="/login"
                variant={isLogin ? "contained" : "text"}
              >
                Sign In
              </Button>
              <Button
                color="primary"
                component={RouterLink}
                to="/register"
                variant={isRegister ? "contained" : "outlined"}
              >
                Register Now
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {children}

      {!isAuthPage ? (
      <Box component="footer" sx={{ mt: 6, pt: 1 }}>
        <Container maxWidth="xl">
          <Divider sx={{ mb: 2 }} />
          <Stack
            alignItems={{ xs: "flex-start", md: "center" }}
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            spacing={1}
            sx={{ pb: 3 }}
          >
            <Typography color="text.secondary" variant="body2">
              SEAL - Software Engineering Agile League | FPT University HCMC
            </Typography>
            <Stack direction="row" spacing={2.5}>
              <Typography
                component="a"
                href="mailto:seal@fpt.edu.vn"
                sx={{ color: "text.secondary", textDecoration: "none" }}
                variant="body2"
              >
                seal@fpt.edu.vn
              </Typography>
              <Typography
                component="a"
                href="/#contact"
                sx={{ color: "text.secondary", textDecoration: "none" }}
                variant="body2"
              >
                Contact
              </Typography>
              <Typography
                component="a"
                href="/#about"
                sx={{ color: "text.secondary", textDecoration: "none" }}
                variant="body2"
              >
                About
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
      ) : null}
    </Box>
  );
}
