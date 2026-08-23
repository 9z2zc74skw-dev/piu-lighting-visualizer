// Build the #1236 estimate in the app's Estimate format and POST it to the
// running local server so it's cached in the SQLite DB (data.db).
const est = {
  docNumber: "1236",
  customer: "Chief Chris Kelly",
  agency: "City of Johnson PD",
  state: "AR", // Johnson, Arkansas — runs Blue/White
  memo: "26 Ford PIU. Allegiant roof bar. Rumbler. Rear SignalMaster stick. Partition + cage.",
  total: 14819.09,
  lines: [
    { itemName: "MPS63U-RBW", description: "MPS63U-RBW (behind front grille)", qty: 2, amount: 258 },
    { itemName: "ALGT53JX-P3LB", description: "FedSig 53in MAX tri-color bar, TD floods, alley, amber directional", qty: 1, amount: 2460 },
    { itemName: "PF200", description: "PF200 Siren controller (included)", qty: 1, amount: 0 },
    { itemName: "ES100C", description: "ES100C Speaker/100 W (included)", qty: 1, amount: 0 },
    { itemName: "BRACKETS:ESBL-FPIU20", description: "ESBL-FPIU20 EC100 bracket (included)", qty: 1, amount: 0 },
    { itemName: "RBKIT1", description: "Rumbler", qty: 1, amount: 394 },
    { itemName: "BRACKETS:RBS-FPIU20", description: "RBC-FPIU20ND Rumbler bracket Ford PI", qty: 1, amount: 47.1 },
    { itemName: "LIGHTS:MPSW9-BW", description: "MicroPulse Wide Angle BW (mirror side lighting)", qty: 2, amount: 298 },
    { itemName: "BRACKETS:FPIU20MIR", description: "FPIU20MIR-FORD mirror mount", qty: 1, amount: 39 },
    { itemName: "XSM2-BRW-US", description: "XSM2-BRW-US (rear quarter glass)", qty: 2, amount: 371.84 },
    { itemName: "OBDFORD", description: "OBDFORD vehicle integration", qty: 1, amount: 135 },
    { itemName: "EXPMOD24", description: "EXPMOD24", qty: 1, amount: 225 },
    { itemName: "PFPDM-1", description: "PFPDM-1 Pathfinder power distribution module", qty: 1, amount: 355.29 },
    { itemName: "CABLES:EXPHARN03", description: "EXPHARN03 expansion harness Ford PI (rear blackout)", qty: 1, amount: 169.1 },
    { itemName: "PFSync-1", description: "Pathfinder Scene Sync module", qty: 1, amount: 196.21 },
    { itemName: "Non-inventory:425-6742", description: "IPBCC Max Depth Console (14in FP) 425-6742", qty: 1, amount: 676.8 },
    { itemName: "Jotto:425-6141", description: "425-6141 Jotto plate APX1500/4500/6500", qty: 1, amount: 45.52 },
    { itemName: "Jotto:425-6287", description: "425-6287 Jotto PF-200 plate", qty: 1, amount: 49.94 },
    { itemName: "425-6729", description: "ABS dual cup holder faceplate mount (4in)", qty: 1, amount: 51.41 },
    { itemName: "Jotto:425-3816", description: "425-3816 magnetic mic holder", qty: 2, amount: 68.4 },
    { itemName: "CM-SDMT-SL-LED", description: "Console side height-adjustable mount w/ slide arm", qty: 1, amount: 497.4 },
    { itemName: "Non-inventory:475-2407", description: "GR9 gun mount, GL3XL, AR/870 HK clasp", qty: 1, amount: 660 },
    { itemName: "Jotto:475-0063", description: "Jotto partition Ford PI, acrylic upper w/ slide", qty: 1, amount: 892.66 },
    { itemName: "Jotto:475-0923", description: "475-0923 Jotto bio seat Ford PI w/ rear cargo barrier", qty: 1, amount: 1520 },
    { itemName: "475-1486", description: "Secure-Grid window armor + door control covers", qty: 1, amount: 340.84 },
    { itemName: "Services", description: "Cargo Maxx rear storage system w/ ext + tape mounts", qty: 1, amount: 699 },
    { itemName: "LIGHTS:CNSMJ8R-P3C", description: "CNSMJ8R-P3C Red/Amber, Blue/Amber rear SignalMaster stick", qty: 1, amount: 835.3 },
    { itemName: "CNSM-RBK1", description: "SignalMaster 8-head mount bracket (included)", qty: 1, amount: 0 },
    { itemName: "MPS123U-RBW", description: "MPS123U-RBW rear hatch face, plate area", qty: 2, amount: 298 },
    { itemName: "BRACKETS:MPSM6-LPH1", description: "License plate mount for 1200 series", qty: 1, amount: 71.86 },
    { itemName: "Labor", description: "Install customer-provided WatchGuard camera system", qty: 1, amount: 175 },
    { itemName: "Labor", description: "Installation of equipment, programming, materials, supplies", qty: 1, amount: 1550 },
  ],
};

const res = await fetch("http://localhost:5000/api/estimates", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ docNumber: est.docNumber, data: JSON.stringify(est) }),
});
console.log("POST status:", res.status);
console.log(await res.text());

// Verify round-trip
const g = await fetch("http://localhost:5000/api/estimates/1236");
console.log("GET status:", g.status);
const back = await g.json();
console.log("agency:", back.agency, "| state:", back.state, "| total:", back.total, "| lines:", back.lines.length);
