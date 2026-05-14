import { useState, useRef, useEffect } from "react";

// ─── PT Chart Data ───────────────────────────────────────────────────────────
const PT_DATA = {
  "R-410A": [[-60,4.0],[-50,7.0],[-40,11.0],[-30,16.0],[-20,23.0],[-10,31.0],[0,42.0],[10,54.0],[20,69.0],[30,86.0],[40,106.0],[50,130.0],[60,157.0],[70,188.0],[80,224.0],[90,264.0],[100,308.0],[110,358.0],[120,412.0],[130,472.0],[140,537.0]],
  "R-22":   [[-60,6.0],[-50,10.0],[-40,15.0],[-30,22.0],[-20,30.0],[-10,40.0],[0,52.0],[10,67.0],[20,84.0],[30,104.0],[40,127.0],[50,154.0],[60,185.0],[70,220.0],[80,259.0],[90,303.0],[100,352.0],[110,406.0],[120,465.0]],
  "R-404A": [[-60,3.0],[-50,5.8],[-40,9.5],[-30,14.5],[-20,21.0],[-10,29.5],[0,40.0],[10,53.0],[20,68.0],[30,87.0],[40,109.0],[50,135.0],[60,166.0],[70,201.0],[80,241.0],[90,287.0],[100,338.0],[110,395.0]],
  "R-407C": [[-60,4.5],[-50,7.5],[-40,12.0],[-30,18.0],[-20,26.0],[-10,36.0],[0,48.0],[10,63.0],[20,81.0],[30,102.0],[40,127.0],[50,156.0],[60,190.0],[70,228.0],[80,272.0],[90,321.0],[100,376.0]],
  "R-134A": [[-60,1.5],[-50,3.5],[-40,7.0],[-30,12.0],[-20,19.0],[-10,28.0],[0,40.0],[10,55.0],[20,73.0],[30,95.0],[40,122.0],[50,154.0],[60,192.0],[70,236.0],[80,287.0],[90,345.0],[100,410.0]],
  "R-32":   [[-60,3.0],[-50,6.0],[-40,11.0],[-30,18.0],[-20,27.0],[-10,39.0],[0,54.0],[10,73.0],[20,96.0],[30,124.0],[40,157.0],[50,197.0],[60,244.0],[70,298.0],[80,361.0],[90,433.0],[100,514.0]],
  "R-454B": [[-60,3.5],[-50,6.5],[-40,11.0],[-30,17.0],[-20,25.0],[-10,36.0],[0,50.0],[10,67.0],[20,88.0],[30,113.0],[40,143.0],[50,179.0],[60,221.0],[70,270.0],[80,327.0],[90,392.0],[100,466.0]],
};

function getPressure(refrigerant, tempF) {
  const data = PT_DATA[refrigerant];
  if (!data) return null;
  for (let i = 0; i < data.length - 1; i++) {
    const [t0, p0] = data[i], [t1, p1] = data[i + 1];
    if (tempF >= t0 && tempF <= t1) {
      const frac = (tempF - t0) / (t1 - t0);
      return +(p0 + frac * (p1 - p0)).toFixed(1);
    }
  }
  if (tempF < data[0][0]) return data[0][1];
  return data[data.length - 1][1];
}

function getTempFromPressure(refrigerant, psig) {
  const data = PT_DATA[refrigerant];
  if (!data) return null;
  for (let i = 0; i < data.length - 1; i++) {
    const [t0, p0] = data[i], [t1, p1] = data[i + 1];
    if (psig >= p0 && psig <= p1) {
      const frac = (psig - p0) / (p1 - p0);
      return +(t0 + frac * (t1 - t0)).toFixed(1);
    }
  }
  return null;
}

