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
  { id: 3995910, idExtended: "3995910", name: "Springfield High School (Springfield, OR)", country: "US" },
  { id: 3995271, idExtended: "3995271", name: "Springfield High School (Springfield, OH)", country: "US" },
  { id: 3992142, idExtended: "3992142", name: "Springfield High School (Springfield, IL)", country: "US" },
  { id: 3996208, idExtended: "3996208", name: "Springfield High School (Springfield, PA)", country: "US" },
  { id: 4015002, idExtended: "4015002", name: "Springfield High School (Springfield, TN)", country: "US" },
  { id: 4015001, idExtended: "4015001", name: "Springfield High School (Springfield, VT)", country: "US" },
  { id: 4014999, idExtended: "4014999", name: "Springfield High School (Springfield, LA)", country: "US" },
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
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await new Promise(r => setTimeout(r, 300));
    const screenshot = await page.screenshot({ type: "png", fullPage: true });
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

function generateEnrollmentVerificationHtml(firstName: string, lastName: string, universityName: string): string {
  const studentId = generateStudentId();
  const name = `${firstName} ${lastName}`;
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const semester = currentMonth >= 0 && currentMonth <= 4 ? "Spring" : currentMonth >= 5 && currentMonth <= 7 ? "Summer" : "Fall";
  const termStr = `${semester} ${currentYear}`;
  const majors = [
    "Computer Science", "Biology", "Psychology", "Business Administration",
    "Engineering", "English Literature", "Mathematics", "Economics",
    "Political Science", "Chemistry", "Communications", "Nursing",
    "Accounting", "Sociology", "History", "Environmental Science"
  ];
  const major = majors[Math.floor(Math.random() * majors.length)];
  const credits = Math.floor(Math.random() * 6 + 12);
  const enrollYear = currentYear - Math.floor(Math.random() * 3 + 1);
  const gradYear = enrollYear + 4;
  const initials = universityName.split(/\s+/).filter(w => w.length > 2 && w[0] === w[0].toUpperCase()).map(w => w[0]).join("").slice(0, 3) || "U";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
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
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-mark">${initials}</div>
    <div class="header-text">
      <div class="uni-name">${universityName}</div>
      <div class="dept-name">Office of the Registrar</div>
    </div>
  </div>
  <div class="doc-date">${dateStr}</div>
  <div class="body-text">To Whom It May Concern:</div>
  <div class="body-text">
    This letter serves as official confirmation that the individual named below is currently enrolled
    at <strong>${universityName}</strong>. This verification has been issued by the Office of the Registrar
    upon request, and reflects the student's enrollment status as of the date shown above.
  </div>
  <div class="doc-title">Enrollment Verification</div>
  <table class="info-table">
    <tr><td>Student Name:</td><td>${name}</td></tr>
    <tr><td>Student ID:</td><td>${studentId}</td></tr>
    <tr><td>Enrollment Status:</td><td><span class="status-badge">Active - Full Time</span></td></tr>
    <tr><td>Current Term:</td><td>${termStr}</td></tr>
    <tr><td>Program / Major:</td><td>${major}</td></tr>
    <tr><td>Degree Level:</td><td>Bachelor's Degree</td></tr>
    <tr><td>Credits Enrolled:</td><td>${credits}</td></tr>
    <tr><td>First Enrolled:</td><td>August ${enrollYear}</td></tr>
    <tr><td>Expected Graduation:</td><td>May ${gradYear}</td></tr>
  </table>
  <div class="body-text">
    The student named above is in good academic standing and is actively pursuing a degree at this institution.
    This document is provided for verification purposes only.
  </div>
  <div class="seal-area">
    <div class="signature-block">
      <div class="signature-line">
        University Registrar<br>
        Office of the Registrar<br>
        ${universityName}
      </div>
    </div>
    <div class="seal">OFFICIAL<br>REGISTRAR<br>SEAL</div>
  </div>
  <div class="footer">
    <span class="doc-id">Document ID: EVL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}</span>
    &nbsp;|&nbsp; Generated: ${dateStr} &nbsp;|&nbsp; Valid for 90 days from date of issue
  </div>
