import { useState } from "react";
import "./App.css";
import FirmwareSelector, { FirmwareFile } from "./components/FirmwareSelector";

// Demo firmware files
const DEMO_FIRMWARE_FILES = [
  "di4la-3-1_12-1_x-gd32f330k8u6.hex",
  "di4la-3-1_11-2_x-gd32f330k8u6.hex",
  "di4la-2-2_0-1_x-gd32f330k8u6.hex",
  "dila-4-1_12-1_x-gd32f330c8t6.hex",
  "di4la-4-1_11-2_x-gd32f330c8t6.hex",
  "stlink-1-1_5-1_x-stm32f103c8.hex",
  "stlink-1-1_5-1_x-stm32f103c8t6.hex",
  "stlink-1-1_5-1_x-stm32f103c8t6.hex",
  "stlink-1-1_5-3_x-stm32f103c8t6.hex",
  "stlink-1-1_4-2_x-stm32f103c8t6.hex",
];

function App() {
  const [selectedFirmware, setSelectedFirmware] = useState<FirmwareFile | null>(null);

  return (
    <main className="container">
      <FirmwareSelector
        firmwareFiles={DEMO_FIRMWARE_FILES}
        onSelectionChange={(firmware) => setSelectedFirmware(firmware)}
      />
    </main>
  );
}

export default App;
