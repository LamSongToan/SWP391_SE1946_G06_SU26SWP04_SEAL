import { createTheme } from "@mui/material/styles";
import { brand } from "./styles/designTokens";

const alertErrorBackground = "#FDEDEA";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: brand.colors.navy,
      dark: "#04101E",
      light: brand.colors.navyMuted,
    },
    secondary: {
      main: brand.colors.orange,
      dark: brand.colors.orangeDark,
      light: brand.colors.surfaceWarm,
    },
    info: { main: brand.colors.blue, light: "#EAF2FF" },
    success: { main: brand.colors.green, light: "#E8F8F1" },
    warning: { main: brand.colors.amber, light: "#FFF7D7" },
    error: { main: brand.colors.danger, light: "#FDEDEA" },
    background: {
      default: brand.colors.surfaceSoft,
      paper: brand.colors.surface,
    },
    text: {
      primary: brand.colors.text,
      secondary: brand.colors.muted,
    },
    divider: brand.colors.line,
  },
  shape: {
    borderRadius: brand.radius.md,
  },
  typography: {
    fontFamily: brand.font.primary,
    h1: { fontWeight: 800, fontSize: "2.6rem", lineHeight: 1.08 },
    h2: { fontWeight: 800, fontSize: "2rem", lineHeight: 1.16 },
    h3: { fontWeight: 800, fontSize: "1.5rem", lineHeight: 1.22 },
    h4: { fontWeight: 800, lineHeight: 1.2 },
    h5: { fontWeight: 800, lineHeight: 1.24 },
    h6: { fontWeight: 800, lineHeight: 1.28 },
    body1: { fontSize: "14px", color: brand.colors.muted },
    subtitle1: { fontWeight: 600 },
    button: {
      textTransform: "none",
      fontWeight: 700,
      letterSpacing: 0,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollBehavior: "smooth" },
        body: {
          background: brand.colors.surfaceSoft,
          fontFamily: brand.font.primary,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 16,
          fontWeight: 700,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${brand.colors.line}`,
          boxShadow: brand.shadow.sm,
          borderRadius: brand.radius.lg,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: brand.radius.md,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: 13,
          paddingBottom: 13,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          border: `1px solid ${brand.colors.line}`,
          boxShadow: brand.shadow.md,
          borderRadius: brand.radius.md,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardError: {
          color: brand.colors.danger,
          backgroundColor: alertErrorBackground,
          "& .MuiAlert-icon": {
            color: brand.colors.danger,
          },
          "& .MuiAlert-action": {
            color: brand.colors.danger,
          },
        },
        outlinedError: {
          color: brand.colors.danger,
          borderColor: brand.colors.danger,
          "& .MuiAlert-icon": {
            color: brand.colors.danger,
          },
          "& .MuiAlert-action": {
            color: brand.colors.danger,
          },
        },
        filledError: {
          color: brand.colors.danger,
          backgroundColor: alertErrorBackground,
          "& .MuiAlert-icon": {
            color: brand.colors.danger,
          },
          "& .MuiAlert-action": {
            color: brand.colors.danger,
          },
        },
      },
    },
  },
});

export default theme;
