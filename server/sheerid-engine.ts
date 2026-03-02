import puppeteer, { type Browser } from "puppeteer-core";
import { execSync } from "child_process";
import * as fs from "fs";
import * as crypto from "crypto";

const SHEERID_BASE_URL = "https://services.sheerid.com";
const MY_SHEERID_URL = "https://my.sheerid.com";

interface ToolConfig {
  programId: string;
  verifyType: "student" | "teacher" | "k12teacher";
  collectStep: string;
  usaOnly?: boolean;
}

export const TOOL_CONFIGS: Record<string, ToolConfig> = {
  "spotify-verify": {
    programId: "67c8c14f5f17a83b745e3f82",
    verifyType: "student",
    collectStep: "collectStudentPersonalInfo",
  },
  "youtube-verify": {
    programId: "67c8c14f5f17a83b745e3f82",
    verifyType: "student",
    collectStep: "collectStudentPersonalInfo",
  },
  "one-verify": {
    programId: "67c8c14f5f17a83b745e3f82",
    verifyType: "student",
    collectStep: "collectStudentPersonalInfo",
    usaOnly: true,
  },
  "boltnew-verify": {
    programId: "68cc6a2e64f55220de204448",
    verifyType: "teacher",
    collectStep: "collectTeacherPersonalInfo",
  },
  "canva-teacher": {
    programId: "68cc6a2e64f55220de204448",
    verifyType: "teacher",
    collectStep: "collectTeacherPersonalInfo",
  },
  "k12-verify": {
    programId: "68d47554aa292d20b9bec8f7",
    verifyType: "k12teacher",
    collectStep: "collectTeacherPersonalInfo",
  },
  "veterans-verify": {
    programId: "67c8c14f5f17a83b745e3f82",
    verifyType: "student",
    collectStep: "collectStudentPersonalInfo",
  },
  "veterans-extension": {
    programId: "67c8c14f5f17a83b745e3f82",
    verifyType: "student",
    collectStep: "collectStudentPersonalInfo",
  },
};

interface PSUSchool {
  id: number;
  idExtended: string;
  name: string;
  domain: string;
  country: string;
}

const PSU_SCHOOLS: PSUSchool[] = [
  { id: 2565, idExtended: "2565", name: "Pennsylvania State University-Main Campus", domain: "PSU.EDU", country: "US" },
  { id: 651379, idExtended: "651379", name: "Pennsylvania State University-World Campus", domain: "PSU.EDU", country: "US" },
  { id: 8387, idExtended: "8387", name: "Pennsylvania State University-Penn State Harrisburg", domain: "PSU.EDU", country: "US" },
  { id: 8382, idExtended: "8382", name: "Pennsylvania State University-Penn State Altoona", domain: "PSU.EDU", country: "US" },
  { id: 8396, idExtended: "8396", name: "Pennsylvania State University-Penn State Berks", domain: "PSU.EDU", country: "US" },
  { id: 8379, idExtended: "8379", name: "Pennsylvania State University-Penn State Brandywine", domain: "PSU.EDU", country: "US" },
  { id: 2560, idExtended: "2560", name: "Pennsylvania State University-College of Medicine", domain: "PSU.EDU", country: "US" },
  { id: 650600, idExtended: "650600", name: "Pennsylvania State University-Penn State Lehigh Valley", domain: "PSU.EDU", country: "US" },
  { id: 8388, idExtended: "8388", name: "Pennsylvania State University-Penn State Hazleton", domain: "PSU.EDU", country: "US" },
  { id: 8394, idExtended: "8394", name: "Pennsylvania State University-Penn State Worthington Scranton", domain: "PSU.EDU", country: "US" },
];

interface K12School {
  id: number;
  idExtended: string;
  name: string;
  country: string;
}

const K12_SCHOOLS: K12School[] = [
  { id: 155694, idExtended: "155694", name: "Stuyvesant High School", country: "US" },
  { id: 156251, idExtended: "156251", name: "Bronx High School Of Science", country: "US" },
  { id: 157582, idExtended: "157582", name: "Brooklyn Technical High School", country: "US" },
  { id: 3521141, idExtended: "3521141", name: "Walter Payton College Preparatory High School", country: "US" },
  { id: 3704245, idExtended: "3704245", name: "Thomas Jefferson High School For Science And Technology", country: "US" },
  { id: 3539252, idExtended: "3539252", name: "Gretchen Whitney High School", country: "US" },
  { id: 262338, idExtended: "262338", name: "Lowell High School (San Francisco)", country: "US" },
  { id: 3536914, idExtended: "3536914", name: "BASIS Scottsdale", country: "US" },
  { id: 155846, idExtended: "155846", name: "KIPP Academy Charter School (Bronx)", country: "US" },
  { id: 219471, idExtended: "219471", name: "Northside College Preparatory High School", country: "US" },
  { id: 262370, idExtended: "262370", name: "Palo Alto High School", country: "US" },
  { id: 185742, idExtended: "185742", name: "Berkeley Preparatory School", country: "US" },
];

function getRandomPSUSchool(): PSUSchool {
  return PSU_SCHOOLS[Math.floor(Math.random() * PSU_SCHOOLS.length)];
}

function getRandomK12School(): K12School {
  return K12_SCHOOLS[Math.floor(Math.random() * K12_SCHOOLS.length)];
}

export function parseVerificationId(url: string): string | null {
  const match = url.match(/verificationId=([a-f0-9-]+)/i);
  if (match) return match[1].replace(/-/g, "");
  return null;
}

export function parseExternalUserId(url: string): string | null {
  const match = url.match(/externalUserId=([^&]+)/i);
  if (match) return match[1];
  return null;
}