</div>
</body>
</html>`;
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

function generateK12EmploymentHtml(firstName: string, lastName: string, organizationName: string): string {
  const name = `${firstName} ${lastName}`;
  const employeeId = `E-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const currentDate = new Date().toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  const initials = organizationName.split(/\s+/).filter(w => w.length > 2 && w[0] === w[0].toUpperCase()).map(w => w[0]).join("").slice(0, 3) || "K";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600;700&display=swap');
body { font-family: 'Open Sans', 'Helvetica Neue', Arial, sans-serif; background: #fff; margin: 0; padding: 0; color: #333; }
.page { width: 8.5in; min-height: 11in; margin: 0 auto; padding: 0.75in 1in; box-sizing: border-box; position: relative; }
.header { display: flex; align-items: center; padding-bottom: 20px; border-bottom: 3px solid #2c5f2d; margin-bottom: 30px; }
.logo-mark { width: 65px; height: 65px; background: #2c5f2d; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-family: 'Merriweather', Georgia, serif; font-size: 24px; font-weight: 700; margin-right: 20px; flex-shrink: 0; }
.header-text { flex: 1; }
.org-name { font-family: 'Merriweather', Georgia, serif; font-size: 20px; font-weight: 700; color: #2c5f2d; margin: 0; line-height: 1.3; }
.dept-name { font-size: 13px; color: #555; margin-top: 4px; }
.doc-date { font-size: 12px; color: #555; margin-bottom: 25px; }
.doc-title { font-family: 'Merriweather', Georgia, serif; font-size: 18px; font-weight: 700; text-align: center; color: #2c5f2d; margin: 25px 0; padding: 12px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; text-transform: uppercase; letter-spacing: 2px; }
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
.seal { width: 80px; height: 80px; border: 3px solid #2c5f2d; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Merriweather', Georgia, serif; font-size: 10px; text-align: center; color: #2c5f2d; font-weight: 700; line-height: 1.2; padding: 8px; box-sizing: border-box; }
.footer { position: absolute; bottom: 0.5in; left: 1in; right: 1in; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
.doc-id { font-family: 'Courier New', monospace; font-size: 9px; color: #aaa; }
</style></head>
<body>
<div class="page">
  <div class="header"><div class="logo-mark">${initials}</div><div class="header-text"><div class="org-name">${organizationName}</div><div class="dept-name">Human Resources Department</div></div></div>
  <div class="doc-date">${dateStr}</div>
  <div class="body-text">To Whom It May Concern:</div>
  <div class="body-text">This letter confirms the employment of the individual named below with <strong>${organizationName}</strong>. This verification is issued by the Human Resources Department and reflects current employment records.</div>
  <div class="doc-title">Employment Verification</div>
  <table class="info-table">
    <tr><td>Employee Name:</td><td>${name}</td></tr>
    <tr><td>Employee ID:</td><td>${employeeId}</td></tr>
    <tr><td>Position:</td><td>Teacher - Full Time</td></tr>
    <tr><td>Employment Status:</td><td><span class="status-badge">Active</span></td></tr>
    <tr><td>Employment Type:</td><td>Certified Faculty</td></tr>
    <tr><td>Hire Date:</td><td>August 15, 2018</td></tr>
    <tr><td>Current Assignment:</td><td>August 2025 - June 2026</td></tr>
  </table>
  <div class="body-text">The employee named above is currently an active member of the teaching staff. This document is provided for verification purposes only.</div>
  <div class="seal-area"><div class="signature-block"><div class="signature-line">Director of Human Resources<br>${organizationName}</div></div><div class="seal">OFFICIAL<br>HR<br>SEAL</div></div>
  <div class="footer"><span class="doc-id">Document ID: K12-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}</span>&nbsp;|&nbsp; Generated: ${dateStr} &nbsp;|&nbsp; Valid for 90 days from date of issue</div>
</div>
</body></html>`;
}

async function generateDocumentImages(
  firstName: string,
  lastName: string,
  verifyType: "student" | "teacher" | "k12teacher",
  organizationName: string
): Promise<Array<{ fileName: string; data: Buffer; mimeType: string }>> {
  if (verifyType === "student") {
    const html = generateEnrollmentVerificationHtml(firstName, lastName, organizationName);
    const data = await htmlToScreenshot(html, 850, 1100);
    return [{ fileName: "student_card.png", data, mimeType: "image/png" }];
  } else if (verifyType === "teacher") {
    const psuId = generatePsuId();
    const cardHtml = generateTeacherCardHtml(firstName, lastName, psuId);
    const letterHtml = generateEmploymentVerificationHtml(firstName, lastName, organizationName);
    const [cardPng, letterPng] = await Promise.all([
      htmlToScreenshot(cardHtml, 700, 1100),
      htmlToScreenshot(letterHtml, 1300, 1600),
    ]);
    return [
      { fileName: "teacher_id.png", data: cardPng, mimeType: "image/png" },
      { fileName: "employment_letter.png", data: letterPng, mimeType: "image/png" },
    ];
  } else {
    const letterHtml = generateK12EmploymentHtml(firstName, lastName, organizationName);
    const letterPng = await htmlToScreenshot(letterHtml, 850, 1100);
    const cardHtml = generateTeacherCardHtml(firstName, lastName, generatePsuId());
    const cardPng = await htmlToScreenshot(cardHtml, 700, 1100);
    return [
      { fileName: "employment_verification.png", data: letterPng, mimeType: "image/png" },
      { fileName: "teacher_badge.png", data: cardPng, mimeType: "image/png" },
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
  } else {
    const psu = getRandomPSUSchool();
    school = { id: psu.id, idExtended: psu.idExtended, name: psu.name };
  }

  try {
    const documents = await generateDocumentImages(firstName, lastName, config.verifyType, school.name);
    steps.push({ step: "generateDocument", status: 200, data: { count: documents.length, sizes: documents.map(d => d.data.length) } });

    const personalInfoBody: any = {
      firstName,
      lastName,
      birthDate: config.verifyType === "teacher" ? "" : birthDate,
      email,
      phoneNumber: "",
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
        verificationId,
        refererUrl: `${SHEERID_BASE_URL}/verify/${config.programId}/?verificationId=${verificationId}`,
        flags: '{"doc-upload-considerations":"default","doc-upload-may24":"default","doc-upload-redesign-use-legacy-message-keys":false,"docUpload-assertion-checklist":"default","include-cvec-field-france-student":"not-labeled-optional"}',
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

    let currentStep = step2.data?.currentStep || "";

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
        message: "Verification approved instantly",
        verificationId, currentStep,
        redirectUrl: step2.data?.redirectUrl,
        steps,
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

    let allUploaded = true;
    for (let i = 0; i < documents.length; i++) {
      const uploadUrl = step4.data.documents[i].uploadUrl;
      const doc = documents[i];
      const uploaded = await uploadToS3(uploadUrl, doc.data, doc.mimeType);
      steps.push({ step: `s3Upload_${doc.fileName}`, status: uploaded ? 200 : 500, data: { uploaded, fileName: doc.fileName } });
      if (!uploaded) allUploaded = false;
    }

    if (!allUploaded) {
      return {
        success: false, pending: false,
        message: "One or more document uploads to S3 failed",
        verificationId, steps,
      };
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
      };
    }

    return {
      success: true, pending: true,
      message: "Document submitted, awaiting review",
      verificationId, currentStep: finalStep,
      redirectUrl, rewardCode, steps,
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
    `${MY_SHEERID_URL}/rest/v2/verification/${verificationId}`
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
