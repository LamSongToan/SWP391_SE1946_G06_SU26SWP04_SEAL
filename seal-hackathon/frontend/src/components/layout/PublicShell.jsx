import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { label: "About SEAL", href: "/#about" },
  { label: "Upcoming Events", href: "/#upcoming" },
  { label: "How It Works", href: "/#flow" },
  { label: "Impact", href: "/#impact" },
  { label: "Contact", href: "/#contact" },
];

export default function PublicShell({ children }) {
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const isRegister = location.pathname === "/register";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar color="inherit" position="sticky">
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: 70 }}>
            <Stack alignItems="center" direction="row" spacing={2} sx={{ flexGrow: 1 }}>
              <Typography
                color="primary.main"
                component={RouterLink}
                sx={{ fontSize: 26, fontWeight: 800, textDecoration: "none" }}
                to="/"
              >
                SEAL
              </Typography>
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ display: { xs: "none", md: "flex" }, ml: 1 }}
              >
                {NAV_ITEMS.map((item) => (
                  <Button
                    color="inherit"
                    component="a"
                    href={item.href}
                    key={item.label}
                    sx={{ color: "text.secondary", fontWeight: 600 }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                color={isLogin ? "primary" : "inherit"}
                component={RouterLink}
                to="/login"
                variant={isLogin ? "contained" : "text"}
              >
                Login
              </Button>
              <Button
                color="primary"
                component={RouterLink}
                to="/register"
                variant={isRegister ? "contained" : "outlined"}
              >
                Register
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {children}

      <Box
        component="footer"
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          mt: 6,
        }}
      >
        <Container maxWidth="xl" sx={{ py: 2.5 }}>
          <Stack
            alignItems={{ xs: "flex-start", md: "center" }}
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Typography color="text.secondary" variant="body2">
              SEAL - Software Engineering Agile League | FPT University HCMC
            </Typography>
            <Stack direction="row" spacing={2}>
              <Typography component="a" href="mailto:seal@fpt.edu.vn" sx={{ color: "text.secondary", textDecoration: "none" }} variant="body2">
                seal@fpt.edu.vn
              </Typography>
              <Typography component="a" href="/#about" sx={{ color: "text.secondary", textDecoration: "none" }} variant="body2">
                About
              </Typography>
              <Typography component="a" href="/#upcoming" sx={{ color: "text.secondary", textDecoration: "none" }} variant="body2">
                Events
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
