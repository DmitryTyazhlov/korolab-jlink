import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import App from "./App";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#1f1b1b",
      paper: "#1e1e1e",
    },
    primary: {
      main: "#90caf9",
    },
    secondary: {
      main: "#f48fb1",
    },
    text: {
      primary: "#e0e0e0",
      secondary: "#a0a0a0",
    },
  },
  components: {
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#b0b0b0",
          "&.Mui-focused": {
            color: "#90caf9",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: "#555",
        },
        root: {
          backgroundColor: "#2a2a2a",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#999",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#90caf9",
          },
          "&.Mui-disabled": {
            backgroundColor: "#1e1e1e",
          },
        },
        input: {
          color: "#e8e8e8",
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: "#b0b0b0",
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: "#2a2a2a",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: "rgba(144, 202, 249, 0.15)",
          },
          "&.Mui-selected:hover": {
            backgroundColor: "rgba(144, 202, 249, 0.25)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
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