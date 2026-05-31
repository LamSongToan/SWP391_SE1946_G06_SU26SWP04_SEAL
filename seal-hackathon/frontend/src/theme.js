import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1677ff",
      dark: "#0958d9",
      light: "#69b1ff",
    },
    secondary: {
      main: "#13c2c2",
      dark: "#08979c",
      light: "#5cdbd3",
    },
    success: { main: "#52c41a" },
    warning: { main: "#faad14" },
    error: { main: "#ff4d4f" },
    background: {
      default: "#eef2f6",
      paper: "#ffffff",
    },
    text: {
      primary: "#1d2638",
      secondary: "#637381",
    },
    divider: "#dfe6ef",
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Public Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, fontSize: "2.35rem", lineHeight: 1.14 },
    h2: { fontWeight: 700, fontSize: "1.9rem", lineHeight: 1.16 },
    h3: { fontWeight: 700, fontSize: "1.45rem", lineHeight: 1.22 },
    h4: { fontWeight: 700, lineHeight: 1.2 },
    h5: { fontWeight: 700, lineHeight: 1.24 },
    h6: { fontWeight: 700, lineHeight: 1.28 },
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
          background: "#eef2f6",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingInline: 16,
          fontWeight: 700,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #dfe6ef",
          boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
          borderRadius: 8,
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
          borderRadius: 8,
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
          border: "1px solid #dfe6ef",
          boxShadow: "0 12px 28px rgba(20, 36, 64, 0.14)",
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