function generateDeviceFingerprint(): string {
  return crypto.randomBytes(16).toString("hex");
}

function generateRandomName(): { firstName: string; lastName: string } {
  const firstNames = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
    "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Lisa", "Daniel", "Nancy",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Dorothy", "Andrew", "Kimberly", "Paul", "Emily", "Joshua", "Donna",
    "Kenneth", "Michelle", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
    "Timothy", "Deborah", "Ronald", "Stephanie", "Edward", "Rebecca", "Jason", "Sharon",
    "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
    "Nicholas", "Angela", "Eric", "Shirley", "Jonathan", "Anna", "Stephen", "Brenda",
    "Larry", "Pamela", "Justin", "Emma", "Scott", "Nicole", "Brandon", "Helen",
    "Benjamin", "Samantha", "Samuel", "Katherine", "Raymond", "Christine", "Gregory", "Debra",
    "Frank", "Rachel", "Alexander", "Carolyn", "Patrick", "Janet", "Jack", "Catherine",
    "Dennis", "Maria", "Jerry", "Heather", "Tyler", "Diane", "Aaron", "Ruth",
    "Nathan", "Julie", "Henry", "Olivia", "Peter", "Joyce", "Douglas", "Virginia",
    "Adam", "Victoria", "Zachary", "Kelly", "Harold", "Lauren", "Arthur", "Christina",
    "Dylan", "Joan", "Ethan", "Evelyn", "Logan", "Judith", "Christian", "Megan",
    "Gabriel", "Andrea", "Austin", "Cheryl", "Elijah", "Hannah", "Owen", "Jacqueline",
    "Caleb", "Martha", "Connor", "Gloria", "Aiden", "Teresa", "Luke", "Ann",
    "Isaac", "Sara", "Mason", "Madison", "Liam", "Frances", "Noah", "Kathryn",
    "Evan", "Janice", "Jordan", "Jean", "Cole", "Abigail", "Cameron", "Alice",
  ];
  const lastNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill",
    "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell",
    "Mitchell", "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz",
    "Parker", "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales",
    "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson",
    "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward",
    "Richardson", "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray",
    "Mendoza", "Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel",
    "Myers", "Long", "Ross", "Foster", "Jimenez", "Powell", "Jenkins", "Perry",
    "Russell", "Sullivan", "Bell", "Coleman", "Butler", "Henderson", "Barnes", "Gonzales",
    "Fisher", "Vasquez", "Simmons", "Griffin", "McDaniel", "Arnold", "Ferguson", "Burns",
  ];

  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  return { firstName: pick(firstNames), lastName: pick(lastNames) };
}

