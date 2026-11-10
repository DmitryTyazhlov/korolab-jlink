import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Typography,
  TextField,
  Stack,
  IconButton,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import "./App.css";
import FirmwareSelector, { FirmwareFile } from "./components/FirmwareSelector";
import JLinkActions from "./components/JLinkActions";
import { invoke } from "@tauri-apps/api/core";

// Demo firmware files when no folder is selected
const DEMO_FIRMWARE_FILES = [""];

const FOLDER_STORAGE_KEY = "firmwareFolder";

function App() {
  const [selectedFirmware, setSelectedFirmware] = useState<FirmwareFile | null>(null);
  const [connectionType, setConnectionType] = useState("usb");
  const [ip3, setIp3] = useState("");
  const [ip4, setIp4] = useState("");
  const [remoteId, setRemoteId] = useState("");
  const [firmwarePath, setFirmwarePath] = useState<string | null>(null);
  const [firmwareFiles, setFirmwareFiles] = useState<string[]>(DEMO_FIRMWARE_FILES);

  const mcuDevice = selectedFirmware?.mcu ?? undefined;

  // Build connectionParams for JLinkActions
  const connectionParams = useMemo(() => ({
    connection_type: connectionType,
    device: mcuDevice ?? "",
    ip: connectionType === "local" ? `192.168.${ip3}.${ip4}` : null,
    remote_id: connectionType === "remote" ? remoteId : null,
  }), [connectionType, mcuDevice, ip3, ip4, remoteId]);

  const loadFolder = useCallback(async (folder: string) => {
    const files = await invoke<string[]>("list_hex_files", { path: folder });
    setFirmwarePath(folder);
    setFirmwareFiles(files);
  }, []);

  // Restore the last used folder on startup
  useEffect(() => {
    const saved = localStorage.getItem(FOLDER_STORAGE_KEY);
    if (saved) {
      loadFolder(saved).catch(() => {
        // folder no longer exists or is unreadable
        localStorage.removeItem(FOLDER_STORAGE_KEY);
      });
    }
  }, [loadFolder]);

  const handleSelectFolder = useCallback(async () => {
    try {
      const folder = await invoke<string | null>("select_firmware_folder");
      if (folder) {
        await loadFolder(folder);
        localStorage.setItem(FOLDER_STORAGE_KEY, folder);
      }
    } catch (e) {
      // ignored
    }
  }, [loadFolder]);

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
      <Box sx={{ px: 1, pt: 1, flexShrink: 0 }}>
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
              label={<Typography sx={{ fontSize: "0.8rem" }}>Local</Typography>}
            />
            <FormControlLabel
              value="remote"
              control={<Radio size="small" />}
              label={<Typography sx={{ fontSize: "0.8rem" }}>Remote</Typography>}
            />
          </RadioGroup>
        </FormControl>

        {/* Local IP fields */}
        {connectionType === "local" && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", ml: 1, mt: 0.5 }}>
            <Typography sx={{ fontSize: "0.8rem", color: "#9e9e9e" }}>
              192.168.
            </Typography>
            <TextField
              variant="standard"
              value={ip3}
              onChange={(e) =>
                setIp3(e.target.value.replace(/\D/g, "").slice(0, 3))
              }
              sx={{ width: 40 }}
              slotProps={{
                htmlInput: {
                  style: { fontSize: "0.85rem", textAlign: "center", padding: "2px 0" },
                  maxLength: 3,
                },
              }}
            />
            <Typography sx={{ fontSize: "0.8rem", color: "#9e9e9e" }}>
              .
            </Typography>
            <TextField
              variant="standard"
              value={ip4}
              onChange={(e) =>
                setIp4(e.target.value.replace(/\D/g, "").slice(0, 3))
              }
              sx={{ width: 40 }}
              slotProps={{
                htmlInput: {
                  style: { fontSize: "0.85rem", textAlign: "center", padding: "2px 0" },
                  maxLength: 3,
                },
              }}
            />
          </Stack>
        )}

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

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Box sx={{ flexShrink: 0 }}>
          <FirmwareSelector
            firmwareFiles={firmwareFiles}
            onSelectionChange={(firmware) => setSelectedFirmware(firmware)}
          />
        </Box>

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <JLinkActions
            connectionParams={connectionParams}
            firmwarePath={fullFirmwarePath}
          />
        </Box>
      </Box>
    </main>
  );
}

export default App;