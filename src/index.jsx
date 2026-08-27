import React from "react";
import { createRoot } from "react-dom/client";
import { installMobileStorageBridge } from "./storage-bridge.js";
import { installMobileNativeBridge } from "./native-bridge.js";
import TopListBizLedger from "./TopListERP.jsx";

// Both bridges must exist before TopListBizLedger mounts and makes its
// first window.storage.get() call — installing them is synchronous.
installMobileStorageBridge();
installMobileNativeBridge();

const root = createRoot(document.getElementById("root"));
root.render(<TopListBizLedger />);