// ─── Fault Code Database ──────────────────────────────────────────────────────
const FAULT_CODES = {
  carrier: {
    "E1": { desc: "Indoor coil sensor fault", cause: "Open/shorted thermistor or wiring issue", action: "Check NTC sensor resistance (10kΩ @ 25°C), inspect harness" },
    "E2": { desc: "Outdoor coil sensor fault", cause: "Open/shorted thermistor", action: "Replace outdoor coil thermistor, check connector pins" },
    "E3": { desc: "High pressure protection", cause: "Dirty condenser, overcharge, fan failure, airflow restriction", action: "Check condenser cleanliness, verify charge, confirm fan operation" },
    "E4": { desc: "Low pressure protection", cause: "Low charge, evaporator icing, dirty filter, TXV fault", action: "Check suction pressure, inspect filter/coil, verify refrigerant charge" },
    "E5": { desc: "Compressor overload / overcurrent", cause: "Dirty coils, refrigerant overcharge, failing compressor, low voltage", action: "Check voltage, compressor amps vs RLA, coil condition" },
    "E6": { desc: "Communication error (indoor-outdoor)", cause: "Loose wiring, damaged control board, power surge", action: "Inspect comm wire, check for 24V signal, replace board if needed" },
    "E7": { desc: "Mode conflict (cooling/heating conflict)", cause: "Multiple stats calling opposite modes", action: "Check thermostat settings and wiring" },
    "E8": { desc: "Outdoor ambient sensor fault", cause: "Open/shorted ambient thermistor", action: "Test resistance, replace sensor" },
    "F1": { desc: "Indoor fan motor fault", cause: "Capacitor failure, locked rotor, wiring fault", action: "Check capacitor, motor winding resistance, supply voltage" },
    "F2": { desc: "Outdoor fan motor fault", cause: "Capacitor failure, overheating, bearing wear", action: "Replace capacitor, check amp draw vs FLA" },
    "F3": { desc: "Defrost control fault", cause: "Stuck in defrost, sensor failure", action: "Check defrost thermostat continuity, verify defrost board" },
    "F4": { desc: "IPM module protection (inverter)", cause: "Voltage spike, overheating, failed IGBT", action: "Check DC bus voltage, module temp, replace inverter board" },
    "H3": { desc: "High discharge temp protection", cause: "Low charge, poor airflow, TXV restriction", action: "Measure discharge line temp, check superheat, refrigerant level" },
    "H6": { desc: "Compressor position detection error", cause: "Start capacitor, inverter issue, mechanical binding", action: "Check starting components, compressor winding resistance" },
    "LC": { desc: "Anti-freeze protection (coil temp too low)", cause: "Dirty filter, low charge, low airflow", action: "Change filter, check blower RPM, verify charge" },
    "P0": { desc: "IPM protection", cause: "DC bus overvoltage/undervoltage, IGBT fault", action: "Measure DC bus, check capacitors on inverter board" },
    "P4": { desc: "DC fan motor protection", cause: "Hall sensor fault, winding fault", action: "Replace fan motor or control module" },
  },
  trane: {
    "1": { desc: "Flash code 1 — Normal", cause: "System operating normally", action: "No action needed" },
    "2": { desc: "Flash code 2 — High pressure lockout", cause: "Discharge pressure >410 psig (R-410A)", action: "Check condenser fan, coil cleanliness, refrigerant charge" },
    "3": { desc: "Flash code 3 — Low pressure lockout", cause: "Suction pressure <55 psig (R-410A) or <25 psig (R-22)", action: "Check refrigerant charge, coil icing, TXV/orifice" },
    "4": { desc: "Flash code 4 — Open circuit (lost cooling call)", cause: "Thermostat wiring issue, open Y terminal", action: "Verify 24V at Y terminal on board" },
    "5": { desc: "Flash code 5 — Low voltage lockout", cause: "Supply voltage below 187V on 208/230V unit", action: "Check utility voltage, transformer, connections" },
    "6": { desc: "Flash code 6 — Compressor trip / thermal overload", cause: "Overcharge, dirty coils, low voltage, compressor wear", action: "Let cool, verify voltage, check pressures and coils" },
    "7": { desc: "Flash code 7 — Condensate overflow", cause: "Plugged drain pan or drain line", action: "Clear drain, clean pan, check float switch continuity" },
    "8": { desc: "Flash code 8 — Low indoor airflow", cause: "Dirty filter/coil, failed blower, blocked supply/return", action: "Replace filter, check blower RPM and static pressure" },
    "9": { desc: "Flash code 9 — Communicating thermostat fault", cause: "Comm wire break, thermostat hardware failure", action: "Check 4-wire comm bus, test with standard stat" },
    "10": { desc: "Flash code 10 — Board failure / internal fault", cause: "Control board hardware fault", action: "Replace control board" },
    "11": { desc: "Flash code 11 — Invalid model plug", cause: "Wrong or missing model plug", action: "Install correct model plug for the unit" },
  },
  lennox: {
    "E100": { desc: "Blower motor fault", cause: "ECM motor failure, control board fault", action: "Check motor harness, test motor with diagnostic tool" },
    "E101": { desc: "Blower motor communication lost", cause: "Wiring fault, EMI interference", action: "Inspect harness, re-seat connectors" },
    "E111": { desc: "Gas valve circuit fault", cause: "Open circuit to gas valve", action: "Check 24V to valve, verify valve coil resistance ~50Ω" },
    "E221": { desc: "Limit switch open", cause: "Overheating — dirty filter, blocked flue, failed inducer", action: "Check static pressure, filter condition, flue clearance" },
    "E223": { desc: "Rollout switch open", cause: "Flame rollout — cracked heat exchanger or flue blockage", action: "Inspect heat exchanger, check flue draft" },
    "E227": { desc: "Pressure switch stuck open", cause: "Blocked condensate, inducer failure, cracked port hose", action: "Check inducer operation, clear condensate trap, inspect hoses" },
    "E229": { desc: "Pressure switch stuck closed", cause: "Shorted or stuck pressure switch", action: "Replace pressure switch" },
    "E251": { desc: "Igniter fault", cause: "Failed hot surface igniter (HSI)", action: "Measure igniter resistance (40–90Ω), replace if open" },
    "E261": { desc: "Flame sensor fault", cause: "Dirty or failed flame sensor rod", action: "Clean sensor with fine steel wool, check microamp signal (>0.5µA)" },
    "E298": { desc: "System lockout", cause: "3 consecutive ignition failures", action: "Reset board, determine root cause of ignition failure" },
  },
  york: {
    "1F": { desc: "Supply air sensor fault", cause: "Open or shorted thermistor", action: "Test sensor resistance, replace if out of spec" },
    "2F": { desc: "Return air sensor fault", cause: "Open or shorted thermistor", action: "Test sensor resistance, replace if out of spec" },
    "3F": { desc: "Outdoor ambient sensor fault", cause: "Sensor damage or connector issue", action: "Inspect harness and sensor" },
    "4F": { desc: "Discharge pressure sensor fault", cause: "Transducer failure or wiring issue", action: "Check 5V ref voltage, sensor output 0.5–4.5V" },
    "5F": { desc: "Suction pressure sensor fault", cause: "Transducer failure or wiring issue", action: "Check 5V ref voltage, sensor output 0.5–4.5V" },
    "E01": { desc: "High discharge pressure", cause: ">600 psig trip — dirty condenser, overcharge, fan failure", action: "Check condenser fan motor and coil cleanliness" },
    "E02": { desc: "Low suction pressure", cause: "<40 psig trip — low charge, evaporator issue", action: "Check refrigerant, evaporator coil and TXV" },
    "E03": { desc: "Compressor overcurrent", cause: "Compressor drawing above max amperage", action: "Check voltage, RLA, capacitors" },
    "E07": { desc: "High discharge temperature", cause: "Discharge >230°F — low charge or airflow issue", action: "Measure superheat, check charge" },
    "E08": { desc: "Freeze protection", cause: "Coil temp <30°F", action: "Check airflow, filter, refrigerant charge" },
  },
  rheem: {
    "E1": { desc: "Indoor ambient thermistor fault", cause: "Open or shorted sensor", action: "Replace thermistor, check wiring harness" },
    "E2": { desc: "Outdoor ambient thermistor fault", cause: "Open or shorted sensor", action: "Replace thermistor" },
    "E3": { desc: "Defrost thermistor fault", cause: "Sensor failure", action: "Replace defrost sensor" },
    "E4": { desc: "Heat exchanger sensor fault", cause: "Sensor failure", action: "Replace sensor" },
    "E5": { desc: "High pressure switch trip", cause: "HP >620 psig (R-410A) or >400 psig (R-22)", action: "Check condenser, fan, charge" },
    "E6": { desc: "Low pressure switch trip", cause: "LP <54 psig (R-410A) or <27 psig (R-22)", action: "Check charge and evaporator coil" },
    "E7": { desc: "Compressor overload trip", cause: "Overheating or overcurrent", action: "Allow cool-down, check voltage and coils" },
    "E8": { desc: "Communication error", cause: "Indoor-outdoor signal loss", action: "Check comm wire continuity and board connections" },
  },
};

// ─── Refrigerant Identifiers ──────────────────────────────────────────────────
const REFRIGERANTS = ["R-410A","R-22","R-32","R-404A","R-407C","R-134A","R-454B","R-448A"];

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert HVAC diagnostic AI with 25+ years of field and engineering experience. You assist HVAC technicians in troubleshooting, diagnosing, and repairing commercial and residential HVAC equipment.

EXPERTISE AREAS:
- Split systems, package units, mini-splits, VRF/VRV, chillers, boilers, rooftop units, heat pumps
- Refrigeration systems: walk-ins, reach-ins, display cases
- Gas heating: furnaces, boilers, unit heaters
- Controls: thermostats, DDC, BAS, communicating systems
- Refrigerants: R-22, R-410A, R-32, R-404A, R-407C, R-134A, R-454B, R-448A