function generateEmail(firstName: string, lastName: string, domain: string = "psu.edu"): string {
  const digitCount = Math.random() < 0.5 ? 3 : 4;
  const digits = Array.from({ length: digitCount }, () => Math.floor(Math.random() * 10)).join("");
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${digits}@${domain.toLowerCase()}`;
}

function generateBirthDate(type: "student" | "teacher" | "k12teacher"): string {
  if (type === "teacher" || type === "k12teacher") {
    const year = 1970 + Math.floor(Math.random() * 30);
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const year = 2000 + Math.floor(Math.random() * 6);
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateStudentId(): string {
  return `${Math.floor(100000000 + Math.random() * 900000000)}`;
}

function generatePsuId(): string {
  return `9${Math.floor(10000000 + Math.random() * 90000000)}`;
}

function generateNewRelicHeaders(): Record<string, string> {
  const traceId = crypto.randomUUID().replace(/-/g, "");
  const spanId = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
  const timestamp = Date.now();
  const payload = {
    v: [0, 1],
    d: { ty: "Browser", ac: "364029", ap: "120719994", id: spanId, tr: traceId, ti: timestamp },
  };
  return {
    newrelic: Buffer.from(JSON.stringify(payload)).toString("base64"),
    traceparent: `00-${traceId}-${spanId}-01`,
    tracestate: `364029@nr=0-1-364029-120719994-${spanId}----${timestamp}`,
  };
}

function getSheerIdHeaders(): Record<string, string> {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  ];
  return {
    "accept": "application/json",
    "content-type": "application/json",
    "user-agent": userAgents[Math.floor(Math.random() * userAgents.length)],
    "clientversion": "2.193.0",
    "clientname": "jslib",
    "x-sheerid-target-platform": "web",
    ...generateNewRelicHeaders(),
  };
}

let _chromiumPath: string | null = null;

function findChromium(): string {
  if (_chromiumPath) return _chromiumPath;

  const envPaths = [
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
  ].filter(Boolean) as string[];

  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      _chromiumPath = p;
      return p;
    }
  }

  const whichCommands = [
    "which chromium",
    "which chromium-browser",
    "which google-chrome-stable",
    "which google-chrome",
  ];

  for (const cmd of whichCommands) {
    try {
      const result = execSync(cmd + " 2>/dev/null", { encoding: "utf8", timeout: 3000 }).trim();
      if (result && fs.existsSync(result)) {
        _chromiumPath = result;
        return result;
      }
    } catch {}
  }

  throw new Error("Could not find Chromium binary. Install the 'chromium' system dependency.");
}

let _browser: Browser | null = null;
let _browserLaunchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) {
    return _browser;
  }
  if (_browserLaunchPromise) {
    return _browserLaunchPromise;
  }
  const executablePath = findChromium();
  _browserLaunchPromise = puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-extensions",
      "--disable-setuid-sandbox",
      "--single-process",
    ],
  });
  _browser = await _browserLaunchPromise;
  _browserLaunchPromise = null;
  _browser.on("disconnected", () => {
    _browser = null;
  });
  return _browser;
}

process.on("exit", () => {
  if (_browser) {
    _browser.close().catch(() => {});
  }
});
process.on("SIGINT", () => {
  if (_browser) {
    _browser.close().catch(() => {});
  }
  process.exit(0);
});

async function htmlToScreenshot(html: string, width: number, height: number): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await new Promise(r => setTimeout(r, 300));
    const screenshot = await page.screenshot({ type: "jpeg", quality: 72, fullPage: true });
    return Buffer.from(screenshot);
  } finally {
    await page.close();
  }
}

export async function searchOrganization(
  verificationId: string,
  searchTerm: string
): Promise<{ id: number; name: string } | null> {
  try {
    const url = `${SHEERID_BASE_URL}/rest/v2/verification/${verificationId}/organization?searchTerm=${encodeURIComponent(searchTerm)}`;
    const { data, status } = await sheeridRequest("GET", url);
    if (status === 200 && Array.isArray(data) && data.length > 0) {
      return { id: data[0].id, name: data[0].name };
    }
    return null;
  } catch {
    return null;
  }
}

function generateTranscriptHtml(firstName: string, lastName: string, universityName: string, birthDate: string): string {
  const name = `${firstName} ${lastName}`;
  const now = new Date();
  const dateIssued = now.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const semester = currentMonth >= 0 && currentMonth <= 4 ? "SPRING" : currentMonth >= 5 && currentMonth <= 7 ? "SUMMER" : "FALL";
  const studentId = `STU${Math.floor(100000 + Math.random() * 900000)}`;
  const validThru = `${currentYear}-${currentYear + 1}`;

  const courses = [
    { code: "CS 101", title: "Intro to Computer Science", credits: "4.0", grade: "A" },
    { code: "MATH 201", title: "Calculus I", credits: "3.0", grade: "A-" },
    { code: "ENG 102", title: "Academic Writing", credits: "3.0", grade: "B+" },
    { code: "PHYS 150", title: "Physics for Engineers", credits: "4.0", grade: "A" },
    { code: "HIST 110", title: "World History", credits: "3.0", grade: "A" },
  ];

  const courseRows = courses.map(c =>
    `<tr><td>${c.code}</td><td>${c.title}</td><td style="text-align:center">${c.credits}</td><td style="text-align:center">${c.grade}</td></tr>`
  ).join("\n");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; color: #000; }
.page { width: 850px; height: 1100px; padding: 50px; box-sizing: border-box; }
.header { text-align: center; margin-bottom: 10px; }
.school-name { font-size: 28px; font-weight: bold; color: #000; text-transform: uppercase; letter-spacing: 1px; }
.doc-title { font-size: 22px; color: #333; margin-top: 8px; }
.line { border-top: 2px solid #000; margin: 15px 50px; }
.info-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 16px; }
.info-row .label { color: #000; }
.status-box { background: #f0f0f0; text-align: center; padding: 12px; margin: 20px 0; font-size: 16px; font-weight: bold; color: #006400; }
table { width: 100%; border-collapse: collapse; margin: 15px 0; }
th { text-align: left; font-size: 15px; font-weight: bold; padding: 8px 4px; border-bottom: 1px solid #000; }
td { font-size: 15px; padding: 8px 4px; }
.summary { display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; margin-top: 10px; }
.footer { text-align: center; font-size: 13px; color: #666; margin-top: 40px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="school-name">${universityName}</div>
    <div class="doc-title">OFFICIAL ACADEMIC TRANSCRIPT</div>
  </div>
  <div class="line"></div>
  <div class="info-row"><span class="label">Student Name: ${name}</span><span>Student ID: ${studentId}</span></div>
  <div class="info-row"><span class="label">Date of Birth: ${birthDate}</span><span>Date Issued: ${dateIssued}</span></div>
  <div class="status-box">CURRENT STATUS: ENROLLED (${semester} ${currentYear})</div>
  <table>
    <tr><th>Course Code</th><th>Course Title</th><th style="text-align:center">Credits</th><th style="text-align:center">Grade</th></tr>
    ${courseRows}
  </table>
  <div class="line"></div>
  <div class="summary"><span>Cumulative GPA: 3.85</span><span>Academic Standing: Good</span></div>
  <div class="info-row" style="margin-top:15px"><span>Major: Computer Science</span><span>Valid: ${validThru}</span></div>
  <div class="footer">This document is electronically generated and valid without signature.</div>
</div>
</body>
</html>`;
}

