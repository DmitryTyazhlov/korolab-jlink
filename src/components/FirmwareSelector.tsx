import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  SelectChangeEvent,
  Stack,
} from "@mui/material";

// Format: di4la-3-1_12-1_x-gd32f330k8u6.hex
// Parts split by "-":
//   0: device name (di4la)
//   1: board version (3)
//   2: firmware version (1_12) -> displayed as 1.12
//   3: dfu version (1_x) -> displayed as 1.x
//   4: mcu name (gd32f330k8u6)

export interface FirmwareFile {
  filename: string;
  device: string;
  boardVersion: string;
  firmwareVersion: string;
  dfuVersion: string;
  mcu: string;
}

function parseFirmwareFilename(filename: string): FirmwareFile | null {
  const name = filename.replace(/\.hex$/i, "");
  const parts = name.split("-");
  if (parts.length !== 5) return null;
  return {
    filename,
    device: parts[0],
    boardVersion: parts[1],
    firmwareVersion: parts[2],
    dfuVersion: parts[3],
    mcu: parts[4],
  };
}

function displayVersion(raw: string): string {
  return raw.replace("_", ".");
}

interface FirmwareSelectorProps {
  firmwareFiles: string[];
  onSelectionChange?: (selected: FirmwareFile | null) => void;
}

