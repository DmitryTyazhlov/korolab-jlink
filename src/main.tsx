import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import App from "./App";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#1a1a1a",
      paper: "#242424",
    },
    primary: {
      main: "#64b5f6",
      light: "#90caf9",
      dark: "#42a5f5",
    },
    text: {
      primary: "#e0e0e0",
      secondary: "#9e9e9e",
    },
    divider: "#404040",
    action: {
      hover: "rgba(100, 181, 246, 0.08)",
      selected: "rgba(100, 181, 246, 0.16)",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 13,
    fontWeightRegular: 500,
    fontWeightMedium: 600,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#404040 #242424",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-track": { background: "#242424" },
          "&::-webkit-scrollbar-thumb": { background: "#555", borderRadius: 3 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#9e9e9e",
          fontSize: "0.8rem",
          "&.Mui-focused": { color: "#64b5f6" },
          "&.MuiInputLabel-shrink": {
            transform: "translate(14px, -8px) scale(0.8)",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: "#404040",
          transition: "border-color 0.15s ease",
        },
        root: {
          backgroundColor: "#2d2d2d",
          borderRadius: "8px",
          transition: "box-shadow 0.15s ease",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#606060",
          },
          "&.Mui-focused": {
            boxShadow: "inset 0 0 0 1px #64b5f6",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#64b5f6",
              borderWidth: "1px",
            },
          },
          "&.Mui-disabled": {
            backgroundColor: "#1e1e1e",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#333",
              borderStyle: "dashed",
            },
            "& .MuiSelect-icon": {
              opacity: 0.2,
            },
            "& input, & .MuiSelect-select": {
              color: "#555",
            },
            "& .MuiInputLabel-root": {
              color: "#555 !important",
            },
          },
        },
        input: {
          color: "#e0e0e0",
          padding: "9px 12px",
          fontSize: "0.8125rem",
          fontWeight: 500,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: { padding: "9px 12px", fontSize: "0.8125rem" },
        icon: { color: "#9e9e9e", right: 8 },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: "#2a2a2a",
          borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          marginTop: 2,
        },
        list: { padding: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: "0.8125rem",
          minHeight: 32,
          "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
          "&.Mui-selected": {
            backgroundColor: "rgba(100, 181, 246, 0.12)",
            fontWeight: 500,
            "&:hover": { backgroundColor: "rgba(100, 181, 246, 0.18)" },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);