function generateStudentIdHtml(firstName: string, lastName: string, universityName: string, birthDate: string): string {
  const name = `${firstName} ${lastName}`;
  const studentId = `${Math.floor(10000000 + Math.random() * 90000000)}`;
  const currentYear = new Date().getFullYear();
  const issueDate = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const expDate = `05/31/${currentYear + 1}`;
  const initials = universityName.split(/\s+/).filter(w => w.length > 2 && w[0] === w[0].toUpperCase()).map(w => w[0]).join("").slice(0, 3) || "U";
  const majors = ["Computer Science", "Business Administration", "Biology", "Psychology", "Engineering", "Mathematics", "English Literature", "Political Science", "Economics", "Nursing"];
  const major = majors[Math.floor(Math.random() * majors.length)];

  const hue = Math.floor(Math.random() * 360);
  const brandColor = `hsl(${hue}, 65%, 30%)`;
  const brandLight = `hsl(${hue}, 55%, 45%)`;
  const brandBg = `hsl(${hue}, 30%, 95%)`;

  const photoSilhouette = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="120" height="150"><rect width="120" height="150" fill="#e2e8f0" rx="4"/><circle cx="60" cy="52" r="28" fill="#94a3b8"/><ellipse cx="60" cy="135" rx="45" ry="40" fill="#94a3b8"/></svg>`;
  const photoDataUri = `data:image/svg+xml;base64,${Buffer.from(photoSilhouette).toString('base64')}`;

  const sigName = ["Dr. James Mitchell", "Dr. Sarah Thompson", "Dr. Robert Chen", "Dr. Maria Garcia", "Dr. William Park"][Math.floor(Math.random() * 5)];
  const sigTitle = "Registrar";

  const barcodeLines = Array.from({ length: 60 }, () => {
    const w = Math.random() > 0.5 ? 3 : 1;
    return `<div style="display:inline-block;width:${w}px;height:35px;background:#000;margin-right:${Math.random() > 0.4 ? 2 : 1}px"></div>`;
  }).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body { margin: 0; padding: 0; background: #fff; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; }
.card { width: 680px; height: 430px; background: #fff; position: relative; border: 1px solid #ccc; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
.top-band { height: 6px; background: linear-gradient(90deg, ${brandColor}, ${brandLight}, ${brandColor}); }
.header { display: flex; align-items: center; padding: 14px 24px 8px; gap: 14px; }
.logo-circle { width: 52px; height: 52px; border-radius: 50%; background: ${brandColor}; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 18px; font-family: Georgia, serif; flex-shrink: 0; border: 2px solid ${brandLight}; }
.header-text { flex: 1; }
.uni-name { font-size: 16px; font-weight: 700; color: ${brandColor}; letter-spacing: 0.5px; line-height: 1.2; }
.card-type { font-size: 11px; color: ${brandLight}; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-top: 2px; }
.divider { height: 2px; background: linear-gradient(90deg, ${brandColor}, ${brandLight}, transparent); margin: 0 24px; }
.body { display: flex; padding: 14px 24px; gap: 20px; }
.photo-area { width: 125px; flex-shrink: 0; }
.photo-frame { width: 125px; height: 155px; border: 2px solid ${brandColor}; border-radius: 6px; overflow: hidden; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
.photo-frame img { width: 120px; height: 150px; object-fit: cover; }
.info-area { flex: 1; padding-top: 2px; }
.field { margin-bottom: 7px; }
.field-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
.field-value { font-size: 14px; color: #1a1a1a; font-weight: 600; margin-top: 1px; }
.field-value.name-val { font-size: 18px; font-weight: 700; color: ${brandColor}; }
.sig-area { margin-top: 10px; display: flex; align-items: flex-end; gap: 15px; }
.signature { font-family: 'Brush Script MT', 'Segoe Script', cursive; font-size: 22px; color: #333; transform: rotate(-3deg); border-bottom: 1px solid #999; padding-bottom: 2px; }
.sig-info { font-size: 8px; color: #888; line-height: 1.4; }
.bottom-section { position: absolute; bottom: 0; left: 0; right: 0; height: 65px; background: ${brandBg}; border-top: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; }
.barcode { display: flex; align-items: center; height: 35px; }
.hologram { width: 48px; height: 48px; border-radius: 50%; background: conic-gradient(from 0deg, ${brandColor}22, ${brandLight}44, #ffd70044, ${brandColor}22); border: 1px solid ${brandLight}66; display: flex; align-items: center; justify-content: center; font-size: 7px; color: ${brandColor}; font-weight: 700; text-align: center; line-height: 1.2; }
.watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 80px; color: ${brandColor}08; font-weight: 900; letter-spacing: 8px; pointer-events: none; white-space: nowrap; }
</style></head>
<body>
<div class="card">
  <div class="top-band"></div>
  <div class="header">
    <div class="logo-circle">${initials}</div>
    <div class="header-text">
      <div class="uni-name">${universityName}</div>
      <div class="card-type">Student Identification Card</div>
    </div>
  </div>
  <div class="divider"></div>
  <div class="body">
    <div class="photo-area">
      <div class="photo-frame"><img src="${photoDataUri}" alt="Photo" /></div>
    </div>
    <div class="info-area">
      <div class="field"><div class="field-label">Full Name</div><div class="field-value name-val">${name}</div></div>
      <div class="field"><div class="field-label">Student ID</div><div class="field-value">${studentId}</div></div>
      <div class="field" style="display:flex;gap:30px">
        <div><div class="field-label">Date of Birth</div><div class="field-value">${birthDate}</div></div>
        <div><div class="field-label">Major</div><div class="field-value">${major}</div></div>
      </div>
      <div class="field" style="display:flex;gap:30px">
        <div><div class="field-label">Issued</div><div class="field-value">${issueDate}</div></div>
        <div><div class="field-label">Expires</div><div class="field-value">${expDate}</div></div>
      </div>
      <div class="sig-area">
        <div class="signature">${sigName}</div>
        <div class="sig-info">${sigTitle}<br>${universityName}</div>
      </div>
    </div>
  </div>
  <div class="bottom-section">
    <div class="barcode">${barcodeLines}</div>
    <div class="hologram">VALID<br>ID</div>
  </div>
  <div class="watermark">${initials}</div>
</div>
</body></html>`;
}

