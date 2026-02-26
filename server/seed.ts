import { storage } from "./storage";
import type { InsertTool, InsertUniversity } from "@shared/schema";

const TOOLS: InsertTool[] = [
  {
    id: "spotify-verify",
    name: "Spotify Premium",
    description: "University student verification for Spotify Premium student discount. Supports 35+ countries with weighted university selection and Chrome TLS impersonation.",
    type: "Student",
    target: "Spotify Premium",
    category: "student",
    icon: "Music",
    color: "#1DB954",
    features: [
      "Weighted university selection (45+ universities)",
      "Success rate tracking per organization",
      "Chrome TLS impersonation",
      "Retry with exponential backoff",
      "Rate limiting avoidance",
      "Auto document generation"
    ],
    requirements: ["Python 3.8+", "httpx", "Pillow", "curl_cffi"],
    isActive: true,
  },
  {
    id: "youtube-verify",
    name: "YouTube Premium",
    description: "University student verification for YouTube Premium student discount with anti-detection capabilities and success tracking.",
    type: "Student",
    target: "YouTube Premium",
    category: "student",
    icon: "Play",
    color: "#FF0000",
    features: [
      "Chrome TLS impersonation",
      "Success rate tracking",
      "Weighted university selection",
      "Retry with exponential backoff",
      "Rate limiting avoidance"
    ],
    requirements: ["Python 3.8+", "httpx", "Pillow", "curl_cffi"],
    isActive: true,
  },
  {
    id: "one-verify",
    name: "Gemini Advanced",
    description: "Google One AI Premium student verification for Gemini Advanced access with multi-country support.",
    type: "Student",
    target: "Gemini Advanced",
    category: "student",
    icon: "Bot",
    color: "#4285F4",
    features: [
      "Google One AI Premium access",
      "Student identity verification",
      "Multi-country support",
      "Auto document generation"
    ],
    requirements: ["Python 3.8+", "httpx", "Pillow"],
    isActive: true,
  },
  {
    id: "boltnew-verify",
    name: "Bolt.new",
    description: "Teacher verification for Bolt.new using university teacher credentials with employment certificate generation.",
    type: "Teacher",
    target: "Bolt.new",
    category: "teacher",
    icon: "Zap",
    color: "#F59E0B",
    features: [
      "Teacher demographic targeting (25-55 years)",
      "Employment certificate generation",
      "University-based verification",
      "Anti-detection module"
    ],
    requirements: ["Python 3.8+", "httpx", "Pillow"],
    isActive: true,
  },
  {
    id: "canva-teacher",
    name: "Canva Education",
    description: "UK Teacher verification for Canva Education using K-12 school credentials and teaching document templates.",
    type: "Teacher",
    target: "Canva Education",
    category: "teacher",
    icon: "Palette",
    color: "#00C4CC",
    features: [
      "UK K-12 teacher verification",
      "Template-based document generation",
      "Employment letter templates",
      "Teaching license generation"
    ],
    requirements: ["Python 3.8+", "httpx", "Pillow", "pdf2image"],
    isActive: true,
  },
  {
    id: "k12-verify",
    name: "ChatGPT Plus",
    description: "K12 Teacher verification for ChatGPT Plus using high school teacher credentials and badge generation.",
    type: "K12 Teacher",
    target: "ChatGPT Plus",
    category: "teacher",
    icon: "GraduationCap",
    color: "#10A37F",
    features: [
      "K12 high school teacher verification",
      "Age-targeted identity generation",
      "Teacher badge document generation",
      "Success tracking"
    ],
    requirements: ["Python 3.8+", "httpx", "Pillow"],
    isActive: true,
  },
  {
    id: "veterans-verify",
    name: "Military Verification",
    description: "Military status verification for veteran discounts and benefits across various services.",
    type: "Military",
    target: "General",
    category: "military",
    icon: "Shield",
    color: "#6366F1",
    features: [
      "Military status verification",
      "Veteran discount access",
      "Multi-service support",
      "Document generation"
    ],
    requirements: ["Python 3.8+", "httpx", "Pillow"],
    isActive: true,
  },
  {
    id: "veterans-extension",
    name: "Chrome Extension",
    description: "Chrome browser extension for streamlined military verification with side panel and auto-fill capabilities.",
    type: "Extension",
    target: "Browser",
    category: "extension",
    icon: "Chrome",
    color: "#8B5CF6",
    features: [
      "Chrome side panel interface",
      "Auto-fill verification forms",
      "Background processing",
      "Popup interface"
    ],
    requirements: ["Chrome Browser", "Manifest V3"],
    isActive: true,
  },
];