export default function FirmwareSelector({
  firmwareFiles,
  onSelectionChange,
}: FirmwareSelectorProps) {
  const allFiles = useMemo(
    () =>
      firmwareFiles
        .map(parseFirmwareFilename)
        .filter((f): f is FirmwareFile => f !== null),
    [firmwareFiles]
  );

  // --- Options for each selector filtered by previous selections ---

  // Step 1: Device — always all unique devices
  const deviceOptions = useMemo(
    () => [...new Set(allFiles.map((f) => f.device))].sort(),
    [allFiles]
  );

  const [device, setDevice] = useState("");
  const [boardVersion, setBoardVersion] = useState("");
  const [mcu, setMcu] = useState("");
  const [firmwareVersion, setFirmwareVersion] = useState("");
  const [dfuVersion, setDfuVersion] = useState("");

  // Step 2: Board version — filtered by device
  const boardVersionOptions = useMemo(() => {
    let filtered = allFiles;
    if (device) filtered = filtered.filter((f) => f.device === device);
    return [...new Set(filtered.map((f) => f.boardVersion))].sort();
  }, [allFiles, device]);

  // Step 3: MCU — filtered by device + board version
  const mcuOptions = useMemo(() => {
    let filtered = allFiles;
    if (device) filtered = filtered.filter((f) => f.device === device);
    if (boardVersion)
      filtered = filtered.filter((f) => f.boardVersion === boardVersion);
    return [...new Set(filtered.map((f) => f.mcu))].sort();
  }, [allFiles, device, boardVersion]);

  // Step 4: Firmware version — filtered by device + board version + MCU
  const firmwareVersionOptions = useMemo(() => {
    let filtered = allFiles;
    if (device) filtered = filtered.filter((f) => f.device === device);
    if (boardVersion)
      filtered = filtered.filter((f) => f.boardVersion === boardVersion);
    if (mcu) filtered = filtered.filter((f) => f.mcu === mcu);
    return [...new Set(filtered.map((f) => f.firmwareVersion))].sort();
  }, [allFiles, device, boardVersion, mcu]);

  // Step 5: DFU version — filtered by all previous
  const dfuVersionOptions = useMemo(() => {
    let filtered = allFiles;
    if (device) filtered = filtered.filter((f) => f.device === device);
    if (boardVersion)
      filtered = filtered.filter((f) => f.boardVersion === boardVersion);
    if (mcu) filtered = filtered.filter((f) => f.mcu === mcu);
    if (firmwareVersion)
      filtered = filtered.filter(
        (f) => f.firmwareVersion === firmwareVersion
      );
    return [...new Set(filtered.map((f) => f.dfuVersion))].sort();
  }, [allFiles, device, boardVersion, mcu, firmwareVersion]);

  /** Parse firmware version "1_12" -> [1, 12] for comparison */
  function parseFirmwareVersion(raw: string): number[] {
    return raw.split("_").map((s) => parseInt(s, 10) || 0);
  }

  /** Compare two firmware version arrays: returns >0 if a > b, <0 if a < b, 0 if equal */
  function compareFirmwareVersion(a: number[], b: number[]): number {
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const av = a[i] ?? 0;
      const bv = b[i] ?? 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  /** For DFU: extract the first digit (before "_") for comparison */
  function dfuMajorVersion(raw: string): number {
    const major = raw.split("_")[0];
    return parseInt(major, 10) || 0;
  }

  // Auto-select when only one option is available and nothing is selected yet
  useEffect(() => {
    if (device && !boardVersion && boardVersionOptions.length === 1) {
      setBoardVersion(boardVersionOptions[0]);
    }
  }, [device, boardVersion, boardVersionOptions]);

  useEffect(() => {
    if (device && boardVersion && !mcu && mcuOptions.length === 1) {
      setMcu(mcuOptions[0]);
    }
  }, [device, boardVersion, mcu, mcuOptions]);

  // Firmware version: always auto-select the highest version
  useEffect(() => {
    if (device && boardVersion && mcu && !firmwareVersion && firmwareVersionOptions.length > 0) {
      const sorted = [...firmwareVersionOptions].sort((a, b) =>
        compareFirmwareVersion(parseFirmwareVersion(b), parseFirmwareVersion(a))
      );
      setFirmwareVersion(sorted[0]);
    }
  }, [device, boardVersion, mcu, firmwareVersion, firmwareVersionOptions]);

  // DFU version: always auto-select the highest by first digit
  useEffect(() => {
    if (device && boardVersion && mcu && firmwareVersion && !dfuVersion && dfuVersionOptions.length > 0) {
      const sorted = [...dfuVersionOptions].sort((a, b) => dfuMajorVersion(b) - dfuMajorVersion(a));
      setDfuVersion(sorted[0]);
    }
  }, [device, boardVersion, mcu, firmwareVersion, dfuVersion, dfuVersionOptions]);

  // Reset downstream selections when an earlier selector changes
  const handleChange = useCallback(
    (field: string) => (event: SelectChangeEvent<string>) => {
      const value = event.target.value;
      switch (field) {
        case "device":
          setDevice(value);
          setBoardVersion("");
          setMcu("");
          setFirmwareVersion("");
          setDfuVersion("");
          break;
        case "boardVersion":
          setBoardVersion(value);
          setMcu("");
          setFirmwareVersion("");
          setDfuVersion("");
          break;
        case "mcu":
          setMcu(value);
          setFirmwareVersion("");
          setDfuVersion("");
          break;
        case "firmwareVersion":
          setFirmwareVersion(value);
          setDfuVersion("");
          break;
        case "dfuVersion":
          setDfuVersion(value);
          break;
      }
    },
    []
  );

  // --- Find the matching file ---
  const selectedFile = useMemo(() => {
    if (!device || !boardVersion || !firmwareVersion || !dfuVersion || !mcu) {
      return null;
    }
    return (
      allFiles.find(
        (f) =>
          f.device === device &&
          f.boardVersion === boardVersion &&
          f.firmwareVersion === firmwareVersion &&
          f.dfuVersion === dfuVersion &&
          f.mcu === mcu
      ) ?? null
    );
  }, [allFiles, device, boardVersion, firmwareVersion, dfuVersion, mcu]);

  // Notify parent
  const prevSelectionRef = useRef<string | null>(null);
  useEffect(() => {
    const filename = selectedFile?.filename ?? null;
    if (filename !== prevSelectionRef.current) {
      prevSelectionRef.current = filename;
      onSelectionChange?.(selectedFile);
    }
  }, [selectedFile, onSelectionChange]);

  return (
    <Box sx={{ p: 1 }}>
      <Stack spacing={2} direction="column" sx={{ width: "100%" }}>
        {/* 1. Device */}
        <FormControl sx={{ width: "100%" }} size="small">
          <InputLabel id="device-label">Device</InputLabel>
          <Select
            labelId="device-label"
            value={device}
            label="Device"
            onChange={handleChange("device")}
          >
            {deviceOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 2. Board Version */}
        <FormControl sx={{ width: "100%" }} size="small" disabled={!device}>
          <InputLabel id="board-label">Board Version</InputLabel>
          <Select
            labelId="board-label"
            value={boardVersion}
            label="Board Version"
            onChange={handleChange("boardVersion")}
          >
            {boardVersionOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 3. MCU */}
        <FormControl
          sx={{ width: "100%" }}
          size="small"
          disabled={!device || !boardVersion}
        >
          <InputLabel id="mcu-label">MCU</InputLabel>
          <Select
            labelId="mcu-label"
            value={mcu}
            label="MCU"
            onChange={handleChange("mcu")}
          >
            {mcuOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 4. Firmware Version */}
        <FormControl
          sx={{ width: "100%" }}
          size="small"
          disabled={!device || !boardVersion || !mcu}
        >
          <InputLabel id="firmware-label">Firmware Version</InputLabel>
          <Select
            labelId="firmware-label"
            value={firmwareVersion}
            label="Firmware Version"
            onChange={handleChange("firmwareVersion")}
          >
            {firmwareVersionOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {displayVersion(opt)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 5. DFU Version */}
        <FormControl
          sx={{ width: "100%" }}
          size="small"
          disabled={!device || !boardVersion || !mcu || !firmwareVersion}
        >
          <InputLabel id="dfu-label">DFU Version</InputLabel>
          <Select
            labelId="dfu-label"
            value={dfuVersion}
            label="DFU Version"
            onChange={handleChange("dfuVersion")}
          >
            {dfuVersionOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {displayVersion(opt)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      {selectedFile && (
        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
          Selected: {selectedFile.filename}
        </Typography>
      )}
    </Box>
  );
}