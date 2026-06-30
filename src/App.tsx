import { useState, useMemo, useCallback } from "react";
import {
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Typography,
  TextField,
  IconButton,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import "./App.css";
import FirmwareSelector, { FirmwareFile } from "./components/FirmwareSelector";
import JLinkActions from "./components/JLinkActions";
import { invoke } from "@tauri-apps/api/core";

// Demo firmware files when no folder is selected
const DEMO_FIRMWARE_FILES = [""];

function App() {
  const [selectedFirmware, setSelectedFirmware] = useState<FirmwareFile | null>(null);
  const [connectionType, setConnectionType] = useState("usb");
  const [remoteId, setRemoteId] = useState("");
  const [firmwarePath, setFirmwarePath] = useState<string | null>(null);
  const [firmwareFiles, setFirmwareFiles] = useState<string[]>(DEMO_FIRMWARE_FILES);

  const mcuDevice = selectedFirmware?.mcu ?? undefined;

  // Build connectionParams for JLinkActions
  const connectionParams = useMemo(() => ({
    connection_type: connectionType,
    device: mcuDevice ?? "",
    ip: connectionType === "local" ? `192.168.88.88` : null,
    remote_id: connectionType === "remote" ? remoteId : null,
  }), [connectionType, mcuDevice, remoteId]);

  const handleSelectFolder = useCallback(async () => {
    try {
      const folder = await invoke<string | null>("select_firmware_folder");
      if (folder) {
        setFirmwarePath(folder);
        const files = await invoke<string[]>("list_hex_files", { path: folder });
        if (files.length > 0) {
          setFirmwareFiles(files);
        } else {
          setFirmwareFiles([]);
        }
      }
    } catch (e) {
      // ignored
    }
  }, []);

  // Build full firmware path when both folder and selected firmware are known
  const fullFirmwarePath = useMemo(() => {
    if (firmwarePath && selectedFirmware) {
      // Use platform-appropriate separator
      const separator = firmwarePath.endsWith("/") || firmwarePath.endsWith("\\") ? "" : "/";
      return `${firmwarePath}${separator}${selectedFirmware.filename}`;
    }
    return null;
  }, [firmwarePath, selectedFirmware]);

  return (
    <main className="container">
      {/* Settings button - top right */}
      <Box sx={{ position: "fixed", top: 12, right: 12, zIndex: 1000 }}>
        <IconButton
          onClick={handleSelectFolder}
          sx={{
            color: "#8b949e",
            backgroundColor: "rgba(255,255,255,0.04)",
            "&:hover": { color: "#e6edf3", backgroundColor: "rgba(255,255,255,0.1)" },
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Box>

      {/* Connection */}
      <Box sx={{ px: 1, pt: 1 }}>
        <FormControl>
          <FormLabel sx={{ fontSize: "0.8rem", color: "#9e9e9e" }}>
            Connection
          </FormLabel>
          <RadioGroup
            row
            value={connectionType}
            onChange={(e) => setConnectionType(e.target.value)}
          >
            <FormControlLabel
              value="usb"
              control={<Radio size="small" />}
              label={<Typography sx={{ fontSize: "0.8rem" }}>USB</Typography>}
            />
            <FormControlLabel
              value="local"
              control={<Radio size="small" />}
              label={<Typography sx={{ fontSize: "0.8rem" }}>RaspberryPi (192.168.88.88)</Typography>}
            />
          </RadioGroup>
        </FormControl>

        {/* Remote ID field */}
        {connectionType === "remote" && (
          <Box sx={{ ml: 1, mt: 0.5 }}>
            <TextField
              variant="standard"
              placeholder="Remote ID"
              value={remoteId}
              onChange={(e) => setRemoteId(e.target.value)}
              sx={{ width: 120 }}
              slotProps={{
                htmlInput: {
                  style: { fontSize: "0.85rem", padding: "2px 0" },
                },
              }}
            />
          </Box>
        )}
      </Box>

      <FirmwareSelector
        firmwareFiles={firmwareFiles}
        onSelectionChange={(firmware) => setSelectedFirmware(firmware)}
      />

      <JLinkActions
        connectionParams={connectionParams}
        firmwarePath={fullFirmwarePath}
      />
    </main>
  );
}

export default App;