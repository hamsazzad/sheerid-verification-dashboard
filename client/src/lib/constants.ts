export const TOOL_DATA = [
  {
    id: "spotify-verify",
    name: "Spotify Premium",
    description: "University student verification for Spotify Premium student discount. Supports 35+ countries with weighted university selection.",
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
    requirements: ["Python 3.8+", "httpx", "Pillow", "curl_cffi (recommended)"]
  },
  {
    id: "youtube-verify",
    name: "YouTube Premium",
    description: "University student verification for YouTube Premium student discount with anti-detection capabilities.",
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
    requirements: ["Python 3.8+", "httpx", "Pillow", "curl_cffi"]
  },
  {
    id: "one-verify",
    name: "Gemini Advanced",
    description: "Google One AI Premium student verification for Gemini Advanced access.",
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
    requirements: ["Python 3.8+", "httpx", "Pillow"]
  },
  {
    id: "boltnew-verify",
    name: "Bolt.new",
    description: "Teacher verification for Bolt.new using university teacher credentials with employment certificates.",
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
    requirements: ["Python 3.8+", "httpx", "Pillow"]
  },
  {
    id: "canva-teacher",
    name: "Canva Education",
    description: "UK Teacher verification for Canva Education using K-12 school credentials and teaching documents.",
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
    requirements: ["Python 3.8+", "httpx", "Pillow", "pdf2image"]
  },
  {
    id: "k12-verify",
    name: "ChatGPT Plus",
    description: "K12 Teacher verification for ChatGPT Plus using high school teacher credentials.",
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
    requirements: ["Python 3.8+", "httpx", "Pillow"]
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
    requirements: ["Python 3.8+", "httpx", "Pillow"]
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
    requirements: ["Chrome Browser", "Manifest V3"]
  }
];

export const CATEGORY_LABELS: Record<string, string> = {
  student: "Student Verification",
  teacher: "Teacher Verification",
  military: "Military Verification",
  extension: "Browser Extension"
};

export const CATEGORY_COLORS: Record<string, string> = {
  student: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  teacher: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  military: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  extension: "bg-purple-500/10 text-purple-400 border-purple-500/20"
};

export const STATUS_COLORS: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20"
};
