import { useState, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Paper,
  IconButton,
  LinearProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface ConnectionParams {
  connection_type: string;
  device: string;
  ip: string | null;
  remote_id: string | null;
}

interface JLinkResult {
  stdout: string;
  stderr: string;
  code: number;
}

interface JLinkOutputEvent {
  stream: string;
  text: string;
}

interface JLinkActionsProps {
  /** Connection parameters (managed by parent) */
  connectionParams: ConnectionParams;
  /** Path to firmware hex file */
  firmwarePath?: string | null;
}

async function listenForOutput(
  onOutput: (text: string) => void
): Promise<() => void> {
  const unlisten = await listen<JLinkOutputEvent>("jlink-output", (event) => {
    if (event.payload && event.payload.text) {
      onOutput(event.payload.text);
    }
  });
  return unlisten;
}

export default function JLinkActions({
  connectionParams,
  firmwarePath,
}: JLinkActionsProps) {
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const device = connectionParams.device;

  const appendToOutput = useCallback((text: string) => {
    if (outputRef.current) {
      const timestamp = new Date().toLocaleTimeString();
      const colored = text
        .replace(/Error/g, '<b style="color: #f97583">Error</b>')
        .replace(/FAILED/g, '<b style="color: #f97583">FAILED</b>')
        .replace(/Cannot connect to target/g, '<b style="color: #f97583">Cannot connect to target</b>')
        .replace(/Successfully/g, '<b style="color: #7ee787">Successfully</b>')
        .replace(/O\.K\./g, '<b style="color: #7ee787">O.K.</b>')
        .replace(/Erasing done\./g, '<b style="color: #7ee787">Erasing done.</b>');

      const line = document.createElement("div");
      line.style.cssText = "font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; line-height: 1.5; padding: 1px 0;";
      line.innerHTML = `<span style="color: #8b949e">[${timestamp}]</span> ${colored}`;
      outputRef.current.appendChild(line);
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, []);

  const invokeJLinkCommand = useCallback(
    async (command: string, params: Record<string, unknown> = {}) => {
      const unlisten = await listenForOutput(appendToOutput);
      try {
        const result = await invoke<JLinkResult>(command, params);
        return result;
      } finally {
        unlisten();
      }
    },
    [appendToOutput]
  );

  const handleErase = useCallback(async () => {
    if (!device) {
      appendToOutput('<span style="color: #f97583">Error: No device selected</span>');
      return;
    }
    setBusy(true);
    appendToOutput(`Erasing ${device}...`);
    try {
      const result = await invokeJLinkCommand("jlink_erase_all", {
        connectionParams,
      });
      appendToOutput(`Erase finished with code ${result.code}`);
      setStatus("Erase completed");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      appendToOutput(`<span style="color: #f97583">Error: ${msg}</span>`);
      setStatus("Erase failed");
    } finally {
      setBusy(false);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setStatus(""), 3000);
    }
  }, [device, appendToOutput, invokeJLinkCommand, connectionParams]);

  const handleProgram = useCallback(async () => {
    if (!device) {
      appendToOutput('<span style="color: #f97583">Error: No device selected</span>');
      return;
    }
    if (!firmwarePath) {
      appendToOutput('<span style="color: #f97583">Error: No firmware file selected</span>');
      return;
    }
    setBusy(true);
    const fileName = firmwarePath.split(/[\\/]/).pop() || firmwarePath;
    appendToOutput(`Flashing ${device} with ${fileName}...`);
    try {
      const result = await invokeJLinkCommand("jlink_program", {
        firmwarePath,
        connectionParams,
      });
      appendToOutput(`Flash finished with code ${result.code}`);
      setStatus("Program completed");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      appendToOutput(`<span style="color: #f97583">Error: ${msg}</span>`);
      setStatus("Program failed");
    } finally {
      setBusy(false);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setStatus(""), 3000);
    }
  }, [device, firmwarePath, appendToOutput, invokeJLinkCommand, connectionParams]);

  const handleClearOutput = useCallback(() => {
    if (outputRef.current) {
      outputRef.current.innerHTML = "";
    }
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Stack spacing={2} direction="column" sx={{ width: "100%", flexShrink: 0 }}>
        {/* Action Buttons */}
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={handleErase}
            disabled={busy || !device}
            sx={{
              fontSize: "0.8rem",
              textTransform: "none",
              backgroundColor: "#da3633",
              "&:hover": { backgroundColor: "#b62324" },
              "&.Mui-disabled": { backgroundColor: "#3d1f1f" },
            }}
          >
            Erase
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<PlayArrowIcon />}
            onClick={handleProgram}
            disabled={busy || !device || !firmwarePath}
            sx={{
              fontSize: "0.8rem",
              textTransform: "none",
              backgroundColor: "#238636",
              "&:hover": { backgroundColor: "#2ea043" },
              "&.Mui-disabled": { backgroundColor: "#1a3a1a" },
            }}
          >
            Program
          </Button>
        </Stack>

        {/* Progress bar */}
        {busy && <LinearProgress sx={{ height: 2 }} />}

        {/* Status */}
        {status && (
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: status.includes("fail") ? "#f97583" : "#7ee787",
            }}
          >
            {status}
          </Typography>
        )}

        {/* Output */}
        <Paper
          variant="outlined"
          sx={{
            backgroundColor: "#0d1117",
            borderColor: "#30363d",
            borderRadius: 1,
            position: "relative",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: 1,
              py: 0.5,
              borderBottom: "1px solid #30363d",
            }}
          >
            <IconButton size="small" onClick={handleClearOutput} sx={{ color: "#8b949e", p: 0.3 }}>
              <Typography sx={{ fontSize: "0.7rem" }}>clear</Typography>
            </IconButton>
          </Box>
          <Box
            ref={outputRef}
            sx={{
              height: 200,
              overflowY: "auto",
              p: 1,
              "& > div": {
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                fontSize: "12px",
                lineHeight: 1.5,
                padding: "1px 0",
              },
            }}
          />
        </Paper>
      </Stack>
    </Box>
  );
}