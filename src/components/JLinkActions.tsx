import { useState, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Stack,
  Paper,
  LinearProgress,
} from "@mui/material";
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
  const [busy, setBusy] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

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
    if (busy) return;
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      appendToOutput(`<span style="color: #f97583">Error: ${msg}</span>`);
    } finally {
      setBusy(false);
    }
  }, [busy, device, appendToOutput, invokeJLinkCommand, connectionParams]);

  const handleProgram = useCallback(async () => {
    if (busy) return;
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      appendToOutput(`<span style="color: #f97583">Error: ${msg}</span>`);
    } finally {
      setBusy(false);
    }
  }, [busy, device, firmwarePath, appendToOutput, invokeJLinkCommand, connectionParams]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Action Buttons */}
      <Box sx={{ flexShrink: 0, mb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ ml: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleErase}
            disabled={!device}
            sx={{
              fontSize: "0.8rem",
              textTransform: "none",
              backgroundColor: "#b05555",
              "&:hover": { backgroundColor: "#c46666" },
              "&.Mui-disabled": { backgroundColor: "#2e2222" },
              boxShadow: "none",
              opacity: busy ? 0.6 : 1,
              "&:focus, &.Mui-focusVisible": {
                outline: "2px solid #ff7b72",
                outlineOffset: "2px",
              },
            }}
          >
            Erase
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleProgram}
            disabled={!device || !firmwarePath}
            sx={{
              fontSize: "0.8rem",
              textTransform: "none",
              backgroundColor: "#3f9150",
              "&:hover": { backgroundColor: "#4fa761" },
              "&.Mui-disabled": { backgroundColor: "#222e25" },
              opacity: busy ? 0.6 : 1,
              "&:focus, &.Mui-focusVisible": {
                outline: "2px solid #7ee787",
                outlineOffset: "2px",
              },
            }}
          >
            Program
          </Button>
        </Stack>

        {/* Progress bar */}
        {busy && <LinearProgress sx={{ height: 2, mt: 1 }} />}
      </Box>

      {/* Output */}
      <Paper
        variant="outlined"
        sx={{
          backgroundColor: "#2b2b2b",
          borderColor: "#1a1a1a",
          borderWidth: "10px",
          borderRadius: 2,
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Box
          ref={outputRef}
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 1,
            minHeight: 0,
            "& > div": {
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              fontSize: "12px",
              lineHeight: 1.5,
              padding: "1px 0",
            },
          }}
        />
      </Paper>
    </Box>
  );
}