DIAGNOSTIC APPROACH:
1. Analyze all provided operational data systematically
2. Calculate superheat, subcooling, and temp split when data allows
3. Identify root causes ranked by probability (most likely first)
4. Provide step-by-step diagnostic procedures in field-practical order
5. Flag safety hazards IMMEDIATELY with ⚠️ WARNING prefix
6. Reference specific values: pressure ranges, temp splits, amp thresholds, resistance specs
7. Mention specific parts, part categories, and tools needed

OPERATIONAL DATA INTERPRETATION:
- Normal cooling temp split: 16–22°F (supply vs return)
- Target superheat: 8–15°F (TXV), 10–20°F (fixed orifice)
- Target subcooling: 10–18°F (TXV), 8–12°F (fixed orifice)
- Compare amps to nameplate RLA — flag if >10% over
- High suction + low discharge = low charge or bad compressor
- Low suction + high superheat = restriction, low charge, or airflow issue
- High discharge + high subcooling = overcharge or condenser problem

IMAGE ANALYSIS: When an image is provided, analyze it thoroughly:
- Nameplate data: model, serial, refrigerant type, voltage, RLA, FLA
- Visible damage: burnt wiring, oil stains (leak indicator), corrosion, physical damage
- Component identification: capacitors, contactors, boards, sensors
- Error codes on displays

FAULT CODE INTERPRETATION: When given a fault code and brand, explain:
- What triggered it
- Most likely root causes
- Exact diagnostic steps
- Parts that may need replacement