const UNIVERSITIES: InsertUniversity[] = [
  { orgId: 2565, name: "Pennsylvania State University", domain: "psu.edu", country: "USA", weight: 100, successRate: 72 },
  { orgId: 3499, name: "University of California, Los Angeles", domain: "ucla.edu", country: "USA", weight: 98, successRate: 68 },
  { orgId: 1445, name: "University of Texas at Austin", domain: "utexas.edu", country: "USA", weight: 95, successRate: 65 },
  { orgId: 2233, name: "Ohio State University", domain: "osu.edu", country: "USA", weight: 92, successRate: 70 },
  { orgId: 1876, name: "University of Florida", domain: "ufl.edu", country: "USA", weight: 90, successRate: 63 },
  { orgId: 3321, name: "Arizona State University", domain: "asu.edu", country: "USA", weight: 88, successRate: 67 },
  { orgId: 4455, name: "University of Michigan", domain: "umich.edu", country: "USA", weight: 85, successRate: 71 },
  { orgId: 5566, name: "University of Washington", domain: "uw.edu", country: "USA", weight: 82, successRate: 60 },
  { orgId: 6677, name: "Boston University", domain: "bu.edu", country: "USA", weight: 80, successRate: 58 },
  { orgId: 7788, name: "New York University", domain: "nyu.edu", country: "USA", weight: 78, successRate: 55 },
  { orgId: 10001, name: "University of Oxford", domain: "ox.ac.uk", country: "UK", weight: 75, successRate: 62 },
  { orgId: 10002, name: "University of Cambridge", domain: "cam.ac.uk", country: "UK", weight: 73, successRate: 64 },
  { orgId: 10003, name: "Imperial College London", domain: "imperial.ac.uk", country: "UK", weight: 70, successRate: 59 },
  { orgId: 20001, name: "University of Tokyo", domain: "u-tokyo.ac.jp", country: "Japan", weight: 68, successRate: 56 },
  { orgId: 20002, name: "Kyoto University", domain: "kyoto-u.ac.jp", country: "Japan", weight: 65, successRate: 54 },
  { orgId: 30001, name: "Seoul National University", domain: "snu.ac.kr", country: "South Korea", weight: 63, successRate: 52 },
  { orgId: 30002, name: "Korea University", domain: "korea.ac.kr", country: "South Korea", weight: 60, successRate: 50 },
  { orgId: 40001, name: "University of Toronto", domain: "utoronto.ca", country: "Canada", weight: 72, successRate: 66 },
  { orgId: 40002, name: "University of British Columbia", domain: "ubc.ca", country: "Canada", weight: 70, successRate: 61 },
  { orgId: 50001, name: "University of Melbourne", domain: "unimelb.edu.au", country: "Australia", weight: 67, successRate: 57 },
  { orgId: 50002, name: "University of Sydney", domain: "sydney.edu.au", country: "Australia", weight: 65, successRate: 55 },
  { orgId: 60001, name: "FPT University", domain: "fpt.edu.vn", country: "Vietnam", weight: 80, successRate: 74 },
  { orgId: 60002, name: "VNU University of Science", domain: "hus.vnu.edu.vn", country: "Vietnam", weight: 78, successRate: 71 },
  { orgId: 70001, name: "Technical University of Munich", domain: "tum.de", country: "Germany", weight: 62, successRate: 53 },
  { orgId: 80001, name: "Sorbonne University", domain: "sorbonne-universite.fr", country: "France", weight: 60, successRate: 51 },
];

const PSU_CAMPUSES: InsertUniversity[] = [
  { orgId: 651379, name: "Pennsylvania State University-World Campus", domain: "psu.edu", country: "USA", weight: 95, successRate: 70 },
  { orgId: 8387, name: "Pennsylvania State University-Penn State Harrisburg", domain: "psu.edu", country: "USA", weight: 90, successRate: 68 },
  { orgId: 8382, name: "Pennsylvania State University-Penn State Altoona", domain: "psu.edu", country: "USA", weight: 88, successRate: 65 },
  { orgId: 8396, name: "Pennsylvania State University-Penn State Berks", domain: "psu.edu", country: "USA", weight: 85, successRate: 63 },
  { orgId: 8379, name: "Pennsylvania State University-Penn State Brandywine", domain: "psu.edu", country: "USA", weight: 83, successRate: 62 },
  { orgId: 2560, name: "Pennsylvania State University-College of Medicine", domain: "psu.edu", country: "USA", weight: 80, successRate: 60 },
  { orgId: 650600, name: "Pennsylvania State University-Penn State Lehigh Valley", domain: "psu.edu", country: "USA", weight: 78, successRate: 58 },
  { orgId: 8388, name: "Pennsylvania State University-Penn State Hazleton", domain: "psu.edu", country: "USA", weight: 76, successRate: 57 },
  { orgId: 8394, name: "Pennsylvania State University-Penn State Worthington Scranton", domain: "psu.edu", country: "USA", weight: 74, successRate: 55 },
];

export async function seedDatabase() {
  try {
    const existingTools = await storage.getAllTools();
    if (existingTools.length > 0) {
      const existingUnis = await storage.getAllUniversities();
      const existingOrgIds = new Set(existingUnis.map(u => u.orgId));
      let addedCampuses = 0;
      for (const campus of PSU_CAMPUSES) {
        if (!existingOrgIds.has(campus.orgId)) {
          await storage.createUniversity(campus);
          addedCampuses++;
        }
      }
      if (addedCampuses > 0) {
        console.log(`[SEED] Added ${addedCampuses} missing PSU campuses`);
      }
      console.log("[SEED] Database already seeded, skipping tools...");
      return;
    }

    console.log("[SEED] Seeding database...");

    for (const tool of TOOLS) {
      await storage.upsertTool(tool);
    }
    console.log(`[SEED] Created ${TOOLS.length} tools`);

    const allUnis = [...UNIVERSITIES, ...PSU_CAMPUSES];
    for (const uni of allUnis) {
      await storage.createUniversity(uni);
    }
    console.log(`[SEED] Created ${allUnis.length} universities`);

    console.log("[SEED] Database seeding complete! Stats and verifications will be populated from real usage.");
  } catch (error) {
    console.error("[SEED] Error seeding database:", error);
  }
}