function generateTeacherCardHtml(firstName: string, lastName: string, psuId: string): string {
  const name = `${firstName} ${lastName}`;
  const timestamp = Date.now();
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<style>
:root { --psu-blue: #1E407C; --psu-light-blue: #96BEE6; --text-dark: #333; }
body { background-color: #e0e0e0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
.card-container { width: 320px; height: 504px; background-color: white; border-radius: 15px; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.3); overflow: hidden; display: flex; flex-direction: column; align-items: center; }
.card-header { width: 100%; height: 90px; display: flex; justify-content: center; align-items: center; margin-top: 10px; }
.psu-brand { display: flex; align-items: center; gap: 12px; }
.psu-shield { width: 50px; height: 50px; background: var(--psu-blue); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
.psu-text { color: var(--psu-blue); }
.psu-text .main { font-size: 16px; font-weight: 700; letter-spacing: 1px; }
.psu-text .sub { font-size: 10px; color: #666; margin-top: 2px; }
.photo-area { width: 140px; height: 170px; background: linear-gradient(135deg, #e8edf2 0%, #d0d8e4 100%); border-radius: 10px; margin: 15px 0; display: flex; align-items: center; justify-content: center; border: 2px solid #ccd; }
.photo-icon { font-size: 60px; color: #aab; }
.name-section { text-align: center; margin: 5px 0; }
.name { font-size: 18px; font-weight: 700; color: var(--psu-blue); }
.title { font-size: 11px; color: #888; margin-top: 4px; }
.id-section { background: var(--psu-blue); color: white; width: 90%; padding: 8px 0; border-radius: 6px; text-align: center; margin: 10px 0; }
.id-label { font-size: 9px; opacity: 0.8; }
.id-number { font-size: 16px; font-weight: 700; letter-spacing: 2px; margin-top: 2px; }
.card-footer { position: absolute; bottom: 0; width: 100%; height: 40px; background: linear-gradient(135deg, var(--psu-blue), var(--psu-light-blue)); display: flex; align-items: center; justify-content: center; }
.footer-text { color: white; font-size: 9px; letter-spacing: 1px; }
</style></head>
<body>
<div class="card-container">
  <div class="card-header"><div class="psu-brand"><div class="psu-shield">PSU</div><div class="psu-text"><div class="main">PENN STATE</div><div class="sub">UNIVERSITY</div></div></div></div>
  <div class="photo-area"><div class="photo-icon">👤</div></div>
  <div class="name-section"><div class="name">${name}</div><div class="title">Faculty Member</div></div>
  <div class="id-section"><div class="id-label">EMPLOYEE ID</div><div class="id-number">${psuId}</div></div>
  <div class="card-footer"><span class="footer-text">PENN STATE UNIVERSITY • FACULTY ID+ CARD</span></div>
</div>
</body></html>`;
}

function generateEmploymentVerificationHtml(firstName: string, lastName: string, universityName: string): string {
  const name = `${firstName} ${lastName}`;
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const titles = ["Associate Professor", "Assistant Professor", "Lecturer", "Instructor", "Adjunct Professor", "Teaching Professor"];
  const departments = ["College of Engineering", "Department of Computer Science and Engineering", "Eberly College of Science", "College of Education", "Smeal College of Business"];
  const title = titles[Math.floor(Math.random() * titles.length)];
  const dept = departments[Math.floor(Math.random() * departments.length)];
  const initials = universityName.split(/\s+/).filter(w => w.length > 2 && w[0] === w[0].toUpperCase()).map(w => w[0]).join("").slice(0, 3) || "U";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600;700&display=swap');
body { font-family: 'Open Sans', 'Helvetica Neue', Arial, sans-serif; background: #fff; margin: 0; padding: 0; color: #333; }
.page { width: 8.5in; min-height: 11in; margin: 0 auto; padding: 0.75in 1in; box-sizing: border-box; position: relative; }
.header { display: flex; align-items: center; padding-bottom: 20px; border-bottom: 3px solid #1a3a5c; margin-bottom: 30px; }
.logo-mark { width: 65px; height: 65px; background: #1a3a5c; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-family: 'Merriweather', Georgia, serif; font-size: 24px; font-weight: 700; margin-right: 20px; flex-shrink: 0; }
.header-text { flex: 1; }
.uni-name { font-family: 'Merriweather', Georgia, serif; font-size: 20px; font-weight: 700; color: #1a3a5c; margin: 0; line-height: 1.3; }
.dept-name { font-size: 13px; color: #555; margin-top: 4px; }
.doc-date { font-size: 12px; color: #555; margin-bottom: 25px; }
.doc-title { font-family: 'Merriweather', Georgia, serif; font-size: 18px; font-weight: 700; text-align: center; color: #1a3a5c; margin: 25px 0; padding: 12px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; text-transform: uppercase; letter-spacing: 2px; }
.body-text { font-size: 12px; line-height: 1.8; margin-bottom: 20px; }
.info-table { width: 100%; border-collapse: collapse; margin: 25px 0; }
.info-table tr { border-bottom: 1px solid #eee; }
.info-table td { padding: 10px 8px; font-size: 12px; vertical-align: top; }
.info-table td:first-child { width: 35%; color: #555; font-weight: 600; }
.info-table td:last-child { color: #111; font-weight: 600; }
.status-badge { display: inline-block; background: #d4edda; color: #155724; padding: 3px 12px; border-radius: 3px; font-size: 11px; font-weight: 700; }
.seal-area { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; }
.signature-block { font-size: 11px; line-height: 1.6; }
.signature-line { width: 200px; border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; }
.seal { width: 80px; height: 80px; border: 3px solid #1a3a5c; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Merriweather', Georgia, serif; font-size: 10px; text-align: center; color: #1a3a5c; font-weight: 700; line-height: 1.2; padding: 8px; box-sizing: border-box; }
.footer { position: absolute; bottom: 0.5in; left: 1in; right: 1in; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
.doc-id { font-family: 'Courier New', monospace; font-size: 9px; color: #aaa; }
</style></head>
<body>
<div class="page">
  <div class="header"><div class="logo-mark">${initials}</div><div class="header-text"><div class="uni-name">${universityName}</div><div class="dept-name">Human Resources Department</div></div></div>
  <div class="doc-date">${dateStr}</div>
  <div class="body-text">To Whom It May Concern:</div>
  <div class="body-text">This letter confirms the employment status of the individual listed below at <strong>${universityName}</strong>. This verification has been issued by the Human Resources Department and reflects official employment records as of the date shown above.</div>
  <div class="doc-title">Employment Verification</div>
  <table class="info-table">
    <tr><td>Employee Name:</td><td>${name}</td></tr>
    <tr><td>Job Title:</td><td>${title}</td></tr>
    <tr><td>Department:</td><td>${dept}</td></tr>
    <tr><td>Employment Status:</td><td><span class="status-badge">Active - Full Time</span></td></tr>
    <tr><td>Employment Type:</td><td>Faculty</td></tr>
    <tr><td>Start Date:</td><td>August 15, 2018</td></tr>
    <tr><td>FTE:</td><td>1.00 (100%)</td></tr>
  </table>
  <div class="body-text">The individual named above is currently employed as a member of the faculty at this institution. This document is provided for employment verification purposes only.</div>
  <div class="seal-area"><div class="signature-block"><div class="signature-line">Director of Human Resources<br>${universityName}</div></div><div class="seal">OFFICIAL<br>HR<br>SEAL</div></div>
  <div class="footer"><span class="doc-id">Document ID: EMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}</span>&nbsp;|&nbsp; Generated: ${dateStr} &nbsp;|&nbsp; Valid for 90 days from date of issue</div>
</div>
</body></html>`;
}

function generateTeacherBadgeHtml(firstName: string, lastName: string, organizationName: string): string {
  const teacherId = `T${Math.floor(10000 + Math.random() * 90000)}`;
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<style>
body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; }
.badge { width: 650px; height: 400px; background: #fff; position: relative; }
.header-bar { background: #228B22; height: 50px; display: flex; align-items: center; justify-content: center; }
.header-bar span { color: #fff; font-size: 22px; font-weight: bold; letter-spacing: 1px; }
.school-name { text-align: center; color: #228B22; font-size: 16px; font-weight: bold; margin: 16px 0 10px; }
.content { display: flex; padding: 0 25px; }
.photo-box { width: 100px; height: 120px; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 16px; margin-right: 20px; flex-shrink: 0; }
.info { padding-top: 5px; }
.info div { font-size: 16px; color: #333; margin-bottom: 5px; }
.valid { color: #666; font-size: 12px; margin-top: 15px; }
.footer-bar { background: #228B22; height: 35px; position: absolute; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: center; }
.footer-bar span { color: #fff; font-size: 12px; }
.barcode { position: absolute; bottom: 40px; left: 25px; right: 25px; height: 20px; background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 5px); }
</style></head>
<body>
<div class="badge">
  <div class="header-bar"><span>STAFF IDENTIFICATION</span></div>
  <div class="school-name">${organizationName}</div>
  <div class="content">
    <div class="photo-box">PHOTO</div>
    <div class="info">
      <div>Name: ${firstName} ${lastName}</div>
      <div>ID: ${teacherId}</div>
      <div>Position: Teacher</div>
      <div>Department: Education</div>
      <div>Status: Active</div>
      <div class="valid">Valid: ${currentYear}-${currentYear + 1} School Year</div>
    </div>
  </div>
  <div class="barcode"></div>
  <div class="footer-bar"><span>Property of School District</span></div>
</div>
</body></html>`;
}

async function generateDocumentImages(
  firstName: string,
  lastName: string,
  verifyType: "student" | "teacher" | "k12teacher",
  organizationName: string,
  birthDate?: string
): Promise<Array<{ fileName: string; data: Buffer; mimeType: string }>> {
  if (verifyType === "student") {
    const html = generateStudentIdHtml(firstName, lastName, organizationName, birthDate || "2003-01-15");
    const data = await htmlToScreenshot(html, 680, 430);
    return [{ fileName: "student_card.jpg", data, mimeType: "image/jpeg" }];
  } else if (verifyType === "teacher") {
    const psuId = generatePsuId();
    const cardHtml = generateTeacherCardHtml(firstName, lastName, psuId);
    const letterHtml = generateEmploymentVerificationHtml(firstName, lastName, organizationName);
    const [cardData, letterData] = await Promise.all([
      htmlToScreenshot(cardHtml, 700, 1100),
      htmlToScreenshot(letterHtml, 1300, 1600),
    ]);
    return [
      { fileName: "teacher_id.jpg", data: cardData, mimeType: "image/jpeg" },
      { fileName: "employment_letter.jpg", data: letterData, mimeType: "image/jpeg" },
    ];
  } else {
    const badgeHtml = generateTeacherBadgeHtml(firstName, lastName, organizationName);
    const badgeData = await htmlToScreenshot(badgeHtml, 650, 400);
    return [
      { fileName: "teacher_badge.jpg", data: badgeData, mimeType: "image/jpeg" },
    ];
  }
}

interface VerificationStep {
  step: string;
  status: number;
  data: any;
}

interface VerificationResult {
  success: boolean;
  pending: boolean;
  message: string;
  verificationId: string;
  redirectUrl?: string;
  rewardCode?: string;
  currentStep?: string;
  errorIds?: string[];
  steps: VerificationStep[];
  documentImages?: Array<{ fileName: string; base64: string; mimeType: string }>;
}

async function sheeridRequest(method: string, url: string, body?: any): Promise<{ data: any; status: number }> {
  const headers = getSheerIdHeaders();
  const options: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(30000),
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  let data: any;
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { data, status: response.status };
}

async function uploadToS3(uploadUrl: string, data: Buffer, mimeType: string): Promise<boolean> {
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: data,
      signal: AbortSignal.timeout(60000),
    });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

async function createVerificationSession(programId: string, installPageUrl?: string): Promise<string | null> {
  try {
    const body: any = { programId };
    if (installPageUrl) {
      body.installPageUrl = installPageUrl;
    }
    const { data, status } = await sheeridRequest("POST", `${MY_SHEERID_URL}/rest/v2/verification/`, body);
    if (status === 200 && data?.verificationId) {
      return data.verificationId;
    }
    return null;
  } catch {
    return null;
  }
}

export async function runVerification(params: {
  toolId: string;
  verificationId: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  organizationId: number;
  organizationName: string;
  url: string;
}): Promise<VerificationResult> {
  const { toolId, verificationId, firstName, lastName, email, birthDate, organizationId, organizationName, url } = params;

  const config = TOOL_CONFIGS[toolId];
  if (!config) {
    return { success: false, pending: false, message: `No configuration found for tool: ${toolId}`, verificationId, steps: [] };
  }

  const steps: VerificationStep[] = [];
  const deviceFingerprint = generateDeviceFingerprint();
  const externalUserId = parseExternalUserId(url);

  let school: { id: number; idExtended: string; name: string };

  if (config.verifyType === "k12teacher") {
    const k12 = getRandomK12School();
    school = { id: k12.id, idExtended: k12.idExtended, name: k12.name };
  } else if (config.usaOnly) {
    school = { id: PSU_SCHOOLS[0].id, idExtended: PSU_SCHOOLS[0].idExtended, name: PSU_SCHOOLS[0].name };
  } else {
    const psu = getRandomPSUSchool();
    school = { id: psu.id, idExtended: psu.idExtended, name: psu.name };
  }

  try {
    const checkResp = await sheeridRequest(
      "GET",
      `${SHEERID_BASE_URL}/rest/v2/verification/${verificationId}`
    );
    steps.push({ step: "checkVerificationState", status: checkResp.status, data: checkResp.data });

    let currentStep = checkResp.data?.currentStep || "";

    if (currentStep === "success") {
      return {
        success: true, pending: false,
        message: "Verification already approved",
        verificationId, currentStep, steps,
      };
    }
    if (currentStep === "pending") {
      return {
        success: true, pending: true,
        message: "Verification already pending review",
        verificationId, currentStep, steps,
      };
    }
    if (currentStep === "error") {
      const errorIds = checkResp.data?.errorIds || [];
      return {
        success: false, pending: false,
        message: `Verification in error state: ${errorIds.join(", ") || checkResp.data?.systemErrorMessage || "unknown"}`,
        verificationId, errorIds, currentStep, steps,
      };
    }

    if (currentStep === "emailLoop") {
      return {
        success: false, pending: false,
        message: "Email verification loop triggered - need new verification link",
        verificationId, currentStep, steps,
      };
    }

    const validSteps = [config.collectStep, "docUpload", "sso"];
    if (!validSteps.includes(currentStep)) {
      return {
        success: false, pending: false,
        message: `Verification at unexpected step '${currentStep}' - may need a new verification link`,
        verificationId, currentStep, steps,
      };
    }

    const documents = await generateDocumentImages(firstName, lastName, config.verifyType, school.name, birthDate);
    steps.push({ step: "generateDocument", status: 200, data: { count: documents.length, sizes: documents.map(d => d.data.length) } });

    const docImagesBase64 = documents.map(d => ({
      fileName: d.fileName,
      base64: d.data.toString("base64"),
      mimeType: d.mimeType,
    }));

    if (currentStep === config.collectStep) {
      const personalInfoBody: any = {
        firstName,
        lastName,
        birthDate: config.verifyType === "teacher" ? "" : birthDate,
        email,
        phoneNumber: "",
        country: "US",
        organization: {
          id: school.id,
          idExtended: school.idExtended,
          name: school.name,
        },
        deviceFingerprintHash: deviceFingerprint,
        locale: "en-US",
        metadata: {} as any,
      };

      if (config.verifyType === "student") {
        personalInfoBody.metadata = {
          marketConsentValue: false,
          verificationId,
          refererUrl: `${SHEERID_BASE_URL}/verify/${config.programId}/?verificationId=${verificationId}`,
          flags: '{"collect-info-step-email-first":"default","doc-upload-considerations":"default","doc-upload-may24":"default","doc-upload-redesign-use-legacy-message-keys":false,"docUpload-assertion-checklist":"default","font-size":"default","include-cvec-field-france-student":"not-labeled-optional"}',
          submissionOptIn: "By submitting the personal information above, I acknowledge that my personal information is being collected under the privacy policy of the business from which I am seeking a discount",
        };
      } else if (config.verifyType === "teacher") {
        const extUserId = externalUserId || `${Math.floor(1000000 + Math.random() * 9000000)}`;
        personalInfoBody.externalUserId = extUserId;
        personalInfoBody.metadata = {
          marketConsentValue: true,
          refererUrl: url,
          externalUserId: extUserId,
          flags: '{"doc-upload-considerations":"default","doc-upload-may24":"default","doc-upload-redesign-use-legacy-message-keys":false,"docUpload-assertion-checklist":"default","include-cvec-field-france-student":"not-labeled-optional","org-search-overlay":"default","org-selected-display":"default"}',
          submissionOptIn: "By submitting the personal information above, I acknowledge that my personal information is being collected under the privacy policy of the business from which I am seeking a discount",
        };
      } else {
        personalInfoBody.metadata = {
          marketConsentValue: false,
          submissionOptIn: "By submitting the personal information above, I acknowledge that my personal information is being collected under the privacy policy of the business from which I am seeking a discount",
        };
      }

      const step2 = await sheeridRequest(
        "POST",
        `${SHEERID_BASE_URL}/rest/v2/verification/${verificationId}/step/${config.collectStep}`,
        personalInfoBody
      );
      steps.push({ step: config.collectStep, status: step2.status, data: step2.data });

      if (step2.status !== 200) {
        return {
          success: false, pending: false,
          message: `Personal info submission failed (HTTP ${step2.status}): ${JSON.stringify(step2.data)}`,
          verificationId, steps,
        };
      }

      if (step2.data?.currentStep === "error") {
        const errorIds = step2.data.errorIds || ["Unknown error"];
        return {
          success: false, pending: false,
          message: `SheerID error: ${errorIds.join(", ")}`,
          verificationId, errorIds, steps,
        };
      }

      currentStep = step2.data?.currentStep || "";

      if (currentStep === "success") {
        return {
          success: true, pending: false,
          message: "Verification approved instantly (auto-pass)",
          verificationId, currentStep,
          redirectUrl: step2.data?.redirectUrl,
          steps,
        };
      }

      if (currentStep === "pending") {
        return {
          success: true, pending: true,
          message: "Verification already pending review after info submission",
          verificationId, currentStep, steps,
        };
      }

      if (currentStep === "emailLoop") {
        return {
          success: false, pending: false,
          message: "Email verification loop triggered - need new verification link",
          verificationId, currentStep, steps,
        };
      }
    } else {
      steps.push({ step: "skipPersonalInfo", status: 200, data: { reason: `Already past info step, currently at '${currentStep}'` } });
    }

    if (currentStep === "sso" || currentStep === config.collectStep) {
      const step3 = await sheeridRequest(
        "DELETE",
        `${SHEERID_BASE_URL}/rest/v2/verification/${verificationId}/step/sso`
      );
      steps.push({ step: "skipSSO", status: step3.status, data: step3.data });
      currentStep = step3.data?.currentStep || currentStep;
    }

    if (currentStep === "success") {
      return {
        success: true, pending: false,
        message: "Verification approved instantly after SSO skip",
        verificationId, currentStep, steps,
      };
    }

    if (currentStep === "emailLoop") {
      return {
        success: false, pending: false,
        message: "Email verification loop triggered - need new verification link",
        verificationId, currentStep, steps,
      };
    }

    const docUploadBody = {
      files: documents.map(doc => ({
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: doc.data.length,
      })),
    };

    const step4 = await sheeridRequest(
      "POST",
      `${SHEERID_BASE_URL}/rest/v2/verification/${verificationId}/step/docUpload`,
      docUploadBody
    );
    steps.push({ step: "docUpload", status: step4.status, data: step4.data });

    if (!step4.data?.documents || step4.data.documents.length === 0) {
      return {
        success: false, pending: false,
        message: `Failed to get upload URL: ${JSON.stringify(step4.data)}`,
        verificationId, steps,
      };
    }

    if (step4.data.documents.length < documents.length) {
      return {
        success: false, pending: false,
        message: `Expected ${documents.length} upload URLs but got ${step4.data.documents.length}`,
        verificationId, steps,
      };
    }

    for (let i = 0; i < documents.length; i++) {
      const uploadUrl = step4.data.documents[i].uploadUrl;
      const doc = documents[i];
      const uploaded = await uploadToS3(uploadUrl, doc.data, doc.mimeType);
      steps.push({ step: `s3Upload_${doc.fileName}`, status: uploaded ? 200 : 500, data: { uploaded, fileName: doc.fileName } });
      if (!uploaded) {
        return {
          success: false, pending: false,
          message: `S3 upload failed for ${doc.fileName}`,
          verificationId, steps,
        };
      }
    }

    const step5 = await sheeridRequest(
      "POST",
      `${SHEERID_BASE_URL}/rest/v2/verification/${verificationId}/step/completeDocUpload`
    );
    steps.push({ step: "completeDocUpload", status: step5.status, data: step5.data });

    const finalStep = step5.data?.currentStep || "unknown";
    const redirectUrl = step5.data?.redirectUrl;
    const rewardCode = step5.data?.rewardCode || step5.data?.rewardData?.rewardCode;

    if (finalStep === "success") {
      return {
        success: true, pending: false,
        message: "Verification successful",
        verificationId, currentStep: finalStep,
        redirectUrl, rewardCode, steps,
        documentImages: docImagesBase64,
      };
    }

    return {
      success: true, pending: true,
      message: "Document submitted, awaiting review (24-48h)",
      verificationId, currentStep: finalStep,
      redirectUrl, rewardCode, steps,
      documentImages: docImagesBase64,
    };

  } catch (error: any) {
    return {
      success: false, pending: false,
      message: error.name === "TimeoutError"
        ? "SheerID API request timed out"
        : `Verification failed: ${error.message}`,
      verificationId, steps,
    };
  }
}

export async function checkVerificationStatus(verificationId: string): Promise<{
  currentStep: string;
  rewardCode?: string;
  redirectUrl?: string;
  errorIds?: string[];
}> {
  const { data, status } = await sheeridRequest(
    "GET",
    `${SHEERID_BASE_URL}/rest/v2/verification/${verificationId}`
  );

  if (status !== 200) {
    throw new Error(`Status check failed (HTTP ${status})`);
  }

  return {
    currentStep: data?.currentStep || "unknown",
    rewardCode: data?.rewardCode || data?.rewardData?.rewardCode,
    redirectUrl: data?.redirectUrl,
    errorIds: data?.errorIds,
  };
}

export { generateRandomName, generateEmail, generateBirthDate };