FORMAT: Be concise and field-practical. Use numbered steps for procedures. Use ⚠️ for safety items. Use bullet points for multi-cause lists. Avoid fluff.`;

// ─── Markdown Parser ──────────────────────────────────────────────────────────
function parseMarkdown(text) {
  return text
    .replace(/⚠️ WARNING[^\n]*/g, m => `<div class="warn-block">${m}</div>`)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class='num'>$2</li>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

// ─── Data Fields ──────────────────────────────────────────────────────────────
const DATA_FIELDS = [
  { key:"suctionPsi", label:"Suction Pressure", unit:"psig", placeholder:"e.g. 68" },
  { key:"dischargePsi", label:"Discharge Pressure", unit:"psig", placeholder:"e.g. 285" },
  { key:"supplyTemp", label:"Supply Air Temp", unit:"°F", placeholder:"e.g. 54" },
  { key:"returnTemp", label:"Return Air Temp", unit:"°F", placeholder:"e.g. 74" },
  { key:"ambientTemp", label:"Ambient Temp", unit:"°F", placeholder:"e.g. 95" },
  { key:"compAmps", label:"Compressor Amps", unit:"A", placeholder:"e.g. 18.4" },
  { key:"fanAmps", label:"Cond Fan Amps", unit:"A", placeholder:"e.g. 1.8" },
  { key:"blowerAmps", label:"Blower Amps", unit:"A", placeholder:"e.g. 3.2" },
  { key:"liquidTemp", label:"Liquid Line Temp", unit:"°F", placeholder:"e.g. 85" },
  { key:"suctionTemp", label:"Suction Line Temp", unit:"°F", placeholder:"e.g. 55" },
  { key:"dischargeTemp", label:"Discharge Line Temp", unit:"°F", placeholder:"e.g. 185" },
  { key:"voltage", label:"Supply Voltage", unit:"V", placeholder:"e.g. 240" },
  { key:"staticPressure", label:"External Static", unit:"in-WC", placeholder:"e.g. 0.5" },
];

// ─── Job History ──────────────────────────────────────────────────────────────
function loadJobs() {
  try { return JSON.parse(localStorage.getItem("hvac_jobs") || "[]"); } catch { return []; }
}
function saveJobs(jobs) {
  try { localStorage.setItem("hvac_jobs", JSON.stringify(jobs)); } catch {}
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HVACPro() {
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([{
    role:"assistant",
    content:"**HVAC PRO DIAGNOSTIC SYSTEM — ONLINE**\n\nI'm your AI field assistant. You can:\n- Describe symptoms and I'll walk you through diagnostics\n- Use the **📊 Data** panel to enter live readings for full analysis\n- Upload a **nameplate or unit photo** for instant identification\n- Look up **fault codes** by brand in the Fault Codes tab\n- Use the **PT Chart** to convert pressure ↔ temperature\n- Calculate **Superheat & Subcooling** in the Calc tab\n- Save job notes in **Job History**\n\nWhat are we working on today? Include make/model and refrigerant type for best results."
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showData, setShowData] = useState(false);
  const [opData, setOpData] = useState({});
  const [refrigerant, setRefrigerant] = useState("R-410A");
  const [equipment, setEquipment] = useState("");
  const [imageB64, setImageB64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const chatEndRef = useRef(null);
  const fileRef = useRef(null);

  // PT Chart state
  const [ptRefrig, setPtRefrig] = useState("R-410A");
  const [ptTemp, setPtTemp] = useState("");
  const [ptPsi, setPtPsi] = useState("");
  const [ptResult, setPtResult] = useState(null);
  const [ptMode, setPtMode] = useState("temp2psi");

  // Calc state
  const [calcRefrig, setCalcRefrig] = useState("R-410A");
  const [calcSuction, setCalcSuction] = useState("");
  const [calcDischarge, setCalcDischarge] = useState("");
  const [calcSuctionLine, setCalcSuctionLine] = useState("");
  const [calcLiquidLine, setCalcLiquidLine] = useState("");
  const [calcResult, setCalcResult] = useState(null);

  // Fault code state
  const [fcBrand, setFcBrand] = useState("carrier");
  const [fcCode, setFcCode] = useState("");
  const [fcResult, setFcResult] = useState(null);

  // Job history
  const [jobs, setJobs] = useState(loadJobs());
  const [jobForm, setJobForm] = useState({ title:"", location:"", equipment:"", notes:"" });
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  // ── Build data string for chat ──────────────────────────────────────────────
  const buildDataStr = () => {
    const filled = DATA_FIELDS.filter(f => opData[f.key]);
    if (!filled.length && !equipment) return null;
    let parts = [];
    if (equipment) parts.push(`Equipment: ${equipment}`);
    parts.push(`Refrigerant: ${refrigerant}`);
    filled.forEach(f => parts.push(`${f.label}: ${opData[f.key]} ${f.unit}`));
    return parts.join(" | ");
  };

  // ── Image upload ────────────────────────────────────────────────────────────
  const handleImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const full = e.target.result;
      setImagePreview(full);
      setImageB64(full.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  // ── Send chat message ───────────────────────────────────────────────────────
  const sendMessage = async (textOverride) => {
    const text = textOverride ?? input.trim();
    if (!text && !buildDataStr() && !imageB64) return;
    const dataStr = buildDataStr();
    const userText = dataStr ? `${dataStr}\n\n${text}`.trim() : text;

    const userMsg = { role:"user", content: userText, image: imagePreview };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput(""); setShowData(false); setImagePreview(null);
    const imgB64 = imageB64; setImageB64(null);
    setLoading(true);

    try {
      // Build API messages with optional image
      const apiMessages = updated.map((m, i) => {
        if (m.role === "user" && m.image && i === updated.length - 1) {
          return {
            role: "user",
            content: [
              { type: "image", source: { type:"base64", media_type:"image/jpeg", data: imgB64 } },
              { type: "text", text: m.content || "Please analyze this image." }
            ]
          };
        }
        return { role: m.role, content: m.content };
      });

      const res = await fetch("http://localhost:3001", {
        method:"POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({
          model:"claude-sonnet-4-5",
          max_tokens:1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        })
      });
      const data = await res.json();
      const reply = data.content?.find(b => b.type==="text")?.text || "No response.";
      setMessages(prev => [...prev, { role:"assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role:"assistant", content:"⚠️ Connection error. Check network and retry." }]);
    } finally { setLoading(false); }
  };

  const handleKey = (e) => {
    if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── PT Chart calc ───────────────────────────────────────────────────────────
  const calcPT = () => {
    if (ptMode === "temp2psi") {
      const t = parseFloat(ptTemp);
      if (isNaN(t)) return;
      const p = getPressure(ptRefrig, t);
      setPtResult({ mode:"temp2psi", temp:t, psi:p });
    } else {
      const p = parseFloat(ptPsi);
      if (isNaN(p)) return;
      const t = getTempFromPressure(ptRefrig, p);
      setPtResult({ mode:"psi2temp", psi:p, temp:t });
    }
  };

  // ── SH/SC calc ──────────────────────────────────────────────────────────────
  const calcSHSC = () => {
    const sp = parseFloat(calcSuction), dp = parseFloat(calcDischarge);
    const sl = parseFloat(calcSuctionLine), ll = parseFloat(calcLiquidLine);
    if (isNaN(sp) || isNaN(dp)) { setCalcResult({ error:"Enter suction and discharge pressures." }); return; }
    const satSuction = getTempFromPressure(calcRefrig, sp);
    const satDischarge = getTempFromPressure(calcRefrig, dp);
    const sh = (!isNaN(sl) && satSuction !== null) ? +(sl - satSuction).toFixed(1) : null;
    const sc = (!isNaN(ll) && satDischarge !== null) ? +(satDischarge - ll).toFixed(1) : null;
    const split = (!isNaN(parseFloat(opData.returnTemp)) && !isNaN(parseFloat(opData.supplyTemp)))
      ? +(parseFloat(opData.returnTemp) - parseFloat(opData.supplyTemp)).toFixed(1) : null;
    setCalcResult({ satSuction, satDischarge, sh, sc, split,
      shOk: sh !== null ? (sh >= 8 && sh <= 20) : null,
      scOk: sc !== null ? (sc >= 8 && sc <= 18) : null,
    });
  };

  // ── Fault code lookup ───────────────────────────────────────────────────────
  const lookupFault = () => {
    const codes = FAULT_CODES[fcBrand];
    if (!codes) return;
    const code = fcCode.trim().toUpperCase();
    const result = codes[code] || codes[fcCode.trim()] || null;
    setFcResult(result ? { code, ...result } : { notFound: true, code });
  };

  // ── Save job ────────────────────────────────────────────────────────────────
  const saveJob = () => {
    if (!jobForm.title) return;
    const job = { ...jobForm, id: Date.now(), date: new Date().toLocaleDateString(), messages: [] };
    const updated = [job, ...jobs];
    setJobs(updated); saveJobs(updated);
    setJobForm({ title:"", location:"", equipment:"", notes:"" });
  };

  const deleteJob = (id) => {
    const updated = jobs.filter(j => j.id !== id);
    setJobs(updated); saveJobs(updated);
    if (selectedJob?.id === id) setSelectedJob(null);
  };

  const quickPrompts = [
    "Unit not cooling — compressor short cycling",
    "High discharge pressure, normal suction pressure",
    "Low suction, high superheat, high discharge",
    "Compressor drawing high amps, trips on overload",
    "Intermittent cooling — works sometimes, not others",
    "Heat pump not going into defrost / stuck in defrost",
  ];

  const TAB_STYLE = (t) => ({
    padding:"8px 14px", fontSize:11, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace",
    letterSpacing:1, border:"none", background: tab===t ? "#21a850" : "transparent",
    color: tab===t ? "#000" : "#4a7a55", borderBottom: tab===t ? "2px solid #21a850" : "2px solid transparent",
    transition:"all 0.15s", fontWeight: tab===t ? 600 : 400,
  });

  const statusColor = (ok) => ok === true ? "#4ade80" : ok === false ? "#f87171" : "#94a3b8";

  return (
    <div style={{ minHeight:"100vh", background:"#08090d", fontFamily:"'IBM Plex Mono','Courier New',monospace", display:"flex", flexDirection:"column", color:"#c9d1d9" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-track{background:#0d1117;} ::-webkit-scrollbar-thumb{background:#21a850;border-radius:3px;}
        .msg-user{animation:sR .2s ease;} .msg-ai{animation:sL .2s ease;}
        @keyframes sR{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes sL{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
        .blink{animation:bl 1s step-end infinite;} @keyframes bl{0%,100%{opacity:1}50%{opacity:0}}
        .hover-btn:hover{background:#1a2e1a!important;border-color:#21a850!important;color:#4ade80!important;}
        .green-btn:hover{background:#16a34a!important;}
        .inp:focus{outline:none;border-color:#21a850!important;background:#0a150a!important;}
        textarea:focus{outline:none;border-color:#21a850!important;}
        h1,h2,h3{color:#4ade80;margin:6px 0 3px;font-family:'IBM Plex Sans',sans-serif;}
        ul{padding-left:18px;margin:5px 0;} li{margin:3px 0;} li.num{list-style:decimal;}
        strong{color:#86efac;} .warn-block{background:#2a1500;border-left:3px solid #f97316;padding:6px 10px;margin:6px 0;border-radius:0 4px 4px 0;color:#fdba74;}
        select{background:#0a0e14;color:#c9d1d9;border:1px solid #1e3a1e;border-radius:4px;padding:6px 8px;font-family:'IBM Plex Mono',monospace;font-size:12px;}
        select:focus{outline:none;border-color:#21a850;}
        .tab-bar{display:flex;overflow-x:auto;border-bottom:1px solid #1e3a1e;background:#0d1117;flex-shrink:0;}
        .tab-bar::-webkit-scrollbar{height:0;}
        .result-box{background:#0d1117;border:1px solid #1e3a1e;border-radius:6px;padding:14px;margin-top:12px;}
        .stat-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #141c14;font-size:12px;}
        .stat-row:last-child{border-bottom:none;}
        .badge{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;letter-spacing:1px;}
        .badge-ok{background:#14532d;color:#4ade80;} .badge-warn{background:#431407;color:#f87171;} .badge-info{background:#1e3a1e;color:#86efac;}
        .job-card{background:#0d1117;border:1px solid #1a2a1a;border-radius:6px;padding:12px;margin-bottom:8px;cursor:pointer;transition:border-color .15s;}
        .job-card:hover{border-color:#21a850;}
        .img-preview{max-width:120px;max-height:80px;border-radius:4px;border:1px solid #21a850;object-fit:cover;}
      `}</style>

      {/* Header */}
      <div style={{ background:"#0d1117", borderBottom:"1px solid #1e3a1e", padding:"10px 16px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <div style={{ width:32,height:32,background:"linear-gradient(135deg,#166534,#21a850)",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 0 10px #21a85040" }}>🌡️</div>
        <div>
          <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:700, fontSize:14, color:"#4ade80", letterSpacing:1.5 }}>HVAC PRO DIAGNOSTIC</div>
          <div style={{ fontSize:9, color:"#3d7a4d", letterSpacing:2 }}>AI FIELD ASSISTANT • <span style={{color:"#21a850"}}>SYSTEM ONLINE<span className="blink">_</span></span></div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ fontSize:10, color:"#3d7a4d", textAlign:"right", lineHeight:1.6 }}>
            <div>R-410A / R-22 / R-32</div>
            <div>R-404A / R-407C / R-134A</div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        {[["chat","💬 Diagnose"],["pt","📈 PT Chart"],["calc","🔢 SH/SC Calc"],["fault","⚡ Fault Codes"],["jobs","📋 Job History"]].map(([t,l]) => (
          <button key={t} style={TAB_STYLE(t)} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* ── CHAT TAB ──────────────────────────────────────────────────────────── */}
      {tab==="chat" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 0" }}>
            {messages.length===1 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, color:"#3d7a4d", letterSpacing:2, marginBottom:8 }}>QUICK START — TAP A SCENARIO</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {quickPrompts.map(p => (
                    <button key={p} className="hover-btn" onClick={() => sendMessage(p)} style={{ background:"#0d1117", border:"1px solid #1a2a1a", color:"#4a7a55", borderRadius:4, padding:"5px 9px", fontSize:11, cursor:"pointer", transition:"all .15s", fontFamily:"'IBM Plex Mono',monospace" }}>{p}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m,i) => (
              <div key={i} className={m.role==="user"?"msg-user":"msg-ai"} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", marginBottom:10 }}>
                {m.role==="assistant" && <div style={{ width:26,height:26,minWidth:26,background:"linear-gradient(135deg,#166534,#21a850)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,marginRight:8,marginTop:2 }}>🔧</div>}
                <div style={{ maxWidth:"82%", background:m.role==="user"?"#0f2a0f":"#0d1117", border:`1px solid ${m.role==="user"?"#1e5c1e":"#1a2a1a"}`, borderRadius:m.role==="user"?"10px 10px 2px 10px":"10px 10px 10px 2px", padding:"9px 13px", fontSize:12, lineHeight:1.65, color:m.role==="user"?"#86efac":"#c9d1d9" }}>
                  {m.image && <img src={m.image} alt="upload" className="img-preview" style={{ display:"block", marginBottom:6 }} />}
                  {m.role==="user"
                    ? <span style={{ whiteSpace:"pre-wrap" }}>{m.content}</span>
                    : <span dangerouslySetInnerHTML={{ __html:parseMarkdown(m.content) }} />
                  }
                </div>
              </div>
            ))}
            {loading && (
              <div className="msg-ai" style={{ display:"flex", marginBottom:10 }}>
                <div style={{ width:26,height:26,minWidth:26,background:"linear-gradient(135deg,#166534,#21a850)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,marginRight:8 }}>🔧</div>
                <div style={{ background:"#0d1117", border:"1px solid #1a2a1a", borderRadius:"10px 10px 10px 2px", padding:"9px 13px", fontSize:12, color:"#3d7a4d" }}>Analyzing<span className="blink">_</span></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Data Panel */}
          {showData && (
            <div style={{ background:"#0d1117", borderTop:"1px solid #1e3a1e", padding:14, maxHeight:260, overflowY:"auto" }}>
              <div style={{ fontSize:10, color:"#4ade80", letterSpacing:2, marginBottom:10 }}>LIVE OPERATIONAL DATA</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:8, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:3 }}>EQUIPMENT MODEL</div>
                  <input value={equipment} onChange={e=>setEquipment(e.target.value)} placeholder="Carrier 38HDC036" className="inp" style={{ width:"100%", background:"#0a0e14", border:"1px solid #1a2a1a", borderRadius:4, padding:"5px 7px", color:"#c9d1d9", fontSize:11, fontFamily:"'IBM Plex Mono',monospace", transition:"all .15s" }} />
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:3 }}>REFRIGERANT</div>
                  <select value={refrigerant} onChange={e=>setRefrigerant(e.target.value)} style={{ width:"100%" }}>
                    {REFRIGERANTS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                {DATA_FIELDS.map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:3 }}>{f.label.toUpperCase()} <span style={{color:"#21a850"}}>{f.unit}</span></div>
                    <input type="number" value={opData[f.key]||""} onChange={e=>setOpData({...opData,[f.key]:e.target.value})} placeholder={f.placeholder} className="inp" style={{ width:"100%", background:"#0a0e14", border:"1px solid #1a2a1a", borderRadius:4, padding:"5px 7px", color:"#c9d1d9", fontSize:11, fontFamily:"'IBM Plex Mono',monospace", transition:"all .15s" }} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize:10, color:"#3d7a4d" }}>Data will be attached to your next message automatically.</div>
            </div>
          )}

          {/* Image preview bar */}
          {imagePreview && (
            <div style={{ background:"#0d1117", borderTop:"1px solid #1e3a1e", padding:"8px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <img src={imagePreview} alt="preview" style={{ height:48, borderRadius:4, border:"1px solid #21a850" }} />
              <span style={{ fontSize:11, color:"#4ade80" }}>Image ready to send</span>
              <button onClick={()=>{setImagePreview(null);setImageB64(null);}} style={{ marginLeft:"auto", background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:16 }}>✕</button>
            </div>
          )}

          {/* Input Bar */}
          <div style={{ background:"#0d1117", borderTop:"1px solid #1e3a1e", padding:"10px 14px", display:"flex", gap:7, alignItems:"flex-end" }}>
            <button className="hover-btn" onClick={()=>setShowData(!showData)} title="Enter operational data" style={{ background:showData?"#0f2a0f":"#0d1117", border:`1px solid ${showData?"#21a850":"#1e3a1e"}`, color:showData?"#4ade80":"#3d7a4d", borderRadius:5, padding:"7px 9px", cursor:"pointer", fontSize:15, transition:"all .15s", flexShrink:0 }}>📊</button>
            <button className="hover-btn" onClick={()=>fileRef.current?.click()} title="Upload photo / nameplate" style={{ background:"#0d1117", border:"1px solid #1e3a1e", color:"#3d7a4d", borderRadius:5, padding:"7px 9px", cursor:"pointer", fontSize:15, transition:"all .15s", flexShrink:0 }}>📷</button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleImage(e.target.files[0])} />
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} placeholder="Describe symptoms, error codes, or ask a question..." rows={1}
              style={{ flex:1, background:"#0a0e14", border:"1px solid #1e3a1e", borderRadius:5, padding:"8px 11px", color:"#c9d1d9", fontSize:12, fontFamily:"'IBM Plex Mono',monospace", resize:"none", lineHeight:1.5, maxHeight:100, overflowY:"auto", transition:"border-color .15s" }}
              onFocus={e=>e.target.style.borderColor="#21a850"} onBlur={e=>e.target.style.borderColor="#1e3a1e"}
              onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,100)+"px";}} />
            <button className="green-btn" onClick={()=>sendMessage()} disabled={loading||(!input.trim()&&!buildDataStr()&&!imageB64)} style={{ background:"#16a34a", border:"none", borderRadius:5, padding:"8px 13px", color:"#fff", fontSize:14, cursor:"pointer", transition:"background .15s", flexShrink:0, opacity:(loading||(!input.trim()&&!buildDataStr()&&!imageB64))?0.4:1 }}>↑</button>
          </div>
        </div>
      )}

      {/* ── PT CHART TAB ─────────────────────────────────────────────────────── */}
      {tab==="pt" && (
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
          <div style={{ fontSize:10, color:"#4ade80", letterSpacing:2, marginBottom:14 }}>PRESSURE / TEMPERATURE CHART</div>
          <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:160 }}>
              <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:4 }}>REFRIGERANT</div>
              <select value={ptRefrig} onChange={e=>{setPtRefrig(e.target.value);setPtResult(null);}} style={{ width:"100%" }}>
                {REFRIGERANTS.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ flex:1, minWidth:160 }}>
              <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:4 }}>CONVERSION MODE</div>
              <select value={ptMode} onChange={e=>{setPtMode(e.target.value);setPtResult(null);}} style={{ width:"100%" }}>
                <option value="temp2psi">Temperature → Pressure</option>
                <option value="psi2temp">Pressure → Temperature</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"flex-end", flexWrap:"wrap" }}>
            {ptMode==="temp2psi" ? (
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:4 }}>TEMPERATURE (°F)</div>
                <input type="number" value={ptTemp} onChange={e=>{setPtTemp(e.target.value);setPtResult(null);}} placeholder="e.g. 40" className="inp" style={{ width:"100%", background:"#0a0e14", border:"1px solid #1a2a1a", borderRadius:4, padding:"7px 9px", color:"#c9d1d9", fontSize:13, fontFamily:"'IBM Plex Mono',monospace" }} />
              </div>
            ) : (
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:4 }}>PRESSURE (psig)</div>
                <input type="number" value={ptPsi} onChange={e=>{setPtPsi(e.target.value);setPtResult(null);}} placeholder="e.g. 120" className="inp" style={{ width:"100%", background:"#0a0e14", border:"1px solid #1a2a1a", borderRadius:4, padding:"7px 9px", color:"#c9d1d9", fontSize:13, fontFamily:"'IBM Plex Mono',monospace" }} />
              </div>
            )}
            <button className="green-btn" onClick={calcPT} style={{ background:"#16a34a", border:"none", borderRadius:5, padding:"8px 20px", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:1, flexShrink:0 }}>CONVERT</button>
          </div>
          {ptResult && (
            <div className="result-box">
              <div style={{ fontSize:10, color:"#4ade80", letterSpacing:2, marginBottom:10 }}>RESULT — {ptRefrig}</div>
              {ptResult.mode==="temp2psi" ? (
                <div style={{ fontSize:28, color:"#4ade80", fontWeight:600 }}>{ptResult.psi} <span style={{fontSize:14,color:"#3d7a4d"}}>psig</span></div>
              ) : (
                <div style={{ fontSize:28, color:"#4ade80", fontWeight:600 }}>{ptResult.temp !== null ? ptResult.temp : "—"} <span style={{fontSize:14,color:"#3d7a4d"}}>°F saturation</span></div>
              )}
              <div style={{ fontSize:11, color:"#3d7a4d", marginTop:6 }}>
                {ptResult.mode==="temp2psi" ? `Saturation temp ${ptResult.temp}°F → ${ptResult.psi} psig` : `${ptResult.psi} psig → saturation temp ${ptResult.temp}°F`}
              </div>
            </div>
          )}

          {/* Full PT table */}
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:10, color:"#4ade80", letterSpacing:2, marginBottom:10 }}>FULL TABLE — {ptRefrig}</div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:"#0d1117" }}>
                    <th style={{ padding:"6px 10px", textAlign:"left", color:"#3d7a4d", borderBottom:"1px solid #1e3a1e", letterSpacing:1, fontSize:9 }}>TEMP °F</th>
                    <th style={{ padding:"6px 10px", textAlign:"right", color:"#3d7a4d", borderBottom:"1px solid #1e3a1e", letterSpacing:1, fontSize:9 }}>PSIG</th>
                  </tr>
                </thead>
                <tbody>
                  {(PT_DATA[ptRefrig]||[]).map(([t,p]) => (
                    <tr key={t} style={{ borderBottom:"1px solid #111a11" }}>
                      <td style={{ padding:"4px 10px", color:"#c9d1d9" }}>{t}°F</td>
                      <td style={{ padding:"4px 10px", textAlign:"right", color:"#4ade80" }}>{p}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SH/SC CALC TAB ───────────────────────────────────────────────────── */}
      {tab==="calc" && (
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
          <div style={{ fontSize:10, color:"#4ade80", letterSpacing:2, marginBottom:14 }}>SUPERHEAT & SUBCOOLING CALCULATOR</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10, marginBottom:14 }}>
            <div>
              <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:4 }}>REFRIGERANT</div>
              <select value={calcRefrig} onChange={e=>setCalcRefrig(e.target.value)} style={{ width:"100%" }}>
                {REFRIGERANTS.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            {[
              { key:"calcSuction", label:"SUCTION PRESSURE", unit:"psig", val:calcSuction, set:setCalcSuction, ph:"e.g. 68" },
              { key:"calcDischarge", label:"DISCHARGE PRESSURE", unit:"psig", val:calcDischarge, set:setCalcDischarge, ph:"e.g. 285" },
              { key:"calcSuctionLine", label:"SUCTION LINE TEMP", unit:"°F", val:calcSuctionLine, set:setCalcSuctionLine, ph:"e.g. 55" },
              { key:"calcLiquidLine", label:"LIQUID LINE TEMP", unit:"°F", val:calcLiquidLine, set:setCalcLiquidLine, ph:"e.g. 85" },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:4 }}>{f.label} <span style={{color:"#21a850"}}>{f.unit}</span></div>
                <input type="number" value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} className="inp" style={{ width:"100%", background:"#0a0e14", border:"1px solid #1a2a1a", borderRadius:4, padding:"6px 8px", color:"#c9d1d9", fontSize:12, fontFamily:"'IBM Plex Mono',monospace" }} />
              </div>
            ))}
          </div>
          <button className="green-btn" onClick={calcSHSC} style={{ background:"#16a34a", border:"none", borderRadius:5, padding:"9px 24px", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:1 }}>CALCULATE</button>

          {calcResult && !calcResult.error && (
            <div className="result-box" style={{ marginTop:14 }}>
              <div style={{ fontSize:10, color:"#4ade80", letterSpacing:2, marginBottom:10 }}>RESULTS — {calcRefrig}</div>
              {calcResult.satSuction !== null && (
                <div className="stat-row">
                  <span style={{color:"#94a3b8"}}>Sat. Suction Temp</span>
                  <span style={{color:"#c9d1d9"}}>{calcResult.satSuction}°F</span>
                </div>
              )}
              {calcResult.satDischarge !== null && (
                <div className="stat-row">
                  <span style={{color:"#94a3b8"}}>Sat. Discharge Temp</span>
                  <span style={{color:"#c9d1d9"}}>{calcResult.satDischarge}°F</span>
                </div>
              )}
              {calcResult.sh !== null && (
                <div className="stat-row">
                  <span style={{color:"#94a3b8"}}>Superheat</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:statusColor(calcResult.shOk),fontSize:14,fontWeight:600}}>{calcResult.sh}°F</span>
                    <span className={`badge ${calcResult.shOk?"badge-ok":"badge-warn"}`}>{calcResult.shOk?"NORMAL":"CHECK"}</span>
                  </div>
                </div>
              )}
              {calcResult.sc !== null && (
                <div className="stat-row">
                  <span style={{color:"#94a3b8"}}>Subcooling</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:statusColor(calcResult.scOk),fontSize:14,fontWeight:600}}>{calcResult.sc}°F</span>
                    <span className={`badge ${calcResult.scOk?"badge-ok":"badge-warn"}`}>{calcResult.scOk?"NORMAL":"CHECK"}</span>
                  </div>
                </div>
              )}
              {calcResult.sh !== null && (
                <div style={{ marginTop:10, padding:10, background:"#0a150a", borderRadius:5, fontSize:11, color:"#6b9e7a", lineHeight:1.7 }}>
                  {calcResult.sh < 8 && "⚠️ Low superheat — risk of liquid slugging. Check for overcharge or metering device issue."}
                  {calcResult.sh >= 8 && calcResult.sh <= 15 && "✅ Superheat in normal TXV range (8–15°F)."}
                  {calcResult.sh > 15 && calcResult.sh <= 20 && "ℹ️ Superheat elevated. Acceptable for fixed orifice. Monitor for low charge or airflow restriction."}
                  {calcResult.sh > 20 && "⚠️ High superheat — likely low charge, restricted TXV/orifice, or low airflow over evaporator."}
                </div>
              )}
              {calcResult.sc !== null && (
                <div style={{ marginTop:6, padding:10, background:"#0a150a", borderRadius:5, fontSize:11, color:"#6b9e7a", lineHeight:1.7 }}>
                  {calcResult.sc < 8 && "⚠️ Low subcooling — possible undercharge or floodback. Verify charge level."}
                  {calcResult.sc >= 8 && calcResult.sc <= 18 && "✅ Subcooling in normal range (8–18°F)."}
                  {calcResult.sc > 18 && "⚠️ High subcooling — possible overcharge or condenser restriction. Check head pressure."}
                </div>
              )}
              <button onClick={()=>{ const m=`Calculated SH/SC for ${calcRefrig}: Suction ${calcSuction} psig, Discharge ${calcDischarge} psig, Suction Line ${calcSuctionLine}°F, Liquid Line ${calcLiquidLine}°F. SH=${calcResult.sh}°F, SC=${calcResult.sc}°F. What does this tell me about system condition?`; setTab("chat"); setTimeout(()=>sendMessage(m),100); }} style={{ marginTop:12, background:"none", border:"1px solid #21a850", color:"#4ade80", borderRadius:4, padding:"6px 14px", cursor:"pointer", fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
                Ask AI to interpret these results →
              </button>
            </div>
          )}
          {calcResult?.error && <div style={{ color:"#f87171", marginTop:10, fontSize:12 }}>{calcResult.error}</div>}

          {/* Reference table */}
          <div style={{ marginTop:20, background:"#0d1117", border:"1px solid #1a2a1a", borderRadius:6, padding:14 }}>
            <div style={{ fontSize:10, color:"#4ade80", letterSpacing:2, marginBottom:10 }}>REFERENCE TARGETS</div>
            {[
              ["Superheat — TXV system","8 – 15°F"],
              ["Superheat — Fixed orifice","10 – 20°F"],
              ["Subcooling — TXV system","10 – 18°F"],
              ["Subcooling — Fixed orifice","8 – 12°F"],
              ["Temperature split (cooling)","16 – 22°F"],
              ["Discharge line temp (max)","225°F"],
              ["Compressor amps — max allowed","105% of RLA"],
            ].map(([k,v]) => (
              <div key={k} className="stat-row">
                <span style={{color:"#94a3b8",fontSize:11}}>{k}</span>
                <span style={{color:"#4ade80",fontSize:11,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FAULT CODES TAB ──────────────────────────────────────────────────── */}
      {tab==="fault" && (
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
          <div style={{ fontSize:10, color:"#4ade80", letterSpacing:2, marginBottom:14 }}>FAULT CODE LOOKUP</div>
          <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:150 }}>
              <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:4 }}>BRAND</div>
              <select value={fcBrand} onChange={e=>{setFcBrand(e.target.value);setFcResult(null);}} style={{ width:"100%" }}>
                <option value="carrier">Carrier / Bryant</option>
                <option value="trane">Trane / American Standard</option>
                <option value="lennox">Lennox</option>
                <option value="york">York / Johnson Controls</option>
                <option value="rheem">Rheem / Ruud</option>
              </select>
            </div>
            <div style={{ flex:1, minWidth:150 }}>
              <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:4 }}>FAULT CODE</div>
              <div style={{ display:"flex", gap:6 }}>
                <input value={fcCode} onChange={e=>{setFcCode(e.target.value);setFcResult(null);}} onKeyDown={e=>e.key==="Enter"&&lookupFault()} placeholder="e.g. E3, F1, 6..." className="inp" style={{ flex:1, background:"#0a0e14", border:"1px solid #1a2a1a", borderRadius:4, padding:"6px 9px", color:"#c9d1d9", fontSize:13, fontFamily:"'IBM Plex Mono',monospace", textTransform:"uppercase" }} />
                <button className="green-btn" onClick={lookupFault} style={{ background:"#16a34a", border:"none", borderRadius:4, padding:"6px 16px", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace" }}>LOOK UP</button>
              </div>
            </div>
          </div>

          {fcResult && !fcResult.notFound && (
            <div className="result-box">
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ background:"#21a850", color:"#000", fontWeight:700, padding:"3px 12px", borderRadius:4, fontSize:14, fontFamily:"'IBM Plex Sans',sans-serif" }}>{fcResult.code}</div>
                <div style={{ color:"#4ade80", fontSize:13, fontWeight:500 }}>{fcResult.desc}</div>
              </div>
              <div className="stat-row"><span style={{color:"#94a3b8",fontSize:11}}>Root Cause(s)</span><span style={{color:"#c9d1d9",fontSize:11,maxWidth:"60%",textAlign:"right"}}>{fcResult.cause}</span></div>
              <div style={{ marginTop:10, background:"#0a150a", borderRadius:5, padding:10 }}>
                <div style={{ fontSize:9, color:"#3d7a4d", letterSpacing:1, marginBottom:6 }}>DIAGNOSTIC ACTION</div>
                <div style={{ fontSize:12, color:"#86efac", lineHeight:1.7 }}>{fcResult.action}</div>
              </div>
              <button onClick={()=>{ const m=`I have a ${fcBrand} unit showing fault code ${fcResult.code} — "${fcResult.desc}". Walk me through a complete diagnostic procedure to find and fix this issue.`; setTab("chat"); setTimeout(()=>sendMessage(m),100); }} style={{ marginTop:12, background:"none", border:"1px solid #21a850", color:"#4ade80", borderRadius:4, padding:"6px 14px", cursor:"pointer", fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
                Get full AI diagnostic for this code →
              </button>
            </div>
          )}
          {fcResult?.notFound && (
            <div style={{ background:"#1a0a00", border:"1px solid #431407", borderRadius:6, padding:14 }}>
              <div style={{ color:"#f97316", fontSize:12 }}>Code <strong>{fcResult.code}</strong> not found in local database.</div>
              <button onClick={()=>{ const m=`What does fault code ${fcResult.code} mean on a ${fcBrand} HVAC unit? What are the causes and how do I diagnose it?`; setTab("chat"); setTimeout(()=>sendMessage(m),100); }} style={{ marginTop:10, background:"none", border:"1px solid #f97316", color:"#f97316", borderRadius:4, padding:"6px 14px", cursor:"pointer", fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
                Ask AI about this code →
              </button>
            </div>
          )}

          {/* All codes for selected brand */}
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:10, color:"#4ade80", letterSpacing:2, marginBottom:10 }}>ALL CODES — {fcBrand.toUpperCase()}</div>
            {Object.entries(FAULT_CODES[fcBrand]||{}).map(([code, info]) => (
              <div key={code} className="job-card" onClick={()=>{setFcCode(code);setFcResult({code,...info});}}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <span style={{ background:"#1a2e1a", color:"#4ade80", padding:"2px 8px", borderRadius:3, fontSize:11, fontWeight:600, minWidth:36, textAlign:"center" }}>{code}</span>
                  <span style={{ color:"#c9d1d9", fontSize:12 }}>{info.desc}</span>
                </div>
                <div style={{ fontSize:11, color:"#3d7a4d", paddingLeft:54 }}>{info.cause}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── JOB HISTORY TAB ──────────────────────────────────────────────────── */}
      {tab==="jobs" && (
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
          <div style={{ fontSize:10, color:"#4ade80", letterSpacing:2, marginBottom:14 }}>JOB HISTORY & NOTES</div>

          {/* New job form */}
          <div style={{ background:"#0d1117", border:"1px solid #1e3a1e", borderRadius:6, padding:14, marginBottom:16 }}>
            <div style={{ fontSize:10, color:"#3d7a4d", letterSpacing:1, marginBottom:10 }}>NEW JOB</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:8 }}>
              {[
                { key:"title", label:"JOB / CUSTOMER NAME", ph:"e.g. Smith Residence" },
                { key:"location", label:"ADDRESS / LOCATION", ph:"e.g. 123 Main St" },
                { key:"equipment", label:"EQUIPMENT", ph:"e.g. Carrier 5-ton split" },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:3 }}>{f.label}</div>
                  <input value={jobForm[f.key]} onChange={e=>setJobForm({...jobForm,[f.key]:e.target.value})} placeholder={f.ph} className="inp" style={{ width:"100%", background:"#0a0e14", border:"1px solid #1a2a1a", borderRadius:4, padding:"5px 7px", color:"#c9d1d9", fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:9, color:"#3d7a4d", marginBottom:3 }}>NOTES / DIAGNOSIS</div>
              <textarea value={jobForm.notes} onChange={e=>setJobForm({...jobForm,notes:e.target.value})} placeholder="Document findings, parts replaced, pressures, repairs made..." rows={3} style={{ width:"100%", background:"#0a0e14", border:"1px solid #1a2a1a", borderRadius:4, padding:"6px 9px", color:"#c9d1d9", fontSize:11, fontFamily:"'IBM Plex Mono',monospace", resize:"vertical" }} />
            </div>
            <button className="green-btn" onClick={saveJob} disabled={!jobForm.title} style={{ marginTop:8, background:"#16a34a", border:"none", borderRadius:4, padding:"7px 18px", color:"#fff", fontSize:11, cursor:"pointer", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:1, opacity:jobForm.title?1:0.4 }}>SAVE JOB</button>
          </div>

          {jobs.length === 0 && <div style={{ color:"#3d7a4d", fontSize:12, textAlign:"center", padding:30 }}>No jobs saved yet. Add your first job above.</div>}

          {jobs.map(job => (
            <div key={job.id} className="job-card" onClick={()=>setSelectedJob(selectedJob?.id===job.id?null:job)}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ color:"#4ade80", fontSize:13, fontWeight:500, marginBottom:3 }}>{job.title}</div>
                  <div style={{ fontSize:11, color:"#3d7a4d" }}>{job.equipment} • {job.location}</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:10, color:"#3d7a4d" }}>{job.date}</span>
                  <button onClick={e=>{e.stopPropagation();deleteJob(job.id);}} style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:14, padding:"0 2px" }}>✕</button>
                </div>
              </div>
              {selectedJob?.id===job.id && job.notes && (
                <div style={{ marginTop:10, padding:10, background:"#0a150a", borderRadius:5, fontSize:12, color:"#86efac", whiteSpace:"pre-wrap", lineHeight:1.7 }}>{job.notes}</div>
              )}
              {selectedJob?.id===job.id && (
                <button onClick={e=>{e.stopPropagation(); const m=`I'm working on a service call for: ${job.title}. Equipment: ${job.equipment}. Location: ${job.location}. Previous notes: ${job.notes}. Based on this history, what should I check first today?`; setTab("chat"); setTimeout(()=>sendMessage(m),100); }} style={{ marginTop:10, background:"none", border:"1px solid #21a850", color:"#4ade80", borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
                  Diagnose this job with AI →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ background:"#0d1117", textAlign:"center", fontSize:9, color:"#1a2e1a", padding:"5px 0 6px", letterSpacing:1, flexShrink:0 }}>
        NOT A SUBSTITUTE FOR PROFESSIONAL JUDGMENT • VERIFY ALL READINGS IN THE FIELD • FOLLOW SAFETY PROTOCOLS
      </div>
    </div>
  );
}