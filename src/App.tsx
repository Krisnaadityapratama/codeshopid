import { useEffect, useMemo, useRef, useState } from "react";
import AppsCatalogPage, {
  type AppCatalogItem,
  type AppSupportStatus,
} from "./AppsCatalogPage";
import ProductDocumentationPage, {
  type ProductDocumentation,
} from "./ProductDocumentationPage";
import RequestsPage from "./RequestsPage";
import {
  createRequest,
  deleteContent,
  loadContent,
  loadRequests,
  loadProfile,
  loadProfiles,
  manageUser,
  saveContent,
  setRequestStatus,
  supabase,
  supabaseConfigured,
  type AppProfile,
  type ContentCollection,
  type RequestStatus,
  type TeamRequest,
} from "./lib/supabase";
import brandLogo from "./assets/logo.jpg";
import "sweetalert2/dist/sweetalert2.min.css";
import "./App.css";

type Page =
  | "Home"
  | "Produk"
  | "Troubleshooting"
  | "Compatibility"
  | "Software"
  | "Apps"
  | "Generator"
  | "Dokumentasi Produk"
  | "Permintaan"
  | "Tutorial"
  | "Playlist Tutorial"
  | "Users";
type UserRole = "owner" | "admin" | "sales";
type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};
type PlaylistLesson = {
  id: string;
  title: string;
  description: string;
  url: string;
  duration: string;
};
type TutorialPlaylist = {
  id: string;
  title: string;
  description: string;
  category: string;
  lessons: PlaylistLesson[];
};
type StandaloneTutorial = {
  id: string;
  title: string;
  description: string;
  url: string;
  duration: string;
  category: string;
  createdAt: string;
};
type SoftwareItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  platform: string;
  version: string;
  downloadUrl: string;
  documentationUrl: string;
  supportedProducts: string;
  createdAt: string;
};
type TroubleshootingIssue = {
  id: string;
  title: string;
  category: string;
  level: string;
  cause: string;
  steps: string[];
};
const USERS_STORAGE_KEY = "codeshop-demo-users-v1";
const SESSION_STORAGE_KEY = "codeshop-demo-session-v1";
const PLAYLIST_STORAGE_KEY = "codeshop-demo-tutorial-playlists-v1";
const TUTORIAL_STORAGE_KEY = "codeshop-demo-standalone-tutorials-v1";
const SOFTWARE_STORAGE_KEY = "codeshop-demo-software-v1";
const PRODUCT_STORAGE_KEY = "codeshop-demo-products-v1";
const TROUBLESHOOTING_STORAGE_KEY = "codeshop-demo-troubleshooting-v1";
const LEGACY_IMPORT_KEY = "codeshop-supabase-legacy-import-v1";
const SUPABASE_CONFIGURATION_ERROR =
  "Konfigurasi Supabase belum tersedia. Salin .env.example ke .env.local, lalu isi URL project dan anon/publishable key.";

async function confirmDestructiveAction(
  title: string,
  message: string,
  confirmText = "Ya, hapus",
) {
  const { default: Swal } = await import("sweetalert2");
  const result = await Swal.fire({
    title,
    text: message,
    icon: "warning",
    iconColor: "#F6981B",
    showCancelButton: true,
    allowOutsideClick: false,
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: false,
    confirmButtonText: confirmText,
    cancelButtonText: "Batal",
    customClass: {
      popup: "codeshop-swal-popup",
      title: "codeshop-swal-title",
      htmlContainer: "codeshop-swal-message",
      confirmButton: "codeshop-swal-confirm",
      cancelButton: "codeshop-swal-cancel",
    },
  });
  return result.isConfirmed;
}

function mapProfile(profile: AppProfile): DemoUser {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    createdAt: profile.created_at,
  };
}

async function importLegacyContent<T>(
  collection: ContentCollection,
  items: T[],
  current: T[],
  getId: (item: T) => string,
) {
  const existingIds = new Set(current.map(getId));
  const additions = items.filter((item) => !existingIds.has(getId(item)));
  await Promise.all(
    additions.map((item) => saveContent(collection, getId(item), item)),
  );
  return [...current, ...additions];
}

const starterSoftware: SoftwareItem[] = [
  {
    id: "software-printer-driver",
    name: "Kassen Printer Driver",
    description:
      "Driver printer thermal untuk instalasi dan pencetakan dari Windows.",
    category: "Printer Driver",
    platform: "Windows",
    version: "Terbaru",
    downloadUrl: "",
    documentationUrl: "",
    supportedProducts: "Thermal Printer",
    createdAt: new Date().toISOString(),
  },
  {
    id: "software-pos-utility",
    name: "POS Printer Utility",
    description: "Konfigurasi printer POS dan lakukan test print.",
    category: "Utility",
    platform: "Windows",
    version: "Terbaru",
    downloadUrl: "",
    documentationUrl: "",
    supportedProducts: "Printer POS",
    createdAt: new Date().toISOString(),
  },
  {
    id: "software-barcode-editor",
    name: "Barcode Label Editor",
    description: "Buat dan cetak desain label barcode.",
    category: "Label Software",
    platform: "Windows",
    version: "Terbaru",
    downloadUrl: "",
    documentationUrl: "",
    supportedProducts: "Barcode Printer",
    createdAt: new Date().toISOString(),
  },
];

const starterPlaylists: TutorialPlaylist[] = [
  {
    id: "playlist-ipos-5",
    title: "Tutorial iPOS 5",
    description:
      "Panduan berurutan untuk instalasi, pengaturan, dan penggunaan awal aplikasi iPOS 5.",
    category: "IPOS 5",
    lessons: [
      {
        id: "ipos-install",
        title: "Cara Install iPOS 5",
        description:
          "Persiapan perangkat dan langkah instalasi awal aplikasi iPOS 5.",
        url: "",
        duration: "8 menit",
      },
      {
        id: "ipos-activation",
        title: "Aktivasi dan registrasi",
        description:
          "Panduan aktivasi aplikasi setelah proses instalasi selesai.",
        url: "",
        duration: "5 menit",
      },
      {
        id: "ipos-first-setup",
        title: "Pengaturan awal & data usaha",
        description:
          "Atur profil usaha, pengguna, dan preferensi dasar sebelum mulai transaksi.",
        url: "",
        duration: "7 menit",
      },
      {
        id: "ipos-printer",
        title: "Setting printer kasir",
        description:
          "Hubungkan printer struk dan lakukan cetak uji dari iPOS 5.",
        url: "",
        duration: "6 menit",
      },
      {
        id: "ipos-backup",
        title: "Backup dan restore database",
        description:
          "Simpan cadangan data dan pulihkan database saat diperlukan.",
        url: "",
        duration: "5 menit",
      },
    ],
  },
];

function loadTutorialPlaylists() {
  try {
    const saved = localStorage.getItem(PLAYLIST_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as TutorialPlaylist[]) : starterPlaylists;
  } catch {
    return starterPlaylists;
  }
}

function loadStandaloneTutorials(): StandaloneTutorial[] {
  try {
    const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as StandaloneTutorial[]) : [];
  } catch {
    return [];
  }
}

function loadSoftwareItems(): SoftwareItem[] {
  try {
    const saved = localStorage.getItem(SOFTWARE_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as SoftwareItem[]) : starterSoftware;
  } catch {
    return starterSoftware;
  }
}

function getVideoPreviewUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId = "";
    if (host === "youtu.be")
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      videoId =
        url.searchParams.get("v") ??
        url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ??
        "";
    }
    if (videoId)
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
    if (host === "drive.google.com") {
      const driveId =
        url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ??
        url.searchParams.get("id") ??
        "";
      if (driveId)
        return `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`;
    }
  } catch {
    return null;
  }
  return null;
}

type ProductCompatibilityPair = { system: string; connection: string };
type BluetoothDeviceSupport = "single" | "middle" | "up-to-10" | "other-device";
type BarcodePrintingMethod = "direct-thermal" | "thermal-transfer" | "both";
const compatibilitySystems = ["Windows", "Android", "iOS", "macOS"];
const compatibilityConnections = ["Bluetooth", "USB", "Serial", "Ethernet"];

type Product = {
  name: string;
  code: string;
  category: string;
  brand: string;
  connections: string[];
  systems: string[];
  driverDownloadUrl?: string;
  bluetoothDeviceSupport?: BluetoothDeviceSupport;
  barcodePrintingMethod?: BarcodePrintingMethod;
  ribbonWidthMm?: number;
  ribbonLengthM?: number;
  ribbonNote?: string;
  compatibilityPairs?: ProductCompatibilityPair[];
  appSupport?: Record<string, AppSupportStatus>;
  accent: string;
  icon: string;
  description: string;
  status: string;
  labelSupport: ProductLabelSupport;
};

type LabelSensorSupport = {
  type: "GAP" | "MARK" | "NOTCH";
  supported: boolean;
  note: string;
};
type LabelSizeSupport = {
  widthMm: number;
  heightMm: number;
  lines: number;
  barcodeType: string;
  supported: boolean;
  note: string;
};
type ProductLabelSupport = {
  applicable: boolean;
  demoData: boolean;
  minWidthMm: number | null;
  minHeightMm: number | null;
  sensorTypes: LabelSensorSupport[];
  sizes: LabelSizeSupport[];
  note: string;
};

const barcodePrinterLabelSupport: ProductLabelSupport = {
  applicable: true,
  demoData: true,
  minWidthMm: 20,
  minHeightMm: 10,
  sensorTypes: [
    { type: "GAP", supported: true, note: "Jarak antar label dibaca sensor." },
    {
      type: "MARK",
      supported: true,
      note: "Black mark dapat digunakan sebagai acuan.",
    },
    {
      type: "NOTCH",
      supported: false,
      note: "Belum didukung pada profil demo ini.",
    },
  ],
  sizes: [
    {
      widthMm: 33,
      heightMm: 13,
      lines: 1,
      barcodeType: "Code 128 / EAN-13",
      supported: true,
      note: "Ukuran label standar.",
    },
    {
      widthMm: 33,
      heightMm: 13,
      lines: 2,
      barcodeType: "Code 128 + teks",
      supported: true,
      note: "Sisakan ruang untuk teks.",
    },
    {
      widthMm: 33,
      heightMm: 13,
      lines: 3,
      barcodeType: "Code 128 + 2 teks",
      supported: false,
      note: "Area cetak tidak mencukupi.",
    },
    {
      widthMm: 33,
      heightMm: 20,
      lines: 1,
      barcodeType: "QR / Code 128",
      supported: true,
      note: "QR dan barcode 1D.",
    },
    {
      widthMm: 33,
      heightMm: 20,
      lines: 2,
      barcodeType: "Code 128 + teks",
      supported: true,
      note: "Gunakan margin label.",
    },
    {
      widthMm: 40,
      heightMm: 30,
      lines: 3,
      barcodeType: "QR + teks",
      supported: true,
      note: "Atur tinggi baris pada template.",
    },
    {
      widthMm: 50,
      heightMm: 30,
      lines: 4,
      barcodeType: "Barcode + 3 teks",
      supported: false,
      note: "Jumlah baris melebihi profil demo.",
    },
  ],
  note: "Contoh konfigurasi untuk demo UI. Verifikasi dengan datasheet dan uji cetak printer sebelum diberikan ke customer.",
};

const receiptPrinterLabelSupport: ProductLabelSupport = {
  applicable: true,
  demoData: true,
  minWidthMm: null,
  minHeightMm: null,
  sensorTypes: [
    {
      type: "GAP",
      supported: false,
      note: "Profil demo hanya untuk kertas struk kontinu.",
    },
    {
      type: "MARK",
      supported: false,
      note: "Black mark belum diverifikasi untuk printer ini.",
    },
    {
      type: "NOTCH",
      supported: false,
      note: "Notch belum diverifikasi untuk printer ini.",
    },
  ],
  sizes: [],
  note: "Produk pada profil ini ditujukan untuk kertas struk kontinue, bukan label barcode die-cut.",
};

const scannerLabelSupport: ProductLabelSupport = {
  applicable: false,
  demoData: true,
  minWidthMm: null,
  minHeightMm: null,
  sensorTypes: [],
  sizes: [],
  note: "Scanner membaca barcode dan tidak mencetak label. Pilih printer barcode untuk mengecek ukuran label.",
};

const starterProducts: Product[] = [
  {
    name: "Kassen BT-P 3100 BT",
    code: "KAS-BTP3100",
    category: "Thermal Printer",
    brand: "Kassen",
    connections: ["Bluetooth", "USB"],
    systems: ["Windows", "Android"],
    accent: "mint",
    icon: "printer",
    description:
      "Printer thermal portable untuk kebutuhan kasir dan mobile POS.",
    status: "Tersedia",
    labelSupport: receiptPrinterLabelSupport,
  },
  {
    name: "CBT-58II",
    code: "CBT-58II",
    category: "Thermal Printer",
    brand: "Codeshop",
    connections: ["USB", "Bluetooth"],
    systems: ["Windows", "Android"],
    accent: "blue",
    icon: "printer",
    description: "Printer thermal 58 mm dengan koneksi USB dan Bluetooth.",
    status: "Tersedia",
    labelSupport: receiptPrinterLabelSupport,
  },
  {
    name: "Kassen KS-603",
    code: "KS-603",
    category: "Barcode Scanner",
    brand: "Kassen",
    connections: ["USB"],
    systems: ["Windows", "Android"],
    accent: "peach",
    icon: "scan",
    description: "Barcode scanner 2D untuk loket, retail, dan sistem POS.",
    status: "Tersedia",
    labelSupport: scannerLabelSupport,
  },
  {
    name: "Kassen TL-220",
    code: "TL-220",
    category: "Barcode Printer",
    brand: "Kassen",
    connections: ["USB", "Ethernet"],
    systems: ["Windows"],
    accent: "lavender",
    icon: "tag",
    description: "Printer barcode desktop untuk pencetakan label harian.",
    status: "Tersedia",
    labelSupport: barcodePrinterLabelSupport,
  },
];

function loadProducts(): Product[] {
  try {
    const saved = localStorage.getItem(PRODUCT_STORAGE_KEY);
    return saved
      ? (JSON.parse(saved) as Product[]).map((product) => ({
          ...product,
          compatibilityPairs: Array.isArray(product.compatibilityPairs)
            ? product.compatibilityPairs
            : undefined,
          labelSupport: {
            ...product.labelSupport,
            demoData: product.labelSupport?.demoData ?? true,
          },
        }))
      : starterProducts;
  } catch {
    return starterProducts;
  }
}

const starterIssues: TroubleshootingIssue[] = [
  {
    id: "issue-printer-paper",
    title: "Printer tidak keluar kertas",
    category: "Printer",
    level: "Umum",
    cause:
      "Posisi kertas tidak tepat, sensor paper tertutup, atau ukuran kertas pada driver tidak sesuai.",
    steps: [
      "Pastikan kertas thermal terpasang dengan sisi cetak menghadap head printer.",
      "Bersihkan sensor paper dan pastikan tidak ada sisa kertas yang tersangkut.",
      "Cocokkan ukuran kertas pada pengaturan driver dengan roll yang digunakan.",
      "Tekan tombol FEED untuk melakukan test print.",
    ],
  },
  {
    id: "issue-bluetooth",
    title: "Printer Bluetooth tidak terhubung",
    category: "Koneksi",
    level: "Umum",
    cause:
      "Printer masih terhubung ke perangkat lain, Bluetooth belum aktif, atau pairing perlu diulang.",
    steps: [
      "Pastikan printer menyala dan indikator Bluetooth berkedip.",
      "Hapus perangkat printer dari daftar Bluetooth perangkat Android.",
      "Matikan lalu nyalakan kembali Bluetooth pada perangkat.",
      "Pair kembali printer melalui pengaturan Bluetooth.",
      "Pilih printer yang sama dari aplikasi POS atau aplikasi cetak.",
    ],
  },
  {
    id: "issue-scanner-pos",
    title: "Scanner tidak terbaca di aplikasi POS",
    category: "Scanner",
    level: "Menengah",
    cause:
      "Mode koneksi scanner, kabel USB, atau fokus input pada aplikasi POS belum sesuai.",
    steps: [
      "Cabut dan pasang kembali kabel USB scanner.",
      "Pastikan kursor berada pada kolom input barcode di aplikasi POS.",
      "Scan barcode konfigurasi untuk mengembalikan mode USB HID.",
    ],
  },
];

function loadTroubleshootingIssues(): TroubleshootingIssue[] {
  try {
    const saved = localStorage.getItem(TROUBLESHOOTING_STORAGE_KEY);
    return saved
      ? (JSON.parse(saved) as TroubleshootingIssue[])
      : starterIssues;
  } catch {
    return starterIssues;
  }
}

const navItems: { label: Page; icon: string; group: string }[] = [
  { label: "Home", icon: "home", group: "WORKSPACE" },
  { label: "Produk", icon: "box", group: "WORKSPACE" },
  { label: "Troubleshooting", icon: "wrench", group: "WORKSPACE" },
  { label: "Compatibility", icon: "link", group: "WORKSPACE" },
  { label: "Software", icon: "grid", group: "RESOURCES" },
  { label: "Apps", icon: "grid", group: "RESOURCES" },
  { label: "Generator", icon: "tag", group: "RESOURCES" },
  { label: "Dokumentasi Produk", icon: "book", group: "RESOURCES" },
  { label: "Permintaan", icon: "bell", group: "RESOURCES" },
  { label: "Tutorial", icon: "book", group: "RESOURCES" },
  { label: "Playlist Tutorial", icon: "layers", group: "RESOURCES" },
  { label: "Users", icon: "shield", group: "ADMINISTRATION" },
];

const iconPaths: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6",
  box: "m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5M12 13v9",
  wrench:
    "m14.7 6.3 3-3a6 6 0 0 1-7.9 7.9l-6.5 6.5a2.1 2.1 0 1 1-3-3l6.5-6.5a6 6 0 0 1 7.9-7.9l-3 3 3 3Z",
  link: "M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  receipt: "M5 3h14v18l-3-2-4 2-4-2-3 2V3ZM8 8h8M8 12h8M8 16h4",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 17a2.5 2.5 0 0 1 2.5-2.5H20",
  layers: "m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5",
  search: "m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  chevron: "m9 18 6-6-6-6",
  down: "m7 10 5 5 5-5",
  printer:
    "M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6zM18 12h.01",
  scan: "M3 7V4a1 1 0 0 1 1-1h3M17 3h3a1 1 0 0 1 1 1v3M21 17v3a1 1 0 0 1-1 1h-3M7 21H4a1 1 0 0 1-1-1v-3M7 12h10M8 9v6M12 9v6M16 9v6",
  tag: "M20.6 13.4 13 21l-10-10V3h8l9.6 9.6a.6.6 0 0 1 0 .8ZM7 7h.01",
  bluetooth: "m7 7 10 10-5 4V3l5 4L7 17",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "m5 12 4 4L19 6",
  clock: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4",
  spark:
    "m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3ZM19 14l1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z",
  external:
    "M14 3h7v7M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  copy: "M8 8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3M5 8h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z",
  play: "m8 5 12 7-12 7V5Z",
  info: "M12 11v5m0-8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
};

function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name] ?? iconPaths.spark} />
    </svg>
  );
}

function App() {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [productItems, setProductItems] = useState<Product[]>(loadProducts);
  const [productDocumentationItems, setProductDocumentationItems] = useState<
    ProductDocumentation[]
  >([]);
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [issueItems, setIssueItems] = useState<TroubleshootingIssue[]>(
    loadTroubleshootingIssues,
  );
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [issueDraft, setIssueDraft] = useState({
    title: "",
    category: "Printer",
    level: "Umum",
    cause: "",
    steps: "",
  });
  const [issueError, setIssueError] = useState("");
  const [issueNotice, setIssueNotice] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productNotice, setProductNotice] = useState("");
  const [productError, setProductError] = useState("");
  const [playlists, setPlaylists] = useState<TutorialPlaylist[]>(
    loadTutorialPlaylists,
  );
  const [standaloneTutorials, setStandaloneTutorials] = useState<
    StandaloneTutorial[]
  >(loadStandaloneTutorials);
  const [softwareItems, setSoftwareItems] =
    useState<SoftwareItem[]>(loadSoftwareItems);
  const [appItems, setAppItems] = useState<AppCatalogItem[]>([]);
  const [showSoftwareForm, setShowSoftwareForm] = useState(false);
  const [editingSoftwareId, setEditingSoftwareId] = useState<string | null>(
    null,
  );
  const [softwareName, setSoftwareName] = useState("");
  const [softwareDescription, setSoftwareDescription] = useState("");
  const [softwareCategory, setSoftwareCategory] = useState("");
  const [softwarePlatform, setSoftwarePlatform] = useState("Windows");
  const [softwareVersion, setSoftwareVersion] = useState("");
  const [softwareDownloadUrl, setSoftwareDownloadUrl] = useState("");
  const [softwareDocumentationUrl, setSoftwareDocumentationUrl] = useState("");
  const [softwareProducts, setSoftwareProducts] = useState("");
  const [softwareError, setSoftwareError] = useState("");
  const [softwareNotice, setSoftwareNotice] = useState("");
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareItem | null>(
    null,
  );
  const [selectedLesson, setSelectedLesson] = useState<PlaylistLesson | null>(
    null,
  );
  const [previewTutorial, setPreviewTutorial] = useState<
    StandaloneTutorial | PlaylistLesson | null
  >(null);
  const [showStandaloneForm, setShowStandaloneForm] = useState(false);
  const [editingStandaloneId, setEditingStandaloneId] = useState<string | null>(
    null,
  );
  const [standaloneTitle, setStandaloneTitle] = useState("");
  const [standaloneDescription, setStandaloneDescription] = useState("");
  const [standaloneUrl, setStandaloneUrl] = useState("");
  const [standaloneDuration, setStandaloneDuration] = useState("");
  const [standaloneCategory, setStandaloneCategory] = useState("Umum");
  const [standaloneError, setStandaloneError] = useState("");
  const [standaloneNotice, setStandaloneNotice] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(
    () => loadTutorialPlaylists()[0]?.id ?? "",
  );
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [showPlaylistForm, setShowPlaylistForm] = useState(false);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(
    null,
  );
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [playlistCategory, setPlaylistCategory] = useState("Umum");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonUrl, setLessonUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");
  const [stagedLessons, setStagedLessons] = useState<PlaylistLesson[]>([]);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [playlistNotice, setPlaylistNotice] = useState("");
  const [playlistError, setPlaylistError] = useState("");
  const [activeUser, setActiveUser] = useState<DemoUser | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const initialSessionHandled = useRef(false);
  const loadedAuthUserId = useRef<string | null>(null);
  const workspaceRequestId = useRef(0);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(
    supabaseConfigured ? "" : SUPABASE_CONFIGURATION_ERROR,
  );
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("sales");
  const [editingUser, setEditingUser] = useState<DemoUser | null>(null);
  const [userFormError, setUserFormError] = useState("");
  const [showUserForm, setShowUserForm] = useState(false);
  const [userNotice, setUserNotice] = useState("");
  const [page, setPage] = useState<Page>("Home");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua kategori");
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [labelVerification, setLabelVerification] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [openIssue, setOpenIssue] = useState<string | null>(null);
  const [compatProduct, setCompatProduct] = useState(
    () => productItems[0]?.name ?? "",
  );
  const [compatSystem, setCompatSystem] = useState("Android");
  const [compatConnection, setCompatConnection] = useState("Bluetooth");
  const [checkedCompatibility, setCheckedCompatibility] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return;
    let cancelled = false;
    const loadWorkspace = async (userId: string | null) => {
      const requestId = ++workspaceRequestId.current;
      if (!userId) {
        setActiveUser(null);
        setUsers([]);
        setAuthReady(true);
        return;
      }
      setLoginError("");
      try {
        const profile = await loadProfile(userId);
        const [
          productsFromDatabase,
          issuesFromDatabase,
          softwareFromDatabase,
          appsFromDatabase,
          tutorialsFromDatabase,
          playlistsFromDatabase,
          productDocumentationFromDatabase,
          requestsFromDatabase,
        ] = await Promise.all([
          loadContent<Product>("products"),
          loadContent<TroubleshootingIssue>("troubleshooting"),
          loadContent<SoftwareItem>("software"),
          loadContent<AppCatalogItem>("apps"),
          loadContent<StandaloneTutorial>("tutorials"),
          loadContent<TutorialPlaylist>("playlists"),
          loadContent<ProductDocumentation>("product_documentation"),
          loadRequests(),
        ]);
        let nextProducts = productsFromDatabase;
        let nextIssues = issuesFromDatabase;
        let nextSoftware = softwareFromDatabase;
        const nextApps = appsFromDatabase;
        let nextTutorials = tutorialsFromDatabase;
        let nextPlaylists = playlistsFromDatabase;
        if (
          profile.role === "owner" &&
          localStorage.getItem(LEGACY_IMPORT_KEY) !== "done"
        ) {
          [
            nextProducts,
            nextIssues,
            nextSoftware,
            nextTutorials,
            nextPlaylists,
          ] = await Promise.all([
            importLegacyContent(
              "products",
              loadProducts(),
              productsFromDatabase,
              (item) => item.code,
            ),
            importLegacyContent(
              "troubleshooting",
              loadTroubleshootingIssues(),
              issuesFromDatabase,
              (item) => item.id,
            ),
            importLegacyContent(
              "software",
              loadSoftwareItems(),
              softwareFromDatabase,
              (item) => item.id,
            ),
            importLegacyContent(
              "tutorials",
              loadStandaloneTutorials(),
              tutorialsFromDatabase,
              (item) => item.id,
            ),
            importLegacyContent(
              "playlists",
              loadTutorialPlaylists(),
              playlistsFromDatabase,
              (item) => item.id,
            ),
          ]);
          for (const key of [
            USERS_STORAGE_KEY,
            SESSION_STORAGE_KEY,
            PLAYLIST_STORAGE_KEY,
            TUTORIAL_STORAGE_KEY,
            SOFTWARE_STORAGE_KEY,
            PRODUCT_STORAGE_KEY,
            TROUBLESHOOTING_STORAGE_KEY,
          ]) {
            localStorage.removeItem(key);
          }
          localStorage.setItem(LEGACY_IMPORT_KEY, "done");
        }
        const profiles =
          profile.role === "owner" ? await loadProfiles() : [profile];
        if (cancelled || requestId !== workspaceRequestId.current) return;
        setActiveUser(mapProfile(profile));
        setUsers(profiles.map(mapProfile));
        setProductItems(nextProducts);
        setIssueItems(nextIssues);
        setSoftwareItems(nextSoftware);
        setAppItems(nextApps);
        setStandaloneTutorials(nextTutorials);
        setPlaylists(nextPlaylists);
        setProductDocumentationItems(productDocumentationFromDatabase);
        setRequests(requestsFromDatabase);
        setSelectedPlaylistId(nextPlaylists[0]?.id ?? "");
        setCompatProduct((current) =>
          nextProducts.some((product) => product.name === current)
            ? current
            : (nextProducts[0]?.name ?? ""),
        );
      } catch (error) {
        if (!cancelled && requestId === workspaceRequestId.current) {
          loadedAuthUserId.current = null;
          setActiveUser(null);
          setLoginError(
            error instanceof Error
              ? error.message
              : "Gagal memuat data Supabase.",
          );
        }
      } finally {
        if (!cancelled && requestId === workspaceRequestId.current)
          setAuthReady(true);
      }
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user.id ?? null;
      if (event === "INITIAL_SESSION") {
        if (initialSessionHandled.current) return;
        initialSessionHandled.current = true;
        loadedAuthUserId.current = userId;
        void loadWorkspace(userId);
        return;
      }
      if (event === "SIGNED_OUT") {
        if (loadedAuthUserId.current === null) return;
        loadedAuthUserId.current = null;
        void loadWorkspace(null);
        return;
      }
      if (
        (event === "SIGNED_IN" || event === "USER_UPDATED") &&
        userId &&
        userId !== loadedAuthUserId.current
      ) {
        loadedAuthUserId.current = userId;
        setActiveUser(null);
        void loadWorkspace(userId);
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!activeUser?.id || !supabase) return;
    const client = supabase;
    const channel = client
      .channel("shared-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => {
          void loadRequests()
            .then(setRequests)
            .catch((error: unknown) =>
              console.error("Gagal menyegarkan permintaan tim.", error),
            );
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [activeUser?.id]);

  useEffect(() => {
    if (!authReady) return;
    const syncAuthRoute = () => {
      const expectedPath = "/";
      if (window.location.pathname !== expectedPath) {
        window.history.replaceState(
          null,
          "",
          `${expectedPath}${window.location.search}${window.location.hash}`,
        );
      }
    };
    syncAuthRoute();
    window.addEventListener("popstate", syncAuthRoute);
    return () => window.removeEventListener("popstate", syncAuthRoute);
  }, [activeUser, authReady]);

  const products = productItems;
  const isAdmin = activeUser?.role === "owner" || activeUser?.role === "admin";
  const isOwner = activeUser?.role === "owner";
  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    if (!supabase) {
      setLoginError("Konfigurasi Supabase belum tersedia.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    if (error) {
      setLoginError(
        "Email atau password tidak sesuai, atau akun belum dikonfirmasi.",
      );
      return;
    }
    setPage("Home");
  };

  const handleLogout = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setLoginError("Tidak dapat keluar dari sesi Supabase.");
    setPage("Home");
    setLoginEmail("");
    setLoginPassword("");
  };

  const closeUserForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
    setUserName("");
    setUserEmail("");
    setUserPassword("");
    setUserRole("sales");
    setUserFormError("");
  };

  const openAddUserForm = () => {
    closeUserForm();
    setShowUserForm(true);
  };

  const openEditUserForm = (user: DemoUser) => {
    if (!isOwner || user.role === "owner") return;
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserPassword("");
    setUserRole(user.role);
    setUserFormError("");
    setShowUserForm(true);
  };

  const handleAddUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwner) return;
    const savedName = userName.trim();
    const normalizedEmail = userEmail.trim().toLowerCase();
    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      setUserFormError("Email sudah digunakan.");
      return;
    }
    if (userPassword.length < 8) {
      setUserFormError("Password harus minimal 8 karakter.");
      return;
    }
    try {
      await manageUser("create", {
        name: savedName,
        email: normalizedEmail,
        password: userPassword,
        role: userRole,
      });
      setUsers((await loadProfiles()).map(mapProfile));
    } catch (error) {
      setUserFormError(
        error instanceof Error ? error.message : "Pengguna tidak dapat dibuat.",
      );
      return;
    }
    closeUserForm();
    setUserNotice(`${savedName} berhasil ditambahkan.`);
  };

  const handleEditUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwner || !editingUser) return;
    const savedName = userName.trim();
    const normalizedEmail = userEmail.trim().toLowerCase();
    if (
      users.some(
        (user) =>
          user.id !== editingUser.id &&
          user.email.toLowerCase() === normalizedEmail,
      )
    ) {
      setUserFormError("Email sudah digunakan.");
      return;
    }
    try {
      await manageUser("update", {
        userId: editingUser.id,
        name: savedName,
        email: normalizedEmail,
        role: userRole,
      });
      setUsers((await loadProfiles()).map(mapProfile));
    } catch (error) {
      setUserFormError(
        error instanceof Error
          ? error.message
          : "Pengguna tidak dapat diperbarui.",
      );
      return;
    }
    closeUserForm();
    setUserNotice(`${savedName} berhasil diperbarui.`);
  };

  const handleDeleteUser = async (user: DemoUser) => {
    if (!isOwner || user.id === activeUser?.id) return;
    if (user.role === "owner") {
      setUserNotice("Akun Admin Utama tidak dapat dihapus dari menu ini.");
      return;
    }
    if (
      !(await confirmDestructiveAction(
        "Hapus akses pengguna?",
        `${user.name} (${user.email}) tidak dapat mengakses workspace lagi.`,
      ))
    )
      return;
    try {
      await manageUser("delete", { userId: user.id });
      setUsers((await loadProfiles()).map(mapProfile));
      setUserNotice(`${user.name} telah dihapus.`);
    } catch (error) {
      setUserNotice(
        error instanceof Error
          ? error.message
          : "Pengguna tidak dapat dihapus.",
      );
    }
  };

  const clearPlaylistForm = () => {
    setShowPlaylistForm(false);
    setEditingPlaylistId(null);
    setPlaylistTitle("");
    setPlaylistDescription("");
    setPlaylistCategory("Umum");
    setStagedLessons([]);
    setLessonTitle("");
    setLessonDescription("");
    setLessonUrl("");
    setLessonDuration("");
    setEditingLessonId(null);
    setPlaylistError("");
  };

  const openPlaylistForm = (playlist?: TutorialPlaylist) => {
    if (!isAdmin) return;
    setEditingPlaylistId(playlist?.id ?? null);
    setPlaylistTitle(playlist?.title ?? "");
    setPlaylistDescription(playlist?.description ?? "");
    setPlaylistCategory(playlist?.category ?? "Umum");
    setStagedLessons(playlist?.lessons ?? []);
    setEditingLessonId(null);
    setShowPlaylistForm(true);
    setPlaylistError("");
  };

  const addStagedLesson = () => {
    if (!isAdmin || !lessonTitle.trim()) {
      setPlaylistError("Judul sub-tutorial wajib diisi.");
      return;
    }
    const trimmedUrl = lessonUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      setPlaylistError("Link harus diawali http:// atau https://.");
      return;
    }
    const updatedLesson: PlaylistLesson = {
      id: editingLessonId ?? crypto.randomUUID(),
      title: lessonTitle.trim(),
      description: lessonDescription.trim(),
      url: trimmedUrl,
      duration: lessonDuration.trim(),
    };
    setStagedLessons((lessons) =>
      editingLessonId
        ? lessons.map((lesson) =>
            lesson.id === editingLessonId ? updatedLesson : lesson,
          )
        : [...lessons, updatedLesson],
    );
    setLessonTitle("");
    setLessonDescription("");
    setLessonUrl("");
    setLessonDuration("");
    setEditingLessonId(null);
    setPlaylistError("");
  };

  const editStagedLesson = (lesson: PlaylistLesson) => {
    if (!isAdmin) return;
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonDescription(lesson.description);
    setLessonUrl(lesson.url);
    setLessonDuration(lesson.duration);
    setPlaylistError("");
  };

  const cancelLessonEdit = () => {
    setEditingLessonId(null);
    setLessonTitle("");
    setLessonDescription("");
    setLessonUrl("");
    setLessonDuration("");
    setPlaylistError("");
  };

  const confirmStagedLessonsChange = async (nextLessons: PlaylistLesson[]) => {
    const removedLesson = stagedLessons.find(
      (lesson) => !nextLessons.some((item) => item.id === lesson.id),
    );
    if (
      removedLesson &&
      !(await confirmDestructiveAction(
        "Hapus sub-tutorial?",
        `Sub-tutorial "${removedLesson.title}" akan dihapus dari draft playlist.`,
      ))
    )
      return;
    setStagedLessons(nextLessons);
  };

  const savePlaylist = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;
    if (stagedLessons.length === 0) {
      setPlaylistError("Tambahkan setidaknya satu sub-tutorial ke playlist.");
      return;
    }
    const savedPlaylist: TutorialPlaylist = {
      id: editingPlaylistId ?? crypto.randomUUID(),
      title: playlistTitle.trim(),
      description: playlistDescription.trim(),
      category: playlistCategory.trim() || "Umum",
      lessons: stagedLessons,
    };
    try {
      await saveContent("playlists", savedPlaylist.id, savedPlaylist);
    } catch (error) {
      setPlaylistError(
        error instanceof Error
          ? error.message
          : "Playlist tidak dapat disimpan ke Supabase.",
      );
      return;
    }
    setPlaylists((current) =>
      editingPlaylistId
        ? current.map((playlist) =>
            playlist.id === editingPlaylistId ? savedPlaylist : playlist,
          )
        : [...current, savedPlaylist],
    );
    setSelectedPlaylistId(savedPlaylist.id);
    setPlaylistNotice(
      `${savedPlaylist.title} berhasil ${editingPlaylistId ? "diperbarui" : "ditambahkan"}.`,
    );
    clearPlaylistForm();
  };

  const deletePlaylist = async (playlist: TutorialPlaylist) => {
    if (
      !isAdmin ||
      !(await confirmDestructiveAction(
        "Hapus playlist?",
        `Playlist "${playlist.title}" dan semua sub-tutorialnya akan dihapus.`,
      ))
    )
      return;
    try {
      await deleteContent("playlists", playlist.id);
    } catch (error) {
      setPlaylistNotice(
        error instanceof Error
          ? error.message
          : "Playlist tidak dapat dihapus dari Supabase.",
      );
      return;
    }
    const remaining = playlists.filter((item) => item.id !== playlist.id);
    setPlaylists(remaining);
    setSelectedPlaylistId(remaining[0]?.id ?? "");
    setPlaylistNotice(`Playlist ${playlist.title} berhasil dihapus.`);
  };

  const deleteLesson = async (
    playlist: TutorialPlaylist,
    lesson: PlaylistLesson,
  ) => {
    if (
      !isAdmin ||
      !(await confirmDestructiveAction(
        "Hapus sub-tutorial?",
        `Sub-tutorial "${lesson.title}" akan dihapus dari playlist.`,
      ))
    )
      return;
    const updatedPlaylist = {
      ...playlist,
      lessons: playlist.lessons.filter((entry) => entry.id !== lesson.id),
    };
    try {
      await saveContent("playlists", playlist.id, updatedPlaylist);
    } catch (error) {
      setPlaylistNotice(
        error instanceof Error
          ? error.message
          : "Sub-tutorial tidak dapat dihapus dari Supabase.",
      );
      return;
    }
    setPlaylists((current) =>
      current.map((item) => (item.id === playlist.id ? updatedPlaylist : item)),
    );
    setPlaylistNotice(`Sub-tutorial ${lesson.title} telah dihapus.`);
  };

  const clearStandaloneForm = () => {
    setShowStandaloneForm(false);
    setEditingStandaloneId(null);
    setStandaloneTitle("");
    setStandaloneDescription("");
    setStandaloneUrl("");
    setStandaloneDuration("");
    setStandaloneCategory("Umum");
    setStandaloneError("");
  };

  const openStandaloneForm = (tutorial?: StandaloneTutorial) => {
    if (!isAdmin) return;
    setEditingStandaloneId(tutorial?.id ?? null);
    setStandaloneTitle(tutorial?.title ?? "");
    setStandaloneDescription(tutorial?.description ?? "");
    setStandaloneUrl(tutorial?.url ?? "");
    setStandaloneDuration(tutorial?.duration ?? "");
    setStandaloneCategory(tutorial?.category ?? "Umum");
    setStandaloneError("");
    setShowStandaloneForm(true);
  };

  const saveStandaloneTutorial = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!isAdmin) return;
    const url = standaloneUrl.trim();
    if (!getVideoPreviewUrl(url)) {
      setStandaloneError("Masukkan link YouTube atau Google Drive yang valid.");
      return;
    }
    const item: StandaloneTutorial = {
      id: editingStandaloneId ?? crypto.randomUUID(),
      title: standaloneTitle.trim(),
      description: standaloneDescription.trim(),
      url,
      duration: standaloneDuration.trim(),
      category: standaloneCategory.trim() || "Umum",
      createdAt: editingStandaloneId
        ? (standaloneTutorials.find(
            (tutorial) => tutorial.id === editingStandaloneId,
          )?.createdAt ?? new Date().toISOString())
        : new Date().toISOString(),
    };
    try {
      await saveContent("tutorials", item.id, item);
    } catch (error) {
      setStandaloneError(
        error instanceof Error
          ? error.message
          : "Tutorial tidak dapat disimpan ke Supabase.",
      );
      return;
    }
    setStandaloneTutorials((current) =>
      editingStandaloneId
        ? current.map((tutorial) =>
            tutorial.id === editingStandaloneId ? item : tutorial,
          )
        : [item, ...current],
    );
    setStandaloneNotice(
      `${item.title} berhasil ${editingStandaloneId ? "diperbarui" : "ditambahkan"}.`,
    );
    clearStandaloneForm();
  };

  const deleteStandaloneTutorial = async (tutorial: StandaloneTutorial) => {
    if (
      !isAdmin ||
      !(await confirmDestructiveAction(
        "Hapus tutorial?",
        `Tutorial "${tutorial.title}" akan dihapus.`,
      ))
    )
      return;
    try {
      await deleteContent("tutorials", tutorial.id);
    } catch (error) {
      setStandaloneNotice(
        error instanceof Error
          ? error.message
          : "Tutorial tidak dapat dihapus dari Supabase.",
      );
      return;
    }
    setStandaloneTutorials((current) =>
      current.filter((item) => item.id !== tutorial.id),
    );
    setStandaloneNotice(`${tutorial.title} telah dihapus.`);
  };

  const clearSoftwareForm = () => {
    setShowSoftwareForm(false);
    setEditingSoftwareId(null);
    setSoftwareName("");
    setSoftwareDescription("");
    setSoftwareCategory("");
    setSoftwarePlatform("Windows");
    setSoftwareVersion("");
    setSoftwareDownloadUrl("");
    setSoftwareDocumentationUrl("");
    setSoftwareProducts("");
    setSoftwareError("");
  };

  const openSoftwareForm = (software?: SoftwareItem) => {
    if (!isAdmin) return;
    setEditingSoftwareId(software?.id ?? null);
    setSoftwareName(software?.name ?? "");
    setSoftwareDescription(software?.description ?? "");
    setSoftwareCategory(software?.category ?? "");
    setSoftwarePlatform(software?.platform ?? "Windows");
    setSoftwareVersion(software?.version ?? "");
    setSoftwareDownloadUrl(software?.downloadUrl ?? "");
    setSoftwareDocumentationUrl(software?.documentationUrl ?? "");
    setSoftwareProducts(software?.supportedProducts ?? "");
    setSoftwareError("");
    setShowSoftwareForm(true);
  };

  const saveSoftware = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;
    const downloadUrl = softwareDownloadUrl.trim();
    const documentationUrl = softwareDocumentationUrl.trim();
    const validUrl = (url: string) => !url || /^https?:\/\//i.test(url);
    if (!validUrl(downloadUrl) || !validUrl(documentationUrl)) {
      setSoftwareError(
        "Link download dan dokumentasi harus menggunakan http:// atau https://.",
      );
      return;
    }
    const savedItem: SoftwareItem = {
      id: editingSoftwareId ?? crypto.randomUUID(),
      name: softwareName.trim(),
      description: softwareDescription.trim(),
      category: softwareCategory.trim() || "Software",
      platform: softwarePlatform.trim() || "Lainnya",
      version: softwareVersion.trim(),
      downloadUrl,
      documentationUrl,
      supportedProducts: softwareProducts.trim(),
      createdAt: editingSoftwareId
        ? (softwareItems.find((item) => item.id === editingSoftwareId)
            ?.createdAt ?? new Date().toISOString())
        : new Date().toISOString(),
    };
    try {
      await saveContent("software", savedItem.id, savedItem);
    } catch (error) {
      setSoftwareError(
        error instanceof Error
          ? error.message
          : "Software tidak dapat disimpan ke Supabase.",
      );
      return;
    }
    setSoftwareItems((current) =>
      editingSoftwareId
        ? current.map((item) =>
            item.id === editingSoftwareId ? savedItem : item,
          )
        : [savedItem, ...current],
    );
    setSoftwareNotice(
      `${savedItem.name} berhasil ${editingSoftwareId ? "diperbarui" : "ditambahkan"}.`,
    );
    clearSoftwareForm();
  };

  const deleteSoftware = async (software: SoftwareItem) => {
    if (
      !isAdmin ||
      !(await confirmDestructiveAction(
        "Hapus software?",
        `Software "${software.name}" akan dihapus dari katalog.`,
      ))
    )
      return;
    try {
      await deleteContent("software", software.id);
    } catch (error) {
      setSoftwareNotice(
        error instanceof Error
          ? error.message
          : "Software tidak dapat dihapus dari Supabase.",
      );
      return;
    }
    setSoftwareItems((current) =>
      current.filter((item) => item.id !== software.id),
    );
    setSoftwareNotice(`${software.name} telah dihapus.`);
  };

  const openIssueForm = (issue?: TroubleshootingIssue) => {
    if (!isAdmin) return;
    setEditingIssueId(issue?.id ?? null);
    setIssueDraft({
      title: issue?.title ?? "",
      category: issue?.category ?? "Printer",
      level: issue?.level ?? "Umum",
      cause: issue?.cause ?? "",
      steps: issue?.steps.join("\n") ?? "",
    });
    setIssueError("");
    setShowIssueForm(true);
  };

  const clearIssueForm = () => {
    setShowIssueForm(false);
    setEditingIssueId(null);
    setIssueDraft({
      title: "",
      category: "Printer",
      level: "Umum",
      cause: "",
      steps: "",
    });
    setIssueError("");
  };

  const saveIssue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;
    const steps = issueDraft.steps
      .split("\n")
      .map((step) => step.trim())
      .filter(Boolean);
    if (
      !issueDraft.title.trim() ||
      !issueDraft.cause.trim() ||
      steps.length === 0
    ) {
      setIssueError(
        "Isi judul, kemungkinan penyebab, dan minimal satu langkah penyelesaian.",
      );
      return;
    }
    const savedIssue: TroubleshootingIssue = {
      id: editingIssueId ?? crypto.randomUUID(),
      title: issueDraft.title.trim(),
      category: issueDraft.category.trim() || "Umum",
      level: issueDraft.level.trim() || "Umum",
      cause: issueDraft.cause.trim(),
      steps,
    };
    try {
      await saveContent("troubleshooting", savedIssue.id, savedIssue);
    } catch (error) {
      setIssueError(
        error instanceof Error
          ? error.message
          : "Panduan tidak dapat disimpan ke Supabase.",
      );
      return;
    }
    setIssueItems((current) =>
      editingIssueId
        ? current.map((issue) =>
            issue.id === editingIssueId ? savedIssue : issue,
          )
        : [savedIssue, ...current],
    );
    setOpenIssue(savedIssue.id);
    setIssueNotice(
      `Panduan "${savedIssue.title}" berhasil ${editingIssueId ? "diperbarui" : "ditambahkan"}.`,
    );
    clearIssueForm();
  };

  const deleteIssue = async (issue: TroubleshootingIssue) => {
    if (
      !isAdmin ||
      !(await confirmDestructiveAction(
        "Hapus panduan?",
        `Panduan "${issue.title}" akan dihapus.`,
      ))
    )
      return;
    try {
      await deleteContent("troubleshooting", issue.id);
    } catch (error) {
      setIssueNotice(
        error instanceof Error
          ? error.message
          : "Panduan tidak dapat dihapus dari Supabase.",
      );
      return;
    }
    setIssueItems((current) => current.filter((item) => item.id !== issue.id));
    if (openIssue === issue.id) setOpenIssue(null);
    setIssueNotice(`Panduan "${issue.title}" telah dihapus.`);
  };

  const openProductEditor = (product?: Product) => {
    if (!isAdmin) return;
    setEditingProductId(product?.code ?? null);
    setProductError("");
    setShowProductForm(true);
  };

  const closeProductEditor = () => {
    setShowProductForm(false);
    setEditingProductId(null);
    setProductError("");
  };

  const saveProduct = async (product: Product) => {
    if (!isAdmin) return;
    const normalizedCode = product.code.trim().toLowerCase();
    if (
      productItems.some(
        (item) =>
          item.code.trim().toLowerCase() === normalizedCode &&
          item.code !== editingProductId,
      )
    ) {
      setProductError("Kode produk sudah digunakan. Pilih kode yang berbeda.");
      return;
    }
    const previousProduct = productItems.find(
      (item) => item.code === editingProductId,
    );
    try {
      await saveContent("products", product.code, product);
      if (previousProduct && previousProduct.code !== product.code)
        await deleteContent("products", previousProduct.code);
    } catch (error) {
      setProductError(
        error instanceof Error
          ? error.message
          : "Produk tidak dapat disimpan ke Supabase.",
      );
      return;
    }
    setProductItems((current) =>
      editingProductId
        ? current.map((item) =>
            item.code === editingProductId ? product : item,
          )
        : [...current, product],
    );
    if (previousProduct && compatProduct === previousProduct.name)
      setCompatProduct(product.name);
    if (!editingProductId && !compatProduct) setCompatProduct(product.name);
    setProductNotice(
      `${product.name} berhasil ${editingProductId ? "diperbarui" : "ditambahkan"}.`,
    );
    closeProductEditor();
  };

  const deleteProduct = async (product: Product) => {
    if (!isAdmin || productItems.length <= 1) {
      setProductNotice("Katalog harus menyisakan setidaknya satu produk.");
      return;
    }
    if (
      !(await confirmDestructiveAction(
        "Hapus produk?",
        `Produk "${product.name}" akan dihapus dari katalog.`,
      ))
    )
      return;
    try {
      await deleteContent("products", product.code);
    } catch (error) {
      setProductNotice(
        error instanceof Error
          ? error.message
          : "Produk tidak dapat dihapus dari Supabase.",
      );
      return;
    }
    const remaining = productItems.filter((item) => item.code !== product.code);
    setProductItems(remaining);
    if (compatProduct === product.name) setCompatProduct(remaining[0].name);
    if (selectedProduct?.code === product.code) setSelectedProduct(null);
    setProductNotice(`${product.name} telah dihapus.`);
  };

  const saveProductDocumentation = async (item: ProductDocumentation) => {
    if (!isAdmin)
      throw new Error("Hanya admin yang dapat mengelola dokumentasi produk.");
    await saveContent("product_documentation", item.id, item);
    setProductDocumentationItems((current) =>
      current.some((existing) => existing.id === item.id)
        ? current.map((existing) => (existing.id === item.id ? item : existing))
        : [item, ...current],
    );
  };

  const deleteProductDocumentation = async (item: ProductDocumentation) => {
    if (
      !isAdmin ||
      !(await confirmDestructiveAction(
        "Hapus dokumentasi produk?",
        `Dokumentasi untuk "${item.productName}" akan dihapus.`,
      ))
    )
      return false;
    await deleteContent("product_documentation", item.id);
    setProductDocumentationItems((current) =>
      current.filter((existing) => existing.id !== item.id),
    );
    return true;
  };

  const submitTeamRequest = async (title: string, description: string) => {
    if (!activeUser || activeUser.role !== "sales")
      throw new Error("Hanya akun sales yang dapat mengirim permintaan.");
    const request = await createRequest(
      title,
      description,
      activeUser.id,
      activeUser.name,
    );
    setRequests((current) => [request, ...current]);
  };

  const updateTeamRequestStatus = async (
    request: TeamRequest,
    status: RequestStatus,
    rejectionReason?: string,
  ) => {
    if (!isAdmin || !activeUser)
      throw new Error("Hanya admin yang dapat memproses permintaan.");
    const normalizedReason =
      status === "rejected" ? (rejectionReason?.trim() ?? "") : null;
    await setRequestStatus(request.id, status, activeUser.id, normalizedReason);
    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status,
              rejectionReason: normalizedReason,
              processedBy: activeUser.id,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  };

  const openPlaylist = (playlist: TutorialPlaylist) => {
    setSelectedPlaylistId(playlist.id);
    goTo("Playlist Tutorial");
  };

  const filteredProducts = useMemo(
    () =>
      productItems.filter((product) => {
        const verificationLabel = product.labelSupport?.demoData
          ? "belum diverifikasi"
          : "terverifikasi";
        const matchesQuery =
          `${product.name} ${product.code} ${product.brand} ${product.category} ${product.connections.join(" ")} ${verificationLabel}`
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesCategory =
          category === "Semua kategori" || product.category === category;
        const matchesConnections = selectedConnections.every((item) =>
          product.connections.includes(item),
        );
        const matchesVerification =
          labelVerification === "all" ||
          (product.category === "Barcode Printer" &&
            product.labelSupport?.demoData ===
              (labelVerification === "unverified"));
        return (
          matchesQuery &&
          matchesCategory &&
          matchesConnections &&
          matchesVerification
        );
      }),
    [category, labelVerification, productItems, query, selectedConnections],
  );
  const filteredIssues = useMemo(
    () =>
      issueItems.filter((issue) =>
        `${issue.title} ${issue.category} ${issue.cause} ${issue.steps.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [issueItems, query],
  );

  const goTo = (target: Page) => {
    if (target === "Users" && !isOwner) return;
    if (target === "Generator") {
      window.location.assign("/generator");
      return;
    }
    if (target === "Troubleshooting") setOpenIssue(null);
    setPage(target);
    setMobileNavOpen(false);
    setQuery("");
  };
  const compatibilityProduct =
    productItems.find((product) => product.name === compatProduct) ??
    productItems[0];
  const compatibilityPairs = Array.isArray(
    compatibilityProduct?.compatibilityPairs,
  )
    ? compatibilityProduct.compatibilityPairs
    : null;
  const isCompatibilityConfigured = compatibilityPairs !== null;
  const isCompatible = Boolean(
    compatibilityPairs?.some(
      (pair) =>
        pair.system === compatSystem && pair.connection === compatConnection,
    ),
  );
  const tutorialTotal =
    standaloneTutorials.length +
    playlists.reduce((total, playlist) => total + playlist.lessons.length, 0);
  const homeStats = [
    { label: "Produk", total: productItems.length },
    { label: "Tutorial", total: tutorialTotal },
    { label: "Dokumentasi produk", total: productDocumentationItems.length },
    { label: "Permintaan", total: requests.length },
    { label: "Troubleshooting", total: issueItems.length },
    { label: "Apps", total: appItems.length },
  ];
  const inProgressRequestsCount = requests.filter(
    (request) => request.status === "in_progress",
  ).length;
  const navGroups = isOwner
    ? ["WORKSPACE", "RESOURCES", "ADMINISTRATION"]
    : ["WORKSPACE", "RESOURCES"];

  if (!authReady)
    return (
      <div className="auth-loading">
        <span className="brand-mark">
          <Icon name="spark" size={22} />
        </span>
        <p>Menyiapkan pe workspace ....</p>
      </div>
    );
  if (!activeUser)
    return (
      <LoginScreen
        email={loginEmail}
        password={loginPassword}
        error={loginError}
        onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPassword}
        onSubmit={handleLogin}
      />
    );

  return (
    <div className="app-shell">
      {mobileNavOpen && (
        <button
          className="mobile-scrim"
          aria-label="Tutup menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <button
          className="brand-lockup"
          onClick={() => goTo("Home")}
          aria-label="Codeshop Technical Hub home"
        >
          <img className="brand-logo" src={brandLogo} alt="" />
          <span className="brand-copy">
            <strong>CODESHOP</strong>
            <small>TECHNICAL HUB</small>
          </span>
        </button>
        <div className="workspace-switch">
          <span className="workspace-avatar">C</span>
          <span>
            <strong>Codeshop Indonesia</strong>
            <small>Knowledge workspace</small>
          </span>
          <Icon name="down" size={15} />
        </div>
        <nav className="main-nav" aria-label="Navigasi utama">
          {navGroups.map((group) => (
            <div className="nav-group" key={group}>
              <p className="nav-label">{group}</p>
              {navItems
                .filter((item) => item.group === group)
                .map((item) => (
                  <button
                    key={item.label}
                    onClick={() => goTo(item.label)}
                    className={`nav-item ${page === item.label ? "active" : ""}`}
                  >
                    <Icon name={item.icon} />
                    <span>
                      {item.label === "Users" ? "Kelola pengguna" : item.label}
                    </span>
                    {isAdmin &&
                      item.label === "Permintaan" &&
                      inProgressRequestsCount > 0 && (
                        <span
                          className="nav-count"
                          aria-label={`${inProgressRequestsCount} permintaan sedang diproses`}
                        >
                          {inProgressRequestsCount}
                        </span>
                      )}
                  </button>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-row">
            <span className="profile-avatar">
              {activeUser.name.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <strong>{activeUser.name}</strong>
              <small>
                {activeUser.role === "owner"
                  ? "Admin Utama"
                  : activeUser.role === "admin"
                    ? "Admin"
                    : "Sales · hanya melihat"}
              </small>
            </span>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            aria-label="Buka menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <Icon name="chevron" size={14} />
            <strong>{page === "Users" ? "Kelola pengguna" : page}</strong>
          </div>
          <div className="topbar-actions">
            <span className="system-status">
              <i /> Supabase
            </span>
            <span className="topbar-avatar">
              {activeUser.name.slice(0, 2).toUpperCase()}
            </span>
            <button className="logout-button" onClick={handleLogout}>
              Keluar
            </button>
          </div>
        </header>

        {page === "Produk" && productNotice && (
          <div className="product-notice-toast">
            <Icon name="check" size={15} />
            {productNotice}
            <button
              aria-label="Tutup pemberitahuan produk"
              onClick={() => setProductNotice("")}
            >
              ×
            </button>
          </div>
        )}
        {page === "Home" && (
          <div className="page-content home-page">
            <section className="welcome-row">
              <div>
                <p className="eyebrow">
                  <span className="eyebrow-dot" /> PUSAT INFORMASI TEKNIS
                </p>
                <h1>
                  Selamat datang, {activeUser.name.split(" ")[0]} <span>✦</span>
                </h1>
                <p className="welcome-copy">
                  Temukan jawaban, pahami produk, dan bantu pelanggan lebih
                  cepat.
                </p>
              </div>
              <span
                className={`role-pill ${isAdmin ? "role-admin" : "role-sales"}`}
              >
                {activeUser.role === "owner"
                  ? "Admin Utama"
                  : activeUser.role === "admin"
                    ? "Admin · edit konten"
                    : "Sales · akses lihat"}
              </span>
            </section>
            <section className="hero-card">
              <div className="hero-content">
                <span className="hero-kicker">
                  <Icon name="spark" size={14} /> RINGKASAN WORKSPACE
                </span>
                <h2 className="home-summary-title">Data tersimpan saat ini</h2>
                <div className="home-stats-grid">
                  {homeStats.map((stat) => (
                    <div className="home-stat" key={stat.label}>
                      <span>{stat.label}</span>
                      <strong>{stat.total}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="art-orbit orbit-one" />
                <div className="art-orbit orbit-two" />
                <div className="art-glow" />
                <div className="device-card device-main">
                  <div className="device-top">
                    <span className="device-led" />
                    <span />
                    <span />
                  </div>
                  <div className="device-slot" />
                  <div className="receipt-paper">
                    <b>ORDER #0284</b>
                    <i />
                    <i />
                    <i />
                    <strong>Rp 245.000</strong>
                    <div className="barcode" />
                  </div>
                  <span className="device-brand">CODESHOP</span>
                </div>
                <div className="floating-chip chip-connect">
                  <span>
                    <Icon name="bluetooth" size={17} />
                  </span>
                  <div>
                    <b>Bluetooth</b>
                    <small>Terhubung</small>
                  </div>
                  <Icon name="check" size={15} className="chip-check" />
                </div>
                <div className="floating-chip chip-print">
                  <span>
                    <Icon name="printer" size={17} />
                  </span>
                  <div>
                    <b>Siap mencetak</b>
                    <small>CBT-58II</small>
                  </div>
                </div>
                <div className="art-star star-a">✳</div>
                <div className="art-star star-b">✦</div>
              </div>
            </section>
            <section className="home-bottom-grid">
              <div className="panel popular-panel">
                <div className="section-heading">
                  <div>
                    <h2>Produk populer</h2>
                    <p>Paling sering dicari minggu ini.</p>
                  </div>
                  <button className="text-link" onClick={() => goTo("Produk")}>
                    Lihat semua <Icon name="arrow" size={15} />
                  </button>
                </div>
                <div className="popular-list">
                  {products.slice(0, 3).map((product, index) => (
                    <button
                      className="popular-item"
                      key={product.code}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <span className={`product-thumb ${product.accent}`}>
                        <Icon name={product.icon} size={21} />
                      </span>
                      <span className="popular-info">
                        <strong>{product.name}</strong>
                        <small>
                          {product.category} <i>·</i>{" "}
                          {product.connections.join(" / ")}
                        </small>
                      </span>
                      <span className="popular-trend">
                        {index === 0
                          ? "↗ 24%"
                          : index === 1
                            ? "↗ 18%"
                            : "↗ 12%"}
                      </span>
                      <Icon
                        name="chevron"
                        size={17}
                        className="muted-chevron"
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="panel help-panel">
                <div className="help-panel-icon">
                  <Icon name="shield" size={21} />
                </div>
                <span className="help-label">PANDUAN PILIHAN</span>
                <h3>
                  Printer tidak
                  <br />
                  keluar kertas?
                </h3>
                <p>
                  Ikuti langkah sederhana untuk menemukan penyebab dan solusi.
                </p>
                <button
                  className="button-secondary"
                  onClick={() => {
                    goTo("Troubleshooting");
                    setOpenIssue(issueItems[0]?.id ?? null);
                  }}
                >
                  Buka panduan <Icon name="arrow" size={15} />
                </button>
                <div className="help-decoration">✳</div>
              </div>
            </section>
            <footer className="page-footer">
              <span>
                © 2026 Codeshop Technical Hub - Dikembangkan oleh Krisna
              </span>
              <span>
                <i /> Informasi diperbarui hari ini
              </span>
            </footer>
          </div>
        )}

        {page === "Produk" && (
          <div className="page-content inner-page">
            <div className="page-title-row">
              <div>
                <p className="eyebrow">KATALOG PRODUK</p>
                <h1>Jelajahi produk</h1>
                <p className="welcome-copy">
                  Spesifikasi, konektivitas, dan informasi produk Codeshop.
                </p>
              </div>
              {isAdmin && (
                <button
                  className="button-primary"
                  onClick={() => openProductEditor()}
                >
                  <Icon name="plus" size={15} /> Tambah produk
                </button>
              )}
            </div>
            <div className="filter-bar">
              <label className="filter-search">
                <Icon name="search" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama atau kode produk..."
                />
              </label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option>Semua kategori</option>
                <option>Thermal Printer</option>
                <option>Barcode Scanner</option>
                <option>Barcode Printer</option>
              </select>
              <fieldset className="connection-filter">
                <legend>Interface</legend>
                {compatibilityConnections.map((item) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      checked={selectedConnections.includes(item)}
                      onChange={(event) =>
                        setSelectedConnections((current) =>
                          event.target.checked
                            ? [...current, item]
                            : current.filter(
                                (connectionItem) => connectionItem !== item,
                              ),
                        )
                      }
                    />
                    {item}
                  </label>
                ))}
              </fieldset>
              <select
                aria-label="Filter verifikasi dukungan label barcode"
                value={labelVerification}
                onChange={(event) => setLabelVerification(event.target.value)}
              >
                <option value="all">Semua status label</option>
                <option value="unverified">Belum diverifikasi</option>
                <option value="verified">Terverifikasi</option>
              </select>
            </div>
            <div className="results-caption">
              <span>
                <strong>{filteredProducts.length}</strong> produk ditemukan
              </span>
              <button className="sort-button">
                Terbaru <Icon name="down" size={14} />
              </button>
            </div>
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.code}
                  product={product}
                  isAdmin={isAdmin}
                  onClick={() => setSelectedProduct(product)}
                  onEdit={() => openProductEditor(product)}
                  onDelete={() => deleteProduct(product)}
                />
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="empty-state">
                <span>
                  <Icon name="search" size={23} />
                </span>
                <h3>Produk tidak ditemukan</h3>
                <p>Coba kata kunci atau filter yang berbeda.</p>
                <button
                  className="text-link"
                  onClick={() => {
                    setQuery("");
                    setCategory("Semua kategori");
                    setSelectedConnections([]);
                    setLabelVerification("all");
                  }}
                >
                  Hapus semua filter
                </button>
              </div>
            )}
          </div>
        )}

        {page === "Troubleshooting" && (
          <div className="page-content inner-page">
            <div className="page-title-row">
              <div>
                <p className="eyebrow">PUSAT BANTUAN</p>
                <h1>Troubleshooting</h1>
                <p className="welcome-copy">
                  Solusi praktis untuk kendala yang paling sering terjadi.
                </p>
              </div>
              <span className="knowledge-badge">
                <Icon name="shield" size={16} /> Knowledge base
              </span>
            </div>
            <div className="trouble-banner">
              <span className="trouble-banner-icon">
                <Icon name="wrench" size={23} />
              </span>
              <div>
                <strong>Apa kendala yang Anda alami?</strong>
                <p>Cari berdasarkan gejala, produk, atau kata kunci.</p>
              </div>
              <label className="trouble-search">
                <Icon name="search" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Contoh: printer tidak terhubung..."
                />
              </label>
            </div>
            {issueNotice && (
              <div className="product-notice-toast">
                <Icon name="check" size={15} />
                {issueNotice}
                <button
                  aria-label="Tutup pemberitahuan panduan"
                  onClick={() => setIssueNotice("")}
                >
                  ×
                </button>
              </div>
            )}
            <div className="trouble-layout">
              <div className="issue-list">
                <div className="section-heading">
                  <div>
                    <h2>Solusi populer</h2>
                    <p>Panduan teknis dari tim Codeshop.</p>
                  </div>
                  <div className="issue-list-actions">
                    <span className="count-pill">
                      {filteredIssues.length} artikel
                    </span>
                    {isAdmin && (
                      <button
                        className="button-primary"
                        onClick={() => openIssueForm()}
                      >
                        <Icon
                          name={showIssueForm ? "down" : "plus"}
                          size={15}
                        />{" "}
                        Tambah panduan
                      </button>
                    )}
                  </div>
                </div>
                {showIssueForm && isAdmin && (
                  <form className="issue-editor panel" onSubmit={saveIssue}>
                    <div className="form-heading">
                      <span className="form-icon">
                        <Icon name="wrench" size={19} />
                      </span>
                      <div>
                        <h2>
                          {editingIssueId ? "Edit panduan" : "Tambah panduan"}
                        </h2>
                        <p>
                          Lengkapi informasi kendala dan langkah penanganannya.
                        </p>
                      </div>
                    </div>
                    <div className="issue-editor-grid">
                      <label className="issue-editor-field">
                        Judul kendala
                        <input
                          required
                          value={issueDraft.title}
                          onChange={(event) =>
                            setIssueDraft((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          placeholder="Contoh: Printer tidak terdeteksi"
                        />
                      </label>
                      <label className="issue-editor-field">
                        Kategori
                        <select
                          value={issueDraft.category}
                          onChange={(event) =>
                            setIssueDraft((current) => ({
                              ...current,
                              category: event.target.value,
                            }))
                          }
                        >
                          <option>Printer</option>
                          <option>Koneksi</option>
                          <option>Scanner</option>
                          <option>Aplikasi</option>
                          <option>Jaringan</option>
                          <option>Lainnya</option>
                        </select>
                      </label>
                      <label className="issue-editor-field">
                        Tingkat kesulitan
                        <select
                          value={issueDraft.level}
                          onChange={(event) =>
                            setIssueDraft((current) => ({
                              ...current,
                              level: event.target.value,
                            }))
                          }
                        >
                          <option>Umum</option>
                          <option>Menengah</option>
                          <option>Lanjutan</option>
                        </select>
                      </label>
                      <label className="issue-editor-field issue-editor-wide">
                        Kemungkinan penyebab
                        <textarea
                          required
                          rows={2}
                          value={issueDraft.cause}
                          onChange={(event) =>
                            setIssueDraft((current) => ({
                              ...current,
                              cause: event.target.value,
                            }))
                          }
                          placeholder="Jelaskan penyebab yang mungkin terjadi"
                        />
                      </label>
                      <label className="issue-editor-field issue-editor-wide">
                        Langkah penyelesaian
                        <textarea
                          required
                          rows={5}
                          value={issueDraft.steps}
                          onChange={(event) =>
                            setIssueDraft((current) => ({
                              ...current,
                              steps: event.target.value,
                            }))
                          }
                          placeholder={
                            "Satu langkah per baris\nContoh: Periksa sambungan kabel"
                          }
                        />
                      </label>
                    </div>
                    {issueError && (
                      <p className="issue-editor-error" role="alert">
                        {issueError}
                      </p>
                    )}
                    <div className="issue-editor-footer">
                      <span>Setiap baris menjadi satu langkah panduan.</span>
                      <div>
                        <button
                          className="button-secondary"
                          type="button"
                          onClick={clearIssueForm}
                        >
                          Batal
                        </button>
                        <button className="button-primary" type="submit">
                          {editingIssueId
                            ? "Simpan perubahan"
                            : "Simpan panduan"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
                {filteredIssues.map((issue) => (
                  <article
                    className={`issue-card ${openIssue === issue.id ? "issue-open" : ""}`}
                    key={issue.id}
                  >
                    <button
                      className="issue-header"
                      onClick={() =>
                        setOpenIssue(openIssue === issue.id ? null : issue.id)
                      }
                    >
                      <span className="issue-icon">
                        <Icon
                          name={
                            issue.category === "Scanner" ? "scan" : "printer"
                          }
                          size={19}
                        />
                      </span>
                      <span className="issue-title">
                        <strong>{issue.title}</strong>
                        <small>
                          {issue.category} <i>·</i> {issue.steps.length} langkah
                        </small>
                      </span>
                      <span className="issue-level">{issue.level}</span>
                      <Icon name="down" size={17} className="issue-chevron" />
                    </button>
                    {isAdmin && (
                      <div className="issue-admin-actions">
                        <button
                          type="button"
                          onClick={() => openIssueForm(issue)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteIssue(issue)}
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                    {openIssue === issue.id && (
                      <div className="issue-content">
                        <div className="cause-block">
                          <strong>
                            <span>!</span> Kemungkinan penyebab
                          </strong>
                          <p>{issue.cause}</p>
                        </div>
                        <strong className="steps-title">
                          Langkah penyelesaian
                        </strong>
                        <ol className="steps-list">
                          {issue.steps.map((step, index) => (
                            <li key={`${issue.id}-${index}`}>
                              <span>{index + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                        <button
                          className="inline-tutorial"
                          onClick={() => goTo("Tutorial")}
                        >
                          <Icon name="book" size={15} /> Lihat tutorial terkait{" "}
                          <Icon name="arrow" size={14} />
                        </button>
                      </div>
                    )}
                  </article>
                ))}
                {filteredIssues.length === 0 && (
                  <div className="empty-state">
                    <h3>Solusi tidak ditemukan</h3>
                    <p>Coba kata kunci lain atau pilih kategori berbeda.</p>
                    {isAdmin && query === "" && (
                      <button
                        className="button-primary"
                        onClick={() => openIssueForm()}
                      >
                        Tambah panduan
                      </button>
                    )}
                  </div>
                )}
              </div>
              <aside className="trouble-aside">
                <div className="aside-card">
                  <span className="aside-card-icon">
                    <Icon name="spark" size={19} />
                  </span>
                  <h3>Belum menemukan solusi?</h3>
                  <p>
                    Hubungi tim teknis kami untuk mendapatkan bantuan lebih
                    lanjut.
                  </p>
                  <button
                    className="button-secondary"
                    onClick={() => goTo("Produk")}
                  >
                    Cari berdasarkan produk <Icon name="arrow" size={14} />
                  </button>
                </div>
                <div className="tip-card">
                  <strong>Tips cepat</strong>
                  <p>
                    Pastikan perangkat menyala dan semua kabel terhubung sebelum
                    memulai troubleshooting.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        )}

        {page === "Compatibility" && (
          <div className="page-content inner-page">
            <div className="page-title-row">
              <div>
                <p className="eyebrow">CEK KOMPATIBILITAS</p>
                <h1>Semua perangkat, selaras.</h1>
                <p className="welcome-copy">
                  Pastikan produk Anda cocok dengan sistem dan koneksi yang
                  digunakan.
                </p>
              </div>
              <span className="knowledge-badge">
                <Icon name="check" size={16} /> Data terverifikasi
              </span>
            </div>
            <div className="compat-layout">
              <section className="compat-form panel">
                <div className="form-heading">
                  <span className="form-icon">
                    <Icon name="link" size={20} />
                  </span>
                  <div>
                    <h2>Compatibility checker</h2>
                    <p>Pilih konfigurasi untuk melihat hasilnya.</p>
                  </div>
                </div>
                <label className="field-label">
                  Produk yang digunakan
                  <select
                    value={compatProduct}
                    onChange={(event) => {
                      setCompatProduct(event.target.value);
                      setCheckedCompatibility(false);
                    }}
                  >
                    {products.map((product) => (
                      <option key={product.code}>{product.name}</option>
                    ))}
                  </select>
                </label>
                <div className="field-row">
                  <label className="field-label">
                    Operating system
                    <select
                      value={compatSystem}
                      onChange={(event) => {
                        setCompatSystem(event.target.value);
                        setCheckedCompatibility(false);
                      }}
                    >
                      <option>Windows</option>
                      <option>Android</option>
                      <option>iOS</option>
                      <option>macOS</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Koneksi
                    <select
                      value={compatConnection}
                      onChange={(event) => {
                        setCompatConnection(event.target.value);
                        setCheckedCompatibility(false);
                      }}
                    >
                      <option>Bluetooth</option>
                      <option>USB</option>
                      <option>Ethernet</option>
                    </select>
                  </label>
                </div>
                <button
                  className="button-primary check-button"
                  onClick={() => setCheckedCompatibility(true)}
                >
                  Cek kompatibilitas <Icon name="arrow" size={16} />
                </button>
              </section>
              <section
                className={`compat-result panel ${checkedCompatibility ? (!isCompatibilityConfigured ? "result-unconfigured" : isCompatible ? "result-supported" : "result-unsupported") : ""}`}
              >
                <div className="result-decoration">
                  <Icon name="link" size={22} />
                </div>
                {checkedCompatibility ? (
                  <>
                    <span
                      className={`result-symbol ${isCompatible ? "supported" : "unsupported"}`}
                    >
                      <Icon name={isCompatible ? "check" : "plus"} size={24} />
                    </span>
                    <span
                      className={`result-label ${isCompatible ? "supported-text" : "unsupported-text"}`}
                    >
                      {isCompatible
                        ? "KOMPATIBEL"
                        : isCompatibilityConfigured
                          ? "BELUM KOMPATIBEL"
                          : "BELUM DIVERIFIKASI"}
                    </span>
                    <h2>
                      {!isCompatibilityConfigured
                        ? "Data kombinasi belum tersedia."
                        : isCompatible
                          ? "Kombinasi ini didukung."
                          : "Kombinasi belum didukung."}
                    </h2>
                    <p>
                      {!isCompatibilityConfigured
                        ? `Pasangan OS dan koneksi ${compatProduct} belum diverifikasi. Perbarui data pasangan di menu Produk.`
                        : `${compatProduct} ${isCompatible ? "mendukung" : "belum mendukung"} ${compatSystem} melalui koneksi ${compatConnection}.`}
                    </p>
                    <div className="compat-checks">
                      <span
                        className={
                          !isCompatibilityConfigured
                            ? "check-unknown"
                            : isCompatible
                              ? "check-yes"
                              : "check-no"
                        }
                      >
                        <Icon
                          name={
                            !isCompatibilityConfigured
                              ? "spark"
                              : isCompatible
                                ? "check"
                                : "plus"
                          }
                          size={15}
                        />{" "}
                        {compatSystem} + {compatConnection}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="result-symbol idle">
                      <Icon name="spark" size={23} />
                    </span>
                    <span className="result-label">HASIL PENGECEKAN</span>
                    <h2>Siap untuk diperiksa.</h2>
                    <p>
                      Pilih produk, sistem operasi, dan koneksi untuk melihat
                      status kompatibilitas.
                    </p>
                    <div className="result-placeholder">
                      <span />
                      <span />
                      <span />
                    </div>
                  </>
                )}
              </section>
            </div>
            <div className="compat-footnote">
              <Icon name="shield" size={16} />
              <span>
                Hasil berdasarkan informasi produk yang tersedia. Butuh bantuan?{" "}
                <button onClick={() => goTo("Troubleshooting")}>
                  Hubungi tim teknis
                </button>
              </span>
            </div>
          </div>
        )}

        {page === "Tutorial" && (
          <TutorialLibraryPage
            playlists={playlists}
            tutorials={standaloneTutorials}
            isAdmin={isAdmin}
            onOpenPlaylist={openPlaylist}
            onOpenTutorial={setPreviewTutorial}
            onAddTutorial={() => openStandaloneForm()}
            onEditTutorial={openStandaloneForm}
            onDeleteTutorial={deleteStandaloneTutorial}
            showForm={showStandaloneForm}
            editingId={editingStandaloneId}
            title={standaloneTitle}
            setTitle={setStandaloneTitle}
            description={standaloneDescription}
            setDescription={setStandaloneDescription}
            url={standaloneUrl}
            setUrl={setStandaloneUrl}
            duration={standaloneDuration}
            setDuration={setStandaloneDuration}
            category={standaloneCategory}
            setCategory={setStandaloneCategory}
            error={standaloneError}
            notice={standaloneNotice}
            setNotice={setStandaloneNotice}
            onSave={saveStandaloneTutorial}
            onCancel={clearStandaloneForm}
            onGoPlaylists={() => goTo("Playlist Tutorial")}
          />
        )}
        {page === "Playlist Tutorial" && (
          <TutorialPlaylistPage
            playlists={playlists}
            isAdmin={isAdmin}
            selectedPlaylistId={selectedPlaylistId}
            onSelectPlaylist={setSelectedPlaylistId}
            onAddPlaylist={() => openPlaylistForm()}
            onEditPlaylist={openPlaylistForm}
            onDeletePlaylist={deletePlaylist}
            onDeleteLesson={deleteLesson}
            showForm={showPlaylistForm}
            editingPlaylistId={editingPlaylistId}
            playlistTitle={playlistTitle}
            setPlaylistTitle={setPlaylistTitle}
            playlistDescription={playlistDescription}
            setPlaylistDescription={setPlaylistDescription}
            playlistCategory={playlistCategory}
            setPlaylistCategory={setPlaylistCategory}
            lessonTitle={lessonTitle}
            setLessonTitle={setLessonTitle}
            lessonDescription={lessonDescription}
            setLessonDescription={setLessonDescription}
            lessonUrl={lessonUrl}
            setLessonUrl={setLessonUrl}
            lessonDuration={lessonDuration}
            setLessonDuration={setLessonDuration}
            stagedLessons={stagedLessons}
            setStagedLessons={confirmStagedLessonsChange}
            editingLessonId={editingLessonId}
            onEditLesson={editStagedLesson}
            onCancelLessonEdit={cancelLessonEdit}
            onAddLesson={addStagedLesson}
            onSavePlaylist={savePlaylist}
            onCancelForm={clearPlaylistForm}
            error={playlistError}
            notice={playlistNotice}
            setNotice={setPlaylistNotice}
            search={playlistSearch}
            setSearch={setPlaylistSearch}
            onOpenLesson={setSelectedLesson}
          />
        )}
        {page === "Software" && (
          <SoftwareCatalogPage
            items={softwareItems}
            isAdmin={isAdmin}
            showForm={showSoftwareForm}
            editingId={editingSoftwareId}
            name={softwareName}
            setName={setSoftwareName}
            description={softwareDescription}
            setDescription={setSoftwareDescription}
            category={softwareCategory}
            setCategory={setSoftwareCategory}
            platform={softwarePlatform}
            setPlatform={setSoftwarePlatform}
            version={softwareVersion}
            setVersion={setSoftwareVersion}
            downloadUrl={softwareDownloadUrl}
            setDownloadUrl={setSoftwareDownloadUrl}
            documentationUrl={softwareDocumentationUrl}
            setDocumentationUrl={setSoftwareDocumentationUrl}
            supportedProducts={softwareProducts}
            setSupportedProducts={setSoftwareProducts}
            error={softwareError}
            notice={softwareNotice}
            setNotice={setSoftwareNotice}
            onAdd={() => openSoftwareForm()}
            onEdit={openSoftwareForm}
            onDelete={deleteSoftware}
            onSave={saveSoftware}
            onCancel={clearSoftwareForm}
            onOpenDetails={setSelectedSoftware}
          />
        )}
        {page === "Apps" && (
          <AppsCatalogPage
            items={appItems}
            isAdmin={isAdmin}
            onSave={async (appItem) => {
              if (!isAdmin)
                throw new Error("Hanya admin yang dapat mengelola Apps.");
              if (
                appItems.some(
                  (item) =>
                    item.id !== appItem.id &&
                    item.name.trim().toLowerCase() ===
                      appItem.name.trim().toLowerCase(),
                )
              ) {
                throw new Error("Nama app tersebut sudah terdaftar.");
              }
              await saveContent("apps", appItem.id, appItem);
              setAppItems((current) =>
                current.some((item) => item.id === appItem.id)
                  ? current.map((item) =>
                      item.id === appItem.id ? appItem : item,
                    )
                  : [appItem, ...current],
              );
            }}
            onDelete={async (appItem) => {
              if (
                !isAdmin ||
                !(await confirmDestructiveAction(
                  "Hapus app dari katalog?",
                  `Status dukungan ${appItem.name} pada produk tidak akan ditampilkan lagi.`,
                ))
              )
                return false;
              await deleteContent("apps", appItem.id);
              setAppItems((current) =>
                current.filter((item) => item.id !== appItem.id),
              );
              return true;
            }}
          />
        )}
        {page === "Dokumentasi Produk" && (
          <ProductDocumentationPage
            items={productDocumentationItems}
            isAdmin={isAdmin}
            onSave={saveProductDocumentation}
            onDelete={deleteProductDocumentation}
          />
        )}
        {page === "Permintaan" && (
          <RequestsPage
            items={requests}
            isAdmin={isAdmin}
            canSubmit={activeUser.role === "sales"}
            onCreate={submitTeamRequest}
            onSetStatus={updateTeamRequestStatus}
          />
        )}
        {page === "Users" && isOwner && (
          <div className="page-content inner-page users-page">
            <div className="page-title-row">
              <div>
                <p className="eyebrow">ADMINISTRATION</p>
                <h1>Kelola pengguna</h1>
                <p className="welcome-copy">
                  Buat akses tim dan atur peran untuk workspace demo ini.
                </p>
              </div>
              <button
                className="button-primary"
                onClick={() => {
                  if (showUserForm) closeUserForm();
                  else openAddUserForm();
                }}
              >
                <Icon name={showUserForm ? "down" : "plus"} size={16} />{" "}
                {showUserForm ? "Tutup form" : "Tambah pengguna"}
              </button>
            </div>
            <div className="role-summary-grid">
              <div className="role-summary-card">
                <span className="summary-icon admin-summary">
                  <Icon name="shield" size={18} />
                </span>
                <span>
                  <small>ADMIN UTAMA</small>
                  <strong>
                    {users.filter((user) => user.role === "owner").length}
                  </strong>
                </span>
                <p>Akses penuh + kelola pengguna</p>
              </div>
              <div className="role-summary-card">
                <span className="summary-icon admin-summary">
                  <Icon name="box" size={18} />
                </span>
                <span>
                  <small>ADMIN</small>
                  <strong>
                    {users.filter((user) => user.role === "admin").length}
                  </strong>
                </span>
                <p>Edit seluruh konten</p>
              </div>
              <div className="role-summary-card">
                <span className="summary-icon sales-summary">
                  <Icon name="book" size={18} />
                </span>
                <span>
                  <small>SALES</small>
                  <strong>
                    {users.filter((user) => user.role === "sales").length}
                  </strong>
                </span>
                <p>Akses baca saja ke knowledge base</p>
              </div>
            </div>
            {userNotice && (
              <div className="user-notice">
                <Icon name="check" size={16} />
                {userNotice}
                <button
                  aria-label="Tutup pemberitahuan"
                  onClick={() => setUserNotice("")}
                >
                  ×
                </button>
              </div>
            )}
            {showUserForm && (
              <form
                className="add-user-form panel"
                onSubmit={editingUser ? handleEditUser : handleAddUser}
              >
                <div className="form-heading">
                  <span className="form-icon">
                    <Icon name={editingUser ? "check" : "plus"} size={19} />
                  </span>
                  <div>
                    <h2>{editingUser ? "Edit pengguna" : "Pengguna baru"}</h2>
                    <p>
                      {editingUser
                        ? "Perbarui nama, email, atau role akun."
                        : "Admin Utama dapat menambahkan Admin atau akun Sales."}
                    </p>
                  </div>
                </div>
                <div className="user-form-fields">
                  <label className="field-label">
                    Nama lengkap
                    <input
                      required
                      value={userName}
                      onChange={(event) => setUserName(event.target.value)}
                      placeholder="Contoh: Siti Rahma"
                    />
                  </label>
                  <label className="field-label">
                    Email
                    <input
                      required
                      type="email"
                      value={userEmail}
                      onChange={(event) => setUserEmail(event.target.value)}
                      placeholder="nama@codeshop.test"
                    />
                  </label>
                  {!editingUser && (
                    <label className="field-label">
                      Password sementara
                      <input
                        required
                        minLength={8}
                        type="password"
                        value={userPassword}
                        onChange={(event) =>
                          setUserPassword(event.target.value)
                        }
                        placeholder="Minimal 8 karakter"
                      />
                    </label>
                  )}
                  <label className="field-label">
                    Role
                    <select
                      value={userRole}
                      onChange={(event) =>
                        setUserRole(event.target.value as UserRole)
                      }
                    >
                      <option value="sales">Sales — hanya melihat</option>
                      <option value="admin">Admin — edit seluruh konten</option>
                    </select>
                  </label>
                </div>
                {userFormError && <p className="form-error">{userFormError}</p>}
                <div className="user-form-footer">
                  <span>
                    {editingUser
                      ? "Perubahan email disinkronkan ke Supabase Auth."
                      : "Password dikelola aman oleh Supabase Auth."}
                  </span>
                  <div className="user-form-actions">
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={closeUserForm}
                    >
                      Batal
                    </button>
                    <button className="button-primary" type="submit">
                      {editingUser ? "Simpan perubahan" : "Buat pengguna"}{" "}
                      <Icon name="arrow" size={15} />
                    </button>
                  </div>
                </div>
              </form>
            )}
            <section className="users-panel panel">
              <div className="users-panel-heading">
                <div>
                  <h2>Semua pengguna</h2>
                  <p>{users.length} akun di Supabase Auth</p>
                </div>
                <span className="count-pill">SUPABASE AUTH</span>
              </div>
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Pengguna</th>
                      <th>Role</th>
                      <th>Dibuat</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <span className="user-cell">
                            <span className={`user-avatar ${user.role}`}>
                              {user.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span>
                              <strong>
                                {user.name}
                                {user.id === activeUser.id && <i>Anda</i>}
                              </strong>
                              <small>{user.email}</small>
                            </span>
                          </span>
                        </td>
                        <td>
                          <span className={`user-role-tag ${user.role}`}>
                            {user.role === "owner"
                              ? "Admin Utama"
                              : user.role === "admin"
                                ? "Admin"
                                : "Sales"}
                          </span>
                        </td>
                        <td>
                          {new Date(user.createdAt).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </td>
                        <td>
                          {user.id === activeUser.id ? (
                            <span className="current-account">Akun Anda</span>
                          ) : user.role === "owner" ? (
                            <span className="current-account">Admin Utama</span>
                          ) : (
                            <div className="user-row-actions">
                              <button
                                className="edit-user-button"
                                onClick={() => openEditUserForm(user)}
                              >
                                Edit
                              </button>
                              <button
                                className="delete-user-button"
                                onClick={() => handleDeleteUser(user)}
                                aria-label={`Hapus pengguna ${user.name}`}
                              >
                                Hapus
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="demo-warning">
              <Icon name="shield" size={17} />
              <span
                className={`role-pill ${isAdmin ? "role-admin" : "role-sales"}`}
              >
                {activeUser.role === "owner"
                  ? "Admin Utama"
                  : activeUser.role === "admin"
                    ? "Admin · edit konten"
                    : "Sales · akses lihat"}
              </span>
            </div>
          </div>
        )}
      </main>
      {selectedLesson && (
        <VideoPreviewModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
        />
      )}
      {previewTutorial && (
        <VideoPreviewModal
          lesson={previewTutorial}
          onClose={() => setPreviewTutorial(null)}
        />
      )}
      {selectedSoftware && (
        <SoftwareDetailsModal
          software={selectedSoftware}
          onClose={() => setSelectedSoftware(null)}
        />
      )}
      {showProductForm && isAdmin && (
        <ProductEditorModal
          key={editingProductId ?? "new-product"}
          initialProduct={
            productItems.find((item) => item.code === editingProductId) ?? null
          }
          error={productError}
          apps={appItems}
          onSave={saveProduct}
          onCancel={closeProductEditor}
        />
      )}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          apps={appItems}
          onClose={() => setSelectedProduct(null)}
          onCheckCompatibility={() => {
            setSelectedProduct(null);
            goTo("Compatibility");
          }}
          onTroubleshoot={() => {
            setSelectedProduct(null);
            goTo("Troubleshooting");
          }}
        />
      )}
    </div>
  );
}

function ProductDetailsModal({
  product,
  apps,
  onClose,
  onCheckCompatibility,
  onTroubleshoot,
}: {
  product: Product;
  apps: AppCatalogItem[];
  onClose: () => void;
  onCheckCompatibility: () => void;
  onTroubleshoot: () => void;
}) {
  const labelSupport = product.labelSupport;
  const compatibilitySummary = Array.isArray(product.compatibilityPairs)
    ? product.compatibilityPairs.length > 0
      ? product.compatibilityPairs
          .map((pair) => `${pair.system} · ${pair.connection}`)
          .join(", ")
      : "Tidak ada kombinasi yang didukung"
    : "Belum diverifikasi";
  const appStatusLabels: Record<AppSupportStatus, string> = {
    supported: "Mendukung",
    unsupported: "Tidak mendukung",
    "not-tested": "Belum dapat diuji",
  };
  const bluetoothDeviceSupportLabels: Record<BluetoothDeviceSupport, string> = {
    single: "1 perangkat",
    middle: "2–5 perangkat",
    "up-to-10": "Hingga 10 perangkat",
    "other-device": "Perangkat lain (acak)",
  };
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="product-modal product-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          aria-label="Tutup detail produk"
          onClick={onClose}
        >
          ×
        </button>
        <span className={`product-thumb modal-thumb ${product.accent}`}>
          <Icon name={product.icon} size={26} />
        </span>
        <span className="product-status">
          <i /> {product.status}
        </span>
        <p className="eyebrow">
          {product.category.toUpperCase()} · {product.brand.toUpperCase()}
        </p>
        <h2 id="product-modal-title">{product.name}</h2>
        <p className="modal-description">{product.description}</p>
        <div className="modal-details">
          <div>
            <small>Kode produk</small>
            <strong>{product.code}</strong>
          </div>
          <div>
            <small>Kombinasi OS · koneksi</small>
            <strong>{compatibilitySummary}</strong>
          </div>
          <div>
            <small>Kategori</small>
            <strong>{product.category}</strong>
          </div>
          {product.connections.includes("Bluetooth") && (
            <div>
              <small>Dukungan perangkat Bluetooth</small>
              <strong>
                {product.bluetoothDeviceSupport
                  ? bluetoothDeviceSupportLabels[product.bluetoothDeviceSupport]
                  : "Belum diverifikasi"}
              </strong>
            </div>
          )}
        </div>
        {product.category === "Barcode Printer" && (
          <section className="barcode-print-specs">
            <h3>Metode cetak</h3>
            <dl>
              <div>
                <dt>Metode</dt>
                <dd>
                  {product.barcodePrintingMethod === "direct-thermal"
                    ? "Direct thermal"
                    : product.barcodePrintingMethod === "thermal-transfer"
                      ? "Thermal transfer"
                      : product.barcodePrintingMethod === "both"
                        ? "Direct thermal & thermal transfer"
                        : "Belum ditentukan"}
                </dd>
              </div>
              {(product.barcodePrintingMethod === "thermal-transfer" ||
                product.barcodePrintingMethod === "both") && (
                <>
                  <div>
                    <dt>Lebar ribbon</dt>
                    <dd>
                      {product.ribbonWidthMm
                        ? `${product.ribbonWidthMm} mm`
                        : "Belum ditentukan"}
                    </dd>
                  </div>
                  <div>
                    <dt>Panjang ribbon</dt>
                    <dd>
                      {product.ribbonLengthM
                        ? `${product.ribbonLengthM} meter`
                        : "Belum ditentukan"}
                    </dd>
                  </div>
                  {product.ribbonNote && (
                    <div className="barcode-ribbon-note">
                      <dt>Catatan ribbon</dt>
                      <dd>{product.ribbonNote}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </section>
        )}
        {product.category === "Thermal Printer" && (
          <section className="product-app-support">
            <div className="product-app-support-heading">
              <h3>Dukungan aplikasi</h3>
              <span>{apps.length} app</span>
            </div>
            {apps.length > 0 ? (
              <div className="product-app-support-list">
                {apps.map((appItem) => {
                  const status = product.appSupport?.[appItem.id];
                  return (
                    <div className="product-app-support-row" key={appItem.id}>
                      <span>
                        <strong>{appItem.name}</strong>
                        <small>{appItem.platform}</small>
                      </span>
                      <span
                        className={`app-support-status ${status ?? "unrated"}`}
                      >
                        {status ? appStatusLabels[status] : "Belum dinilai"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="product-app-support-empty">
                Belum ada app di katalog. Tambahkan app melalui menu Apps.
              </p>
            )}
          </section>
        )}
        <section className="label-support-panel">
          <div className="label-support-heading">
            <span className="label-support-icon">
              <Icon name="tag" size={18} />
            </span>
            <div>
              <p className="eyebrow">LABEL COMPATIBILITY</p>
              <h3>Dukungan label barcode</h3>
            </div>
            <span
              className={`label-demo-badge ${labelSupport.demoData ? "" : "label-verified-badge"}`}
            >
              {labelSupport.demoData ? "BELUM DIVERIFIKASI" : "TERVERIFIKASI"}
            </span>
          </div>
          {labelSupport.demoData && (
            <div className="label-demo-warning">
              <Icon name="shield" size={14} />
              <span>
                Data contoh untuk pengujian tampilan, bukan spesifikasi resmi.
                Verifikasi dengan datasheet dan test print sebelum dibagikan ke
                customer.
              </span>
            </div>
          )}
          {!labelSupport.applicable ? (
            <div className="label-not-applicable">
              <span className="label-status status-neutral">Tidak berlaku</span>
              <p>{labelSupport.note}</p>
            </div>
          ) : (
            <>
              <div className="label-minimum-grid">
                <div>
                  <small>Lebar label minimum</small>
                  <strong>
                    {labelSupport.minWidthMm
                      ? `${labelSupport.minWidthMm} mm`
                      : "Belum ditentukan"}
                  </strong>
                </div>
                <div>
                  <small>Tinggi label minimum</small>
                  <strong>
                    {labelSupport.minHeightMm
                      ? `${labelSupport.minHeightMm} mm`
                      : "Belum ditentukan"}
                  </strong>
                </div>
              </div>
              <div className="label-spec-section">
                <div className="label-section-title">
                  <strong>Tipe sensor / media</strong>
                  <span>GAP · MARK · NOTCH</span>
                </div>
                <div className="label-type-grid">
                  {labelSupport.sensorTypes.map((sensor) => (
                    <div className="label-type-item" key={sensor.type}>
                      <div>
                        <strong>{sensor.type}</strong>
                        <LabelSupportBadge supported={sensor.supported} />
                      </div>
                      <small>{sensor.note}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="label-spec-section">
                <div className="label-section-title">
                  <strong>Ukuran & konfigurasi label</strong>
                  <span>Lebar × tinggi · jumlah baris</span>
                </div>
                {labelSupport.sizes.length > 0 ? (
                  <div className="label-size-table-wrap">
                    <table className="label-size-table">
                      <thead>
                        <tr>
                          <th>Ukuran</th>
                          <th>Baris</th>
                          <th>Tipe barcode / isi</th>
                          <th>Status</th>
                          <th>Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labelSupport.sizes.map((size, index) => (
                          <tr
                            key={`${size.widthMm}x${size.heightMm}-${size.lines}-${index}`}
                          >
                            <td>
                              {size.widthMm} × {size.heightMm} mm
                            </td>
                            <td>{size.lines} baris</td>
                            <td>{size.barcodeType}</td>
                            <td>
                              <LabelSupportBadge supported={size.supported} />
                            </td>
                            <td>{size.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="label-no-sizes">
                    <Icon name="info" size={15} />
                    <span>
                      Belum ada ukuran label barcode yang dikonfigurasi untuk
                      profil ini.
                    </span>
                  </div>
                )}
              </div>
              <p className="label-support-note">
                <strong>Catatan:</strong> {labelSupport.note}
              </p>
            </>
          )}
        </section>
        <ProductDriverActions url={product.driverDownloadUrl} variant="modal" />
        <div className="modal-footer">
          <button className="button-secondary" onClick={onCheckCompatibility}>
            Cek compatibility <Icon name="arrow" size={14} />
          </button>
          <button className="button-primary" onClick={onTroubleshoot}>
            Troubleshooting
          </button>
        </div>
      </section>
    </div>
  );
}

function LabelSupportBadge({ supported }: { supported: boolean }) {
  return (
    <span
      className={`label-status ${supported ? "status-supported" : "status-unsupported"}`}
    >
      <Icon name={supported ? "check" : "plus"} size={12} />
      {supported ? "Support" : "Tidak support"}
    </span>
  );
}

type SoftwareCatalogPageProps = {
  items: SoftwareItem[];
  isAdmin: boolean;
  showForm: boolean;
  editingId: string | null;
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  platform: string;
  setPlatform: (value: string) => void;
  version: string;
  setVersion: (value: string) => void;
  downloadUrl: string;
  setDownloadUrl: (value: string) => void;
  documentationUrl: string;
  setDocumentationUrl: (value: string) => void;
  supportedProducts: string;
  setSupportedProducts: (value: string) => void;
  error: string;
  notice: string;
  setNotice: (value: string) => void;
  onAdd: () => void;
  onEdit: (software: SoftwareItem) => void;
  onDelete: (software: SoftwareItem) => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onOpenDetails: (software: SoftwareItem) => void;
};

function SoftwareCatalogPage(props: SoftwareCatalogPageProps) {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("Semua platform");
  const platforms = Array.from(
    new Set(props.items.map((item) => item.platform)),
  ).sort();
  const visibleItems = props.items.filter(
    (item) =>
      `${item.name} ${item.description} ${item.category} ${item.platform} ${item.supportedProducts}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (platformFilter === "Semua platform" || item.platform === platformFilter),
  );
  return (
    <div className="page-content inner-page software-catalog-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">SOFTWARE CENTER</p>
          <h1>Software & Utility</h1>
          <p className="welcome-copy">
            Temukan aplikasi dan driver pendukung perangkat Codeshop.
          </p>
        </div>
        {props.isAdmin && (
          <button className="button-primary" onClick={props.onAdd}>
            <Icon name="plus" size={16} /> Tambah software
          </button>
        )}
      </div>
      <div className="software-tools">
        <label className="filter-search">
          <Icon name="search" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama software, produk, atau kategori..."
          />
        </label>
        <select
          value={platformFilter}
          onChange={(event) => setPlatformFilter(event.target.value)}
        >
          <option>Semua platform</option>
          {platforms.map((platform) => (
            <option key={platform}>{platform}</option>
          ))}
        </select>
      </div>
      {props.notice && (
        <div className="user-notice">
          <Icon name="check" size={16} />
          {props.notice}
          <button
            aria-label="Tutup pemberitahuan"
            onClick={() => props.setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {props.showForm && (
        <form className="software-editor panel" onSubmit={props.onSave}>
          <div className="form-heading">
            <span className="form-icon">
              <Icon name="grid" size={19} />
            </span>
            <div>
              <h2>{props.editingId ? "Edit software" : "Tambah software"}</h2>
              <p>Kelola informasi software, platform, dan tautan.</p>
            </div>
          </div>
          <div className="software-form-grid">
            <label className="field-label">
              Nama software
              <input
                required
                maxLength={100}
                value={props.name}
                onChange={(event) => props.setName(event.target.value)}
                placeholder="Contoh: BarTender"
              />
            </label>
            <label className="field-label">
              Kategori
              <input
                maxLength={50}
                value={props.category}
                onChange={(event) => props.setCategory(event.target.value)}
                placeholder="Contoh: Label Software"
              />
            </label>
            <label className="field-label">
              Platform
              <select
                value={props.platform}
                onChange={(event) => props.setPlatform(event.target.value)}
              >
                <option>Windows</option>
                <option>Android</option>
                <option>iOS</option>
                <option>macOS</option>
                <option>Windows / macOS</option>
                <option>Web</option>
                <option>Lainnya</option>
              </select>
            </label>
            <label className="field-label">
              Versi
              <input
                maxLength={40}
                value={props.version}
                onChange={(event) => props.setVersion(event.target.value)}
                placeholder="Contoh: 2026 R8"
              />
            </label>
            <label className="field-label software-form-wide">
              Deskripsi
              <input
                maxLength={220}
                value={props.description}
                onChange={(event) => props.setDescription(event.target.value)}
                placeholder="Jelaskan fungsi software secara singkat"
              />
            </label>
            <label className="field-label">
              Produk yang didukung
              <input
                maxLength={120}
                value={props.supportedProducts}
                onChange={(event) =>
                  props.setSupportedProducts(event.target.value)
                }
                placeholder="Contoh: Barcode Printer"
              />
            </label>
            <label className="field-label">
              Link download
              <input
                type="url"
                value={props.downloadUrl}
                onChange={(event) => props.setDownloadUrl(event.target.value)}
                placeholder="https://... (opsional)"
              />
            </label>
            <label className="field-label software-form-wide">
              Link dokumentasi
              <input
                type="url"
                value={props.documentationUrl}
                onChange={(event) =>
                  props.setDocumentationUrl(event.target.value)
                }
                placeholder="https://... (opsional)"
              />
            </label>
          </div>
          {props.error && <p className="form-error">{props.error}</p>}
          <div className="software-form-footer">
            <span>Data demo disimpan lokal di browser.</span>
            <div>
              <button
                className="button-secondary"
                type="button"
                onClick={props.onCancel}
              >
                Batal
              </button>
              <button className="button-primary" type="submit">
                {props.editingId ? "Simpan perubahan" : "Simpan software"}{" "}
                <Icon name="check" size={15} />
              </button>
            </div>
          </div>
        </form>
      )}
      <div className="section-heading software-list-heading">
        <div>
          <h2>Katalog software</h2>
          <p>
            {visibleItems.length} dari {props.items.length} software
          </p>
        </div>
        <span className="count-pill">{props.items.length} ITEM</span>
      </div>
      {visibleItems.length > 0 ? (
        <div className="software-catalog-grid">
          {visibleItems.map((software) => (
            <article className="software-catalog-card" key={software.id}>
              <button
                className="software-card-main"
                onClick={() => props.onOpenDetails(software)}
              >
                <span className="software-icon">
                  <Icon name="download" size={22} />
                </span>
                <span className="software-platform">{software.platform}</span>
                <span className="software-category-label">
                  {software.category}
                </span>
                <h3>{software.name}</h3>
                <p>
                  {software.description ||
                    "Detail software dan informasi dukungan."}
                </p>
                <span className="software-card-product">
                  {software.supportedProducts
                    ? `Untuk: ${software.supportedProducts}`
                    : `Versi ${software.version || "tidak dicantumkan"}`}
                </span>
              </button>
              <div className="software-card-actions">
                <button
                  className="software-details-button"
                  onClick={() => props.onOpenDetails(software)}
                >
                  Lihat detail <Icon name="arrow" size={14} />
                </button>
                {props.isAdmin && (
                  <span>
                    <button
                      aria-label={`Edit ${software.name}`}
                      onClick={() => props.onEdit(software)}
                    >
                      Edit
                    </button>
                    <button
                      aria-label={`Hapus ${software.name}`}
                      onClick={() => props.onDelete(software)}
                    >
                      Hapus
                    </button>
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="software-empty">
          <span>
            <Icon name="grid" size={22} />
          </span>
          <h3>
            {search || platformFilter !== "Semua platform"
              ? "Software tidak ditemukan"
              : "Belum ada software"}
          </h3>
          <p>
            {search || platformFilter !== "Semua platform"
              ? "Coba kata kunci atau platform lain."
              : "Software yang ditambahkan Admin akan muncul di katalog ini."}
          </p>
          {props.isAdmin && !search && (
            <button className="button-primary" onClick={props.onAdd}>
              <Icon name="plus" size={15} /> Tambah software
            </button>
          )}
        </div>
      )}
      <div className="drive-note">
        <Icon name="shield" size={17} />
        <span>
          Download dan dokumentasi merujuk ke link eksternal; file tidak
          disimpan di aplikasi.
        </span>
      </div>
    </div>
  );
}

function SoftwareDetailsModal({
  software,
  onClose,
}: {
  software: SoftwareItem;
  onClose: () => void;
}) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl(null), 1800);
    } catch {
      setCopiedUrl(null);
    }
  };
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="software-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="software-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          aria-label="Tutup detail software"
          onClick={onClose}
        >
          ×
        </button>
        <span className="software-icon software-modal-icon">
          <Icon name="grid" size={24} />
        </span>
        <span className="software-platform software-modal-platform">
          {software.platform}
        </span>
        <p className="eyebrow">{software.category.toUpperCase()}</p>
        <h2 id="software-detail-title">{software.name}</h2>
        <p className="software-modal-description">
          {software.description || "Detail software dan informasi dukungan."}
        </p>
        <div className="software-modal-details">
          <div>
            <small>Versi</small>
            <strong>{software.version || "Tidak dicantumkan"}</strong>
          </div>
          <div>
            <small>Platform</small>
            <strong>{software.platform}</strong>
          </div>
          <div className="software-modal-wide">
            <small>Produk yang didukung</small>
            <strong>{software.supportedProducts || "Tidak dicantumkan"}</strong>
          </div>
        </div>
        <div className="software-modal-links">
          {software.downloadUrl && (
            <div>
              <span>
                <Icon name="download" size={16} /> Link download
              </span>
              <div>
                <button
                  className="button-secondary"
                  onClick={() => void copyUrl(software.downloadUrl)}
                >
                  <Icon
                    name={copiedUrl === software.downloadUrl ? "check" : "copy"}
                    size={13}
                  />
                  {copiedUrl === software.downloadUrl ? "Tersalin" : "Salin"}
                </button>
                <a
                  className="button-primary"
                  href={software.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download <Icon name="external" size={13} />
                </a>
              </div>
            </div>
          )}
          {software.documentationUrl && (
            <div>
              <span>
                <Icon name="book" size={16} /> Dokumentasi
              </span>
              <div>
                <button
                  className="button-secondary"
                  onClick={() => void copyUrl(software.documentationUrl)}
                >
                  <Icon
                    name={
                      copiedUrl === software.documentationUrl ? "check" : "copy"
                    }
                    size={13}
                  />
                  {copiedUrl === software.documentationUrl
                    ? "Tersalin"
                    : "Salin"}
                </button>
                <a
                  className="button-secondary"
                  href={software.documentationUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka <Icon name="external" size={13} />
                </a>
              </div>
            </div>
          )}
          {!software.downloadUrl && !software.documentationUrl && (
            <p className="software-no-links">
              Link download dan dokumentasi belum ditambahkan.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

type TutorialPlaylistPageProps = {
  playlists: TutorialPlaylist[];
  isAdmin: boolean;
  selectedPlaylistId: string;
  onSelectPlaylist: (id: string) => void;
  onAddPlaylist: () => void;
  onEditPlaylist: (playlist: TutorialPlaylist) => void;
  onDeletePlaylist: (playlist: TutorialPlaylist) => void;
  onDeleteLesson: (playlist: TutorialPlaylist, lesson: PlaylistLesson) => void;
  showForm: boolean;
  editingPlaylistId: string | null;
  playlistTitle: string;
  setPlaylistTitle: (value: string) => void;
  playlistDescription: string;
  setPlaylistDescription: (value: string) => void;
  playlistCategory: string;
  setPlaylistCategory: (value: string) => void;
  lessonTitle: string;
  setLessonTitle: (value: string) => void;
  lessonDescription: string;
  setLessonDescription: (value: string) => void;
  lessonUrl: string;
  setLessonUrl: (value: string) => void;
  lessonDuration: string;
  setLessonDuration: (value: string) => void;
  stagedLessons: PlaylistLesson[];
  setStagedLessons: (lessons: PlaylistLesson[]) => void;
  editingLessonId: string | null;
  onEditLesson: (lesson: PlaylistLesson) => void;
  onCancelLessonEdit: () => void;
  onAddLesson: () => void;
  onSavePlaylist: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancelForm: () => void;
  error: string;
  notice: string;
  setNotice: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  onOpenLesson: (lesson: PlaylistLesson) => void;
};

function TutorialPlaylistPage(props: TutorialPlaylistPageProps) {
  const [copied, setCopied] = useState(false);
  const selected =
    props.playlists.find(
      (playlist) => playlist.id === props.selectedPlaylistId,
    ) ?? props.playlists[0];
  const visible = props.playlists.filter((playlist) =>
    `${playlist.title} ${playlist.category}`
      .toLowerCase()
      .includes(props.search.toLowerCase()),
  );
  const copySelected = async () => {
    if (!selected) return;
    const text = [
      selected.title,
      selected.description,
      "",
      ...selected.lessons.flatMap((lesson, index) => [
        `${index + 1}. ${lesson.title}`,
        ...(lesson.description ? [lesson.description] : []),
        ...(lesson.url ? [lesson.url] : []),
      ]),
      "Codeshop Technical Hub",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="page-content inner-page playlist-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">TUTORIAL TERSTRUKTUR</p>
          <h1>Playlist tutorial</h1>
          <p className="welcome-copy">
            Kumpulan panduan berurutan untuk membantu tim belajar langkah demi
            langkah.
          </p>
        </div>
        {props.isAdmin && (
          <button className="button-primary" onClick={props.onAddPlaylist}>
            <Icon name="plus" size={16} /> Buat playlist
          </button>
        )}
      </div>
      {props.notice && (
        <div className="user-notice">
          <Icon name="check" size={16} />
          {props.notice}
          <button
            aria-label="Tutup pemberitahuan"
            onClick={() => props.setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {props.showForm && (
        <form className="playlist-editor panel" onSubmit={props.onSavePlaylist}>
          <div className="form-heading">
            <span className="form-icon">
              <Icon name="layers" size={19} />
            </span>
            <div>
              <h2>
                {props.editingPlaylistId ? "Edit playlist" : "Playlist baru"}
              </h2>
              <p>Atur judul utama, lalu tambahkan sub-tutorial dan tautan.</p>
            </div>
          </div>
          <div className="playlist-main-fields">
            <label className="field-label">
              Judul playlist
              <input
                required
                value={props.playlistTitle}
                onChange={(event) => props.setPlaylistTitle(event.target.value)}
                placeholder="Contoh: Tutorial iPOS 5"
              />
            </label>
            <label className="field-label">
              Kategori
              <input
                value={props.playlistCategory}
                onChange={(event) =>
                  props.setPlaylistCategory(event.target.value)
                }
                placeholder="IPOS 5"
              />
            </label>
            <label className="field-label full-field">
              Deskripsi
              <input
                value={props.playlistDescription}
                onChange={(event) =>
                  props.setPlaylistDescription(event.target.value)
                }
                placeholder="Penjelasan playlist"
              />
            </label>
          </div>
          <div className="lesson-builder">
            <div className="lesson-builder-heading">
              <div>
                <strong>Sub-tutorial</strong>
                <span>Tambahkan dan edit setiap materi.</span>
              </div>
              <span className="count-pill">
                {props.stagedLessons.length} item
              </span>
            </div>
            <div className="lesson-entry-grid">
              <label className="field-label">
                Judul sub-tutorial
                <input
                  value={props.lessonTitle}
                  onChange={(event) => props.setLessonTitle(event.target.value)}
                  placeholder="Cara Install"
                />
              </label>
              <label className="field-label">
                Durasi
                <input
                  value={props.lessonDuration}
                  onChange={(event) =>
                    props.setLessonDuration(event.target.value)
                  }
                  placeholder="8 menit"
                />
              </label>
              <label className="field-label full-field">
                Deskripsi
                <input
                  value={props.lessonDescription}
                  onChange={(event) =>
                    props.setLessonDescription(event.target.value)
                  }
                  placeholder="Apa yang akan dipelajari?"
                />
              </label>
              <label className="field-label full-field">
                Link YouTube / Google Drive
                <input
                  type="url"
                  value={props.lessonUrl}
                  onChange={(event) => props.setLessonUrl(event.target.value)}
                  placeholder="https://youtu.be/... atau Google Drive"
                />
              </label>
            </div>
            <div className="lesson-entry-actions">
              {props.editingLessonId && (
                <button
                  className="button-secondary add-lesson-button"
                  type="button"
                  onClick={props.onCancelLessonEdit}
                >
                  Batal ubah
                </button>
              )}
              <button
                className="button-secondary add-lesson-button"
                type="button"
                onClick={props.onAddLesson}
              >
                <Icon
                  name={props.editingLessonId ? "check" : "plus"}
                  size={15}
                />{" "}
                {props.editingLessonId
                  ? "Simpan perubahan"
                  : "Tambahkan sub-tutorial"}
              </button>
            </div>
            {props.stagedLessons.length > 0 && (
              <ol className="staged-lesson-list">
                {props.stagedLessons.map((lesson, index) => (
                  <li key={lesson.id}>
                    <span className="lesson-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="staged-lesson-copy">
                      <strong>{lesson.title}</strong>
                      <small>
                        {lesson.url ? "Link tersedia" : "Belum ada link"}
                      </small>
                    </span>
                    <button
                      type="button"
                      onClick={() => props.onEditLesson(lesson)}
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      aria-label={`Hapus ${lesson.title}`}
                      onClick={() =>
                        props.setStagedLessons(
                          props.stagedLessons.filter(
                            (item) => item.id !== lesson.id,
                          ),
                        )
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {props.error && <p className="form-error">{props.error}</p>}
          <div className="playlist-editor-footer">
            <span>Playlist disimpan lokal di browser.</span>
            <div>
              <button
                className="button-secondary"
                type="button"
                onClick={props.onCancelForm}
              >
                Batal
              </button>
              <button className="button-primary" type="submit">
                Simpan playlist
              </button>
            </div>
          </div>
        </form>
      )}
      <div className="playlist-browser">
        <aside className="playlist-rail">
          <div className="playlist-rail-heading">
            <div>
              <h2>Koleksi</h2>
              <span>{props.playlists.length} playlist</span>
            </div>
          </div>
          <label className="playlist-search">
            <Icon name="search" size={16} />
            <input
              value={props.search}
              onChange={(event) => props.setSearch(event.target.value)}
              placeholder="Cari playlist..."
            />
          </label>
          <div className="playlist-collection-list">
            {visible.map((playlist) => (
              <button
                key={playlist.id}
                className={`playlist-collection ${selected?.id === playlist.id ? "selected" : ""}`}
                onClick={() => props.onSelectPlaylist(playlist.id)}
              >
                <span className="collection-icon">
                  <Icon name="layers" size={17} />
                </span>
                <span className="collection-copy">
                  <strong>{playlist.title}</strong>
                  <small>
                    {playlist.category} · {playlist.lessons.length} sub-tutorial
                  </small>
                </span>
                <Icon name="chevron" size={15} />
              </button>
            ))}
          </div>
        </aside>
        <section className="playlist-detail panel">
          {selected ? (
            <>
              <div className="playlist-cover">
                <span className="playlist-cover-icon">
                  <Icon name="book" size={25} />
                </span>
                <span className="playlist-category-tag">
                  {selected.category}
                </span>
                <h2>{selected.title}</h2>
                <p>{selected.description}</p>
                <div className="playlist-cover-meta">
                  <span>
                    <Icon name="layers" size={14} /> {selected.lessons.length}{" "}
                    sub-tutorial
                  </span>
                  <span>
                    <Icon name="clock" size={14} /> Belajar mandiri
                  </span>
                </div>
              </div>
              <div className="playlist-lessons-heading">
                <div>
                  <span className="eyebrow">MATERI PLAYLIST</span>
                  <h3>Daftar sub-tutorial</h3>
                </div>
                <div className="playlist-heading-actions">
                  <button
                    className="button-secondary copy-playlist-button"
                    onClick={() => void copySelected()}
                  >
                    <Icon name={copied ? "check" : "copy"} size={14} />{" "}
                    {copied ? "Tersalin!" : "Salin playlist"}
                  </button>
                  {props.isAdmin && (
                    <div className="playlist-admin-actions">
                      <button
                        className="button-secondary"
                        onClick={() => props.onEditPlaylist(selected)}
                      >
                        Edit playlist
                      </button>
                      <button
                        className="playlist-delete-button"
                        onClick={() => props.onDeletePlaylist(selected)}
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="playlist-lesson-list">
                {selected.lessons.map((lesson, index) => (
                  <article className="playlist-lesson" key={lesson.id}>
                    <button
                      className="playlist-lesson-open"
                      onClick={() => props.onOpenLesson(lesson)}
                    >
                      <span className="lesson-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="playlist-lesson-copy">
                        <strong>{lesson.title}</strong>
                        <small>{lesson.description}</small>
                      </span>
                      <span className="lesson-duration">
                        {lesson.duration || "Tutorial video"}
                      </span>
                      <Icon
                        name="chevron"
                        size={16}
                        className="lesson-open-arrow"
                      />
                    </button>
                    {props.isAdmin && (
                      <button
                        className="lesson-delete-button"
                        aria-label={`Hapus sub-tutorial ${lesson.title}`}
                        onClick={() => props.onDeleteLesson(selected, lesson)}
                      >
                        ×
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="playlist-no-lessons">
              <strong>Belum ada playlist</strong>
              <span>Admin dapat membuat playlist tutorial.</span>
            </div>
          )}
        </section>
      </div>
      <div className="drive-note">
        <Icon name="shield" size={17} />
        <span>
          Video dan dokumentasi ditautkan melalui Google Drive atau YouTube.
        </span>
      </div>
    </div>
  );
}

type TutorialLibraryPageProps = {
  playlists: TutorialPlaylist[];
  tutorials: StandaloneTutorial[];
  isAdmin: boolean;
  onOpenPlaylist: (playlist: TutorialPlaylist) => void;
  onOpenTutorial: (tutorial: StandaloneTutorial) => void;
  onAddTutorial: () => void;
  onEditTutorial: (tutorial: StandaloneTutorial) => void;
  onDeleteTutorial: (tutorial: StandaloneTutorial) => void;
  showForm: boolean;
  editingId: string | null;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  url: string;
  setUrl: (value: string) => void;
  duration: string;
  setDuration: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  error: string;
  notice: string;
  setNotice: (value: string) => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onGoPlaylists: () => void;
};

function TutorialLibraryPage(props: TutorialLibraryPageProps) {
  const [search, setSearch] = useState("");
  const videoItems = props.tutorials.filter((tutorial) =>
    `${tutorial.title} ${tutorial.description} ${tutorial.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const playlistItems = props.playlists.filter((playlist) =>
    `${playlist.title} ${playlist.description} ${playlist.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="page-content inner-page tutorial-library-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">PUSAT PANDUAN</p>
          <h1>Video & playlist tutorial</h1>
          <p className="welcome-copy">
            Video singkat dan rangkaian panduan teknis untuk dibagikan ke
            customer.
          </p>
        </div>
        {props.isAdmin && (
          <button className="button-primary" onClick={props.onAddTutorial}>
            <Icon name="plus" size={16} /> Tambah tutorial
          </button>
        )}
      </div>
      <div className="tutorial-library-tools">
        <label className="filter-search">
          <Icon name="search" size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari judul tutorial atau playlist..."
          />
        </label>
        <button className="button-secondary" onClick={props.onGoPlaylists}>
          <Icon name="layers" size={15} /> Kelola playlist
        </button>
      </div>
      {props.notice && (
        <div className="user-notice">
          <Icon name="check" size={16} />
          {props.notice}
          <button
            aria-label="Tutup pemberitahuan"
            onClick={() => props.setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {props.showForm && (
        <form
          className="standalone-tutorial-form panel"
          onSubmit={props.onSave}
        >
          <div className="form-heading">
            <span className="form-icon">
              <Icon name="book" size={19} />
            </span>
            <div>
              <h2>
                {props.editingId
                  ? "Ubah video tutorial"
                  : "Tambah video tutorial"}
              </h2>
              <p>
                Masukkan video YouTube atau video Google Drive untuk preview
                langsung di popup.
              </p>
            </div>
          </div>
          <div className="standalone-form-grid">
            <label className="field-label">
              Judul tutorial
              <input
                required
                maxLength={100}
                value={props.title}
                onChange={(event) => props.setTitle(event.target.value)}
                placeholder="Contoh: Cara install iPOS 5"
              />
            </label>
            <label className="field-label">
              Kategori
              <input
                maxLength={40}
                value={props.category}
                onChange={(event) => props.setCategory(event.target.value)}
                placeholder="Contoh: IPOS 5"
              />
            </label>
            <label className="field-label">
              Durasi
              <input
                value={props.duration}
                onChange={(event) => props.setDuration(event.target.value)}
                placeholder="Contoh: 5 menit"
              />
            </label>
            <label className="field-label standalone-url-field">
              Link YouTube / Google Drive
              <input
                required
                type="url"
                value={props.url}
                onChange={(event) => props.setUrl(event.target.value)}
                placeholder="https://youtu.be/... atau drive.google.com/..."
              />
            </label>
            <label className="field-label standalone-description-field">
              Deskripsi
              <input
                maxLength={200}
                value={props.description}
                onChange={(event) => props.setDescription(event.target.value)}
                placeholder="Penjelasan singkat isi tutorial"
              />
            </label>
          </div>
          {props.error && <p className="form-error">{props.error}</p>}
          <div className="standalone-form-footer">
            <span>
              Pastikan izin video Drive disetel dapat ditonton oleh penerima
              link.
            </span>
            <div>
              <button
                type="button"
                className="button-secondary"
                onClick={props.onCancel}
              >
                Batal
              </button>
              <button type="submit" className="button-primary">
                {props.editingId ? "Simpan perubahan" : "Simpan tutorial"}{" "}
                <Icon name="check" size={15} />
              </button>
            </div>
          </div>
        </form>
      )}
      <section className="tutorial-library-section">
        <div className="section-heading">
          <div>
            <h2>Semua materi tutorial</h2>
            <p>
              {props.playlists.length} playlist · {props.tutorials.length} video
              tutorial
            </p>
          </div>
          <span className="count-pill">
            {playlistItems.length + videoItems.length} materi
          </span>
        </div>
        {playlistItems.length + videoItems.length > 0 ? (
          <div className="mixed-tutorial-grid">
            {playlistItems.map((playlist) => (
              <button
                className="mixed-tutorial-card playlist-library-card"
                key={`playlist-${playlist.id}`}
                onClick={() => props.onOpenPlaylist(playlist)}
              >
                <span className="mixed-card-art playlist-art">
                  <Icon name="layers" size={28} />
                  <span>PLAYLIST</span>
                </span>
                <span className="mixed-card-meta">
                  <i>{playlist.category}</i>
                  <small>{playlist.lessons.length} sub-tutorial</small>
                </span>
                <strong>{playlist.title}</strong>
                <p>{playlist.description || "Rangkaian panduan belajar."}</p>
                <span className="mixed-card-action">
                  Buka playlist <Icon name="arrow" size={14} />
                </span>
              </button>
            ))}
            {videoItems.map((tutorial) => (
              <article
                className="mixed-tutorial-card video-library-card"
                key={`video-${tutorial.id}`}
              >
                <button
                  className="video-card-open"
                  onClick={() => props.onOpenTutorial(tutorial)}
                  aria-label={`Preview video ${tutorial.title}`}
                >
                  <span className="mixed-card-art video-art">
                    <Icon name="play" size={29} />
                    <span>VIDEO</span>
                    <i>▶</i>
                  </span>
                </button>
                <div className="mixed-card-meta">
                  <i>{tutorial.category}</i>
                  <small>{tutorial.duration || "Video tutorial"}</small>
                </div>
                <button
                  className="video-card-title"
                  onClick={() => props.onOpenTutorial(tutorial)}
                >
                  {tutorial.title}
                </button>
                <p>
                  {tutorial.description || "Klik untuk melihat preview video."}
                </p>
                <div className="mixed-card-footer">
                  <button
                    className="mixed-card-action"
                    onClick={() => props.onOpenTutorial(tutorial)}
                  >
                    Preview video <Icon name="arrow" size={14} />
                  </button>
                  {props.isAdmin && (
                    <span className="video-admin-actions">
                      <button
                        aria-label={`Edit ${tutorial.title}`}
                        onClick={() => props.onEditTutorial(tutorial)}
                      >
                        Edit
                      </button>
                      <button
                        aria-label={`Hapus ${tutorial.title}`}
                        onClick={() => props.onDeleteTutorial(tutorial)}
                      >
                        Hapus
                      </button>
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="tutorial-library-empty">
            <span>
              <Icon name="book" size={23} />
            </span>
            <h3>
              {search ? "Materi tidak ditemukan" : "Belum ada materi tutorial"}
            </h3>
            <p>
              {search
                ? "Coba kata kunci yang berbeda."
                : "Playlist tutorial dan video yang ditambahkan Admin akan tampil di sini."}
            </p>
            {props.isAdmin && !search && (
              <button className="button-primary" onClick={props.onAddTutorial}>
                <Icon name="plus" size={15} /> Tambah video tutorial
              </button>
            )}
          </div>
        )}
      </section>
      <div className="drive-note">
        <Icon name="shield" size={17} />
        <span>
          Video dibagikan melalui link YouTube atau Google Drive; file media
          tidak disimpan di aplikasi.
        </span>
      </div>
    </div>
  );
}

function VideoPreviewModal({
  lesson,
  onClose,
}: {
  lesson: StandaloneTutorial | PlaylistLesson;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const embedUrl = getVideoPreviewUrl(lesson.url);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(lesson.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("textarea");
      input.value = lesson.url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      setCopied(document.execCommand("copy"));
      document.body.removeChild(input);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="modal-backdrop video-preview-backdrop" role="presentation">
      <section
        className="video-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          aria-label="Tutup preview video"
          onClick={onClose}
        >
          ×
        </button>
        <div className="video-preview-heading">
          <span className="lesson-modal-icon">
            <Icon name="play" size={21} />
          </span>
          <div>
            <p className="eyebrow">
              {("category" in lesson
                ? lesson.category
                : "SUB-TUTORIAL"
              ).toUpperCase()}
            </p>
            <h2 id="lesson-modal-title">{lesson.title}</h2>
            <p>{lesson.description || "Video tutorial Codeshop."}</p>
          </div>
        </div>
        {embedUrl ? (
          <div className="video-frame-wrap">
            <iframe
              src={embedUrl}
              title={`Preview video: ${lesson.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : (
          <div className="video-unavailable">
            <Icon name="link" size={22} />
            <strong>Preview video tidak tersedia</strong>
            <span>
              Link ini belum dapat ditampilkan sebagai embed. Coba buka link
              langsung.
            </span>
          </div>
        )}
        <div className="video-preview-footer">
          <span className="video-preview-duration">
            <Icon name="clock" size={14} />{" "}
            {lesson.duration || "Tutorial video"}
          </span>
          <div>
            {lesson.url && (
              <>
                <button
                  className="button-secondary"
                  onClick={() => void copyLink()}
                >
                  <Icon name={copied ? "check" : "copy"} size={14} />{" "}
                  {copied ? "Link tersalin!" : "Salin link"}
                </button>
                <a
                  className="button-primary video-open-source"
                  href={lesson.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka sumber <Icon name="external" size={14} />
                </a>
              </>
            )}
          </div>
        </div>
        {!lesson.url && (
          <div className="lesson-link-empty">
            <Icon name="link" size={16} /> Link belum ditambahkan. Minta Admin
            Utama melengkapi tautan tutorial ini.
          </div>
        )}
      </section>
    </div>
  );
}

function LoginScreen({
  email,
  password,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="login-page">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />
      <section className="login-card">
        <div className="login-brand">
          <img className="brand-logo" src={brandLogo} alt="" />
          <span className="brand-copy">
            <strong>CODESHOP</strong>
            <small>TECHNICAL HUB</small>
          </span>
        </div>
        <p className="eyebrow">WORKSPACE INTERNAL</p>
        <h1>Selamat datang kembali.</h1>
        <p className="login-description">
          Masuk untuk membuka pusat informasi teknis Codeshop.
        </p>
        <form className="login-form" onSubmit={onSubmit}>
          <label className="field-label">
            Email
            <input
              autoComplete="username"
              type="email"
              required
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="nama@email.com"
            />
          </label>
          <label className="field-label">
            Password
            <input
              autoComplete="current-password"
              type="password"
              required
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Masukkan password"
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button className="button-primary login-submit" type="submit">
            Masuk ke workspace <Icon name="arrow" size={16} />
          </button>
        </form>
        <p className="login-disclaimer">
          Akun dikelola melalui Supabase Auth. Hubungi administrator untuk
          mendapatkan akses.
        </p>
      </section>
      <span className="login-footer">© 2026 Codeshop Technical Hub</span>
    </main>
  );
}

function ProductEditorModal({
  initialProduct,
  error,
  apps,
  onSave,
  onCancel,
}: {
  initialProduct: Product | null;
  error: string;
  apps: AppCatalogItem[];
  onSave: (product: Product) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Product>(() =>
    initialProduct
      ? {
          ...initialProduct,
          connections: [...initialProduct.connections],
          systems: [...initialProduct.systems],
          appSupport: { ...initialProduct.appSupport },
          labelSupport: {
            ...initialProduct.labelSupport,
            sensorTypes: initialProduct.labelSupport.sensorTypes.map(
              (item) => ({ ...item }),
            ),
            sizes: initialProduct.labelSupport.sizes.map((item) => ({
              ...item,
            })),
          },
        }
      : {
          name: "",
          code: "",
          category: "Barcode Printer",
          brand: "",
          connections: ["USB"],
          systems: ["Windows"],
          compatibilityPairs: [],
          appSupport: {},
          accent: "lavender",
          icon: "tag",
          description: "",
          status: "Tersedia",
          labelSupport: {
            applicable: true,
            demoData: true,
            minWidthMm: null,
            minHeightMm: null,
            sensorTypes: [
              { type: "GAP", supported: false, note: "" },
              { type: "MARK", supported: false, note: "" },
              { type: "NOTCH", supported: false, note: "" },
            ],
            sizes: [],
            note: "",
          },
        },
  );
  const [compatibilityError, setCompatibilityError] = useState("");
  const [driverUrlError, setDriverUrlError] = useState("");
  const setAppSupport = (appId: string, status: AppSupportStatus | "") => {
    setDraft((current) => {
      const appSupport = { ...current.appSupport };
      if (status) appSupport[appId] = status;
      else delete appSupport[appId];
      return { ...current, appSupport };
    });
  };
  const setField = <K extends keyof Product>(field: K, value: Product[K]) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const updateCompatibilityPair = (
    system: string,
    connection: string,
    enabled: boolean,
  ) => {
    setDraft((current) => {
      const pairs = current.compatibilityPairs ?? [];
      const exists = pairs.some(
        (pair) => pair.system === system && pair.connection === connection,
      );
      const nextPairs = enabled
        ? exists
          ? pairs
          : [...pairs, { system, connection }]
        : pairs.filter(
            (pair) => pair.system !== system || pair.connection !== connection,
          );
      return {
        ...current,
        compatibilityPairs: nextPairs,
        systems: [...new Set(nextPairs.map((pair) => pair.system))],
        connections: [...new Set(nextPairs.map((pair) => pair.connection))],
      };
    });
    setCompatibilityError("");
  };
  const setLabelField = <K extends keyof ProductLabelSupport>(
    field: K,
    value: ProductLabelSupport[K],
  ) =>
    setDraft((current) => ({
      ...current,
      labelSupport: { ...current.labelSupport, [field]: value },
    }));
  const updateSensor = (
    type: LabelSensorSupport["type"],
    field: "supported" | "note",
    value: boolean | string,
  ) =>
    setLabelField(
      "sensorTypes",
      draft.labelSupport.sensorTypes.map((sensor) =>
        sensor.type === type ? { ...sensor, [field]: value } : sensor,
      ),
    );
  const updateSize = (
    index: number,
    field: keyof LabelSizeSupport,
    value: string | number | boolean,
  ) =>
    setLabelField(
      "sizes",
      draft.labelSupport.sizes.map((size, row) =>
        row === index ? { ...size, [field]: value } : size,
      ),
    );
  const addSize = () =>
    setLabelField("sizes", [
      ...draft.labelSupport.sizes,
      {
        widthMm: 33,
        heightMm: 13,
        lines: 1,
        barcodeType: "Code 128",
        supported: true,
        note: "",
      },
    ]);
  const removeSize = async (index: number) => {
    const size = draft.labelSupport.sizes[index];
    if (
      !size ||
      !(await confirmDestructiveAction(
        "Hapus ukuran label?",
        `Ukuran ${size.widthMm} × ${size.heightMm} mm akan dihapus.`,
      ))
    )
      return;
    setLabelField(
      "sizes",
      draft.labelSupport.sizes.filter((_, row) => row !== index),
    );
  };
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const driverDownloadUrl = draft.driverDownloadUrl?.trim() ?? "";
    if (driverDownloadUrl && !/^https?:\/\/\S+$/i.test(driverDownloadUrl)) {
      setDriverUrlError(
        "Masukkan link driver yang diawali http:// atau https://.",
      );
      return;
    }
    setDriverUrlError("");
    if (!draft.compatibilityPairs?.length) {
      setCompatibilityError(
        "Pilih minimal satu kombinasi OS dan koneksi yang sudah diverifikasi.",
      );
      return;
    }
    setCompatibilityError("");
    onSave({
      ...draft,
      name: draft.name.trim(),
      code: draft.code.trim(),
      brand: draft.brand.trim(),
      driverDownloadUrl,
      description: draft.description.trim(),
      labelSupport: {
        ...draft.labelSupport,
        note: draft.labelSupport.note.trim(),
      },
    });
  };
  return (
    <div className="modal-backdrop product-editor-backdrop" role="presentation">
      <form
        className="product-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-editor-title"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          aria-label="Tutup form produk"
          onClick={onCancel}
        >
          ×
        </button>
        <div className="product-editor-heading">
          <span className="form-icon">
            <Icon name="box" size={19} />
          </span>
          <div>
            <p className="eyebrow">PRODUCT CATALOG</p>
            <h2 id="product-editor-title">
              {initialProduct ? "Edit produk" : "Tambah produk"}
            </h2>
            <p>Kelola data produk dan detail kompatibilitas label.</p>
          </div>
        </div>
        <div className="product-editor-fields">
          <label className="field-label">
            Nama produk
            <input
              required
              value={draft.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="Contoh: Printer Barcode X"
            />
          </label>
          <label className="field-label">
            Kode produk
            <input
              required
              value={draft.code}
              onChange={(event) => setField("code", event.target.value)}
              placeholder="Contoh: MODEL-100"
            />
          </label>
          <label className="field-label">
            Brand
            <input
              required
              value={draft.brand}
              onChange={(event) => setField("brand", event.target.value)}
              placeholder="Brand"
            />
          </label>
          <label className="field-label">
            Kategori
            <select
              value={draft.category}
              onChange={(event) => {
                const nextCategory = event.target.value;
                setDraft((current) => {
                  const next = {
                    ...current,
                    category: nextCategory,
                    icon:
                      nextCategory === "Barcode Printer"
                        ? "tag"
                        : nextCategory === "Barcode Scanner"
                          ? "scan"
                          : "printer",
                  };
                  if (nextCategory !== "Barcode Printer") {
                    delete next.barcodePrintingMethod;
                    delete next.ribbonWidthMm;
                    delete next.ribbonLengthM;
                  }
                  return next;
                });
              }}
            >
              <option>Thermal Printer</option>
              <option>Barcode Printer</option>
              <option>Barcode Scanner</option>
              <option>Label Printer</option>
              <option>Lainnya</option>
            </select>
          </label>
          {draft.category === "Barcode Printer" && (
            <label className="field-label">
              Metode cetak
              <select
                required
                value={draft.barcodePrintingMethod ?? ""}
                onChange={(event) => {
                  const method = event.target.value as
                    | BarcodePrintingMethod
                    | "";
                  setDraft((current) => {
                    const next = { ...current };
                    if (method) next.barcodePrintingMethod = method;
                    else delete next.barcodePrintingMethod;
                    if (method !== "thermal-transfer" && method !== "both") {
                      delete next.ribbonWidthMm;
                      delete next.ribbonLengthM;
                      delete next.ribbonNote;
                    }
                    return next;
                  });
                }}
              >
                <option value="">Pilih metode</option>
                <option value="direct-thermal">Direct thermal</option>
                <option value="thermal-transfer">Thermal transfer</option>
                <option value="both">Keduanya</option>
              </select>
            </label>
          )}
          {draft.category === "Barcode Printer" &&
            (draft.barcodePrintingMethod === "thermal-transfer" ||
              draft.barcodePrintingMethod === "both") && (
              <div className="ribbon-editor-fields">
                <label className="field-label">
                  Lebar ribbon (mm){" "}
                  <span className="optional-label">Opsional</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={draft.ribbonWidthMm ?? ""}
                    onChange={(event) =>
                      setField(
                        "ribbonWidthMm",
                        event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      )
                    }
                    placeholder="Belum ditentukan"
                  />
                </label>
                <label className="field-label">
                  Panjang ribbon (meter){" "}
                  <span className="optional-label">Opsional</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={draft.ribbonLengthM ?? ""}
                    onChange={(event) =>
                      setField(
                        "ribbonLengthM",
                        event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      )
                    }
                    placeholder="Contoh: 74 atau 300"
                  />
                </label>
                <label className="field-label ribbon-note-field">
                  Catatan ribbon{" "}
                  <span className="optional-label">Opsional</span>
                  <textarea
                    rows={3}
                    value={draft.ribbonNote ?? ""}
                    onChange={(event) =>
                      setField("ribbonNote", event.target.value || undefined)
                    }
                    placeholder="Contoh: gunakan ribbon wax-resin"
                  />
                </label>
              </div>
            )}
          <label className="field-label">
            Status
            <select
              value={draft.status}
              onChange={(event) => setField("status", event.target.value)}
            >
              <option>Tersedia</option>
              <option>Discontinued</option>
              <option>Dalam pengecekan</option>
            </select>
          </label>
          <label className="field-label product-description-field">
            Deskripsi
            <input
              value={draft.description}
              onChange={(event) => setField("description", event.target.value)}
              placeholder="Deskripsi singkat produk"
            />
          </label>
          <label className="field-label product-description-field">
            Link download driver{" "}
            <span className="optional-label">Opsional</span>
            <input
              type="url"
              value={draft.driverDownloadUrl ?? ""}
              onChange={(event) => {
                setField("driverDownloadUrl", event.target.value);
                setDriverUrlError("");
              }}
              placeholder="https://drive.google.com/..."
              aria-describedby={driverUrlError ? "driver-url-error" : undefined}
            />
            {driverUrlError && (
              <span className="form-error" id="driver-url-error" role="alert">
                {driverUrlError}
              </span>
            )}
          </label>
        </div>
        {draft.category === "Thermal Printer" && (
          <section className="product-app-support-editor">
            <div className="product-app-support-editor-heading">
              <strong>Dukungan app</strong>
              <small>
                “Belum dapat diuji” berarti akses atau perangkat uji belum
                tersedia.
              </small>
            </div>
            {apps.length > 0 ? (
              <div className="product-app-support-editor-list">
                {apps.map((appItem) => (
                  <label
                    className="product-app-support-editor-row"
                    key={appItem.id}
                  >
                    <span>
                      <strong>{appItem.name}</strong>
                      <small>{appItem.platform}</small>
                    </span>
                    <select
                      aria-label={`Status dukungan ${appItem.name}`}
                      value={draft.appSupport?.[appItem.id] ?? ""}
                      onChange={(event) =>
                        setAppSupport(
                          appItem.id,
                          event.target.value as AppSupportStatus | "",
                        )
                      }
                    >
                      <option value="">Pilih status</option>
                      <option value="supported">Mendukung</option>
                      <option value="unsupported">Tidak mendukung</option>
                      <option value="not-tested">Belum dapat diuji</option>
                    </select>
                  </label>
                ))}
              </div>
            ) : (
              <p className="product-app-support-empty">
                Tambahkan app di menu Apps terlebih dahulu.
              </p>
            )}
          </section>
        )}
        <section className="product-compatibility-editor">
          <div className="product-compatibility-heading">
            <strong>Kombinasi sistem operasi dan koneksi</strong>
            <small>
              Centang hanya pasangan yang benar-benar didukung produk.
            </small>
          </div>
          {draft.compatibilityPairs === undefined && (
            <p className="product-compatibility-warning">
              Data lama belum mencatat pasangan OS dan koneksi. Verifikasi
              spesifikasi sebelum memilih kombinasi.
            </p>
          )}
          <div className="product-compatibility-table-wrap">
            <table className="product-compatibility-table">
              <thead>
                <tr>
                  <th scope="col">Sistem operasi</th>
                  {compatibilityConnections.map((connection) => (
                    <th scope="col" key={connection}>
                      {connection}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compatibilitySystems.map((system) => (
                  <tr key={system}>
                    <th scope="row">{system}</th>
                    {compatibilityConnections.map((connection) => (
                      <td key={connection}>
                        <input
                          type="checkbox"
                          aria-label={`${system} melalui ${connection}`}
                          checked={Boolean(
                            draft.compatibilityPairs?.some(
                              (pair) =>
                                pair.system === system &&
                                pair.connection === connection,
                            ),
                          )}
                          onChange={(event) =>
                            updateCompatibilityPair(
                              system,
                              connection,
                              event.target.checked,
                            )
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {draft.connections.includes("Bluetooth") && (
            <section className="product-app-support-editor bluetooth-device-support-editor">
              <div className="product-app-support-editor-heading">
                <strong>Dukungan perangkat Bluetooth</strong>
                <small>
                  Isi sesuai spesifikasi produk. Perangkat lain (acak) tidak
                  berarti bisa terhubung bersamaan.
                </small>
              </div>
              <label className="field-label">
                Kapasitas perangkat
                <select
                  value={draft.bluetoothDeviceSupport ?? ""}
                  onChange={(event) =>
                    setField(
                      "bluetoothDeviceSupport",
                      (event.target.value || undefined) as
                        | BluetoothDeviceSupport
                        | undefined,
                    )
                  }
                >
                  <option value="">Belum diverifikasi</option>
                  <option value="single">1 perangkat</option>
                  <option value="middle">2–5 perangkat</option>
                  <option value="up-to-10">Hingga 10 perangkat</option>
                  <option value="other-device">Perangkat lain (acak)</option>
                </select>
              </label>
            </section>
          )}
          {compatibilityError && (
            <p className="product-compatibility-error" role="alert">
              {compatibilityError}
            </p>
          )}
        </section>
        <section className="product-label-editor">
          <div className="product-label-editor-heading">
            <span className="label-support-icon">
              <Icon name="tag" size={17} />
            </span>
            <div>
              <strong>Dukungan label barcode</strong>
              <small>
                Atur sensor, ukuran minimum, jumlah baris, dan status support.
              </small>
            </div>
          </div>
          <label className="label-applicable-toggle">
            <input
              type="checkbox"
              checked={draft.labelSupport.applicable}
              onChange={(event) =>
                setLabelField("applicable", event.target.checked)
              }
            />{" "}
            Produk ini mencetak / mendukung label
          </label>
          <label className="label-applicable-toggle">
            <input
              type="checkbox"
              checked={draft.labelSupport.demoData}
              onChange={(event) =>
                setLabelField("demoData", event.target.checked)
              }
            />{" "}
            Tandai spesifikasi label sebagai data demo / belum diverifikasi
          </label>
          {draft.labelSupport.applicable && (
            <>
              <div className="product-minimum-fields">
                <label className="field-label">
                  Lebar minimum (mm)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={draft.labelSupport.minWidthMm ?? ""}
                    onChange={(event) =>
                      setLabelField(
                        "minWidthMm",
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    placeholder="Belum ditentukan"
                  />
                </label>
                <label className="field-label">
                  Tinggi minimum (mm)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={draft.labelSupport.minHeightMm ?? ""}
                    onChange={(event) =>
                      setLabelField(
                        "minHeightMm",
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    placeholder="Belum ditentukan"
                  />
                </label>
              </div>
              <div className="sensor-editor-grid">
                {draft.labelSupport.sensorTypes.map((sensor) => (
                  <div className="sensor-editor-row" key={sensor.type}>
                    <label>
                      <input
                        type="checkbox"
                        checked={sensor.supported}
                        onChange={(event) =>
                          updateSensor(
                            sensor.type,
                            "supported",
                            event.target.checked,
                          )
                        }
                      />
                      <strong>{sensor.type}</strong>
                      <span>Support</span>
                    </label>
                    <input
                      aria-label={`Catatan ${sensor.type}`}
                      value={sensor.note}
                      onChange={(event) =>
                        updateSensor(sensor.type, "note", event.target.value)
                      }
                      placeholder={`Catatan tipe ${sensor.type}`}
                    />
                  </div>
                ))}
              </div>
              <div className="label-sizes-editor">
                <div className="label-sizes-heading">
                  <div>
                    <strong>Ukuran dan format barcode</strong>
                    <small>Contoh: 33 × 13 mm, 1 / 2 / 3 baris.</small>
                  </div>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={addSize}
                  >
                    <Icon name="plus" size={14} /> Tambah ukuran
                  </button>
                </div>
                {draft.labelSupport.sizes.length === 0 && (
                  <p className="no-label-sizes-admin">
                    Belum ada ukuran terdaftar. Klik “Tambah ukuran” untuk
                    memasukkan konfigurasi.
                  </p>
                )}
                {draft.labelSupport.sizes.map((size, index) => (
                  <div className="label-size-editor-row" key={`size-${index}`}>
                    <label className="field-label">
                      Lebar
                      <input
                        aria-label={`Lebar ukuran ${index + 1}`}
                        type="number"
                        min="1"
                        value={size.widthMm}
                        onChange={(event) =>
                          updateSize(
                            index,
                            "widthMm",
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                    <label className="field-label">
                      Tinggi
                      <input
                        aria-label={`Tinggi ukuran ${index + 1}`}
                        type="number"
                        min="1"
                        value={size.heightMm}
                        onChange={(event) =>
                          updateSize(
                            index,
                            "heightMm",
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                    <label className="field-label">
                      Baris
                      <input
                        aria-label={`Baris ukuran ${index + 1}`}
                        type="number"
                        min="1"
                        value={size.lines}
                        onChange={(event) =>
                          updateSize(index, "lines", Number(event.target.value))
                        }
                      />
                    </label>
                    <label className="field-label label-barcode-type-field">
                      Tipe barcode
                      <input
                        aria-label={`Tipe barcode ukuran ${index + 1}`}
                        value={size.barcodeType}
                        onChange={(event) =>
                          updateSize(index, "barcodeType", event.target.value)
                        }
                        placeholder="Code 128 / QR"
                      />
                    </label>
                    <label className="field-label label-size-note-field">
                      Catatan
                      <input
                        aria-label={`Catatan ukuran ${index + 1}`}
                        value={size.note}
                        onChange={(event) =>
                          updateSize(index, "note", event.target.value)
                        }
                        placeholder="Catatan kompatibilitas"
                      />
                    </label>
                    <label className="label-size-supported">
                      <input
                        type="checkbox"
                        checked={size.supported}
                        onChange={(event) =>
                          updateSize(index, "supported", event.target.checked)
                        }
                      />{" "}
                      Support
                    </label>
                    <button
                      type="button"
                      className="remove-label-size"
                      aria-label={`Hapus ukuran ${index + 1}`}
                      onClick={() => removeSize(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <label className="field-label label-note-field">
                Catatan umum kompatibilitas
                <textarea
                  value={draft.labelSupport.note}
                  onChange={(event) =>
                    setLabelField("note", event.target.value)
                  }
                  placeholder="Contoh: perlu kalibrasi sebelum cetak pertama"
                />
              </label>
            </>
          )}
        </section>
        {error && <p className="form-error">{error}</p>}
        <div className="product-editor-footer">
          <span>Perubahan disimpan lokal di browser untuk testing.</span>
          <div>
            <button
              type="button"
              className="button-secondary"
              onClick={onCancel}
            >
              Batal
            </button>
            <button className="button-primary" type="submit">
              {initialProduct ? "Simpan perubahan" : "Tambah produk"}{" "}
              <Icon name="check" size={15} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

type ProductCardProps = {
  product: Product;
  isAdmin: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
};
function ProductCard({
  product,
  isAdmin,
  onClick,
  onEdit,
  onDelete,
}: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-card-top">
        <span className={`product-thumb ${product.accent}`}>
          <Icon name={product.icon} size={24} />
        </span>
        <button
          className="more-button"
          aria-label={`Detail ${product.name}`}
          onClick={onClick}
        >
          ···
        </button>
      </div>
      <span className="product-category">{product.category}</span>
      {product.category === "Barcode Printer" && (
        <span
          className={`product-verification-badge ${product.labelSupport?.demoData ? "unverified" : "verified"}`}
        >
          {product.labelSupport?.demoData
            ? "Belum diverifikasi"
            : "Terverifikasi"}
        </span>
      )}
      <h3>{product.name}</h3>
      <p>
        {product.brand} <i>·</i> {product.code}
      </p>
      <div className="product-tags">
        {product.connections.map((item) => (
          <span key={item}>
            {item === "Bluetooth" && <Icon name="bluetooth" size={12} />}
            {item}
          </span>
        ))}
      </div>
      <ProductDriverActions url={product.driverDownloadUrl} variant="card" />
      <button className="product-card-link" onClick={onClick}>
        Lihat detail <Icon name="arrow" size={14} />
      </button>
      {isAdmin && (
        <div className="product-admin-actions">
          <button onClick={onEdit}>Edit</button>
          <button onClick={onDelete}>Hapus</button>
        </div>
      )}
    </article>
  );
}

function ProductDriverActions({
  url,
  variant,
}: {
  url?: string;
  variant: "card" | "modal";
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const driverUrl = url?.trim() ?? "";

  const copyDriverUrl = async () => {
    if (!driverUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(driverUrl);
      } else {
        const input = document.createElement("textarea");
        input.value = driverUrl;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(input);
        if (!copied) throw new Error("Clipboard unavailable");
      }
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1800);
  };

  return (
    <div className={`product-driver-actions product-driver-actions-${variant}`}>
      {driverUrl ? (
        <a
          className="product-driver-link"
          href={driverUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="download" size={14} /> Download driver
        </a>
      ) : (
        <button
          className="product-driver-link"
          type="button"
          disabled
          title="Admin belum menambahkan link driver"
        >
          <Icon name="download" size={14} /> Driver belum tersedia
        </button>
      )}
      <button
        className="product-driver-copy"
        type="button"
        disabled={!driverUrl}
        onClick={() => void copyDriverUrl()}
        aria-label={
          copyState === "copied" ? "Link driver tersalin" : "Salin link driver"
        }
        title={
          copyState === "failed" ? "Gagal menyalin link" : "Salin link driver"
        }
      >
        <Icon name={copyState === "copied" ? "check" : "copy"} size={14} />
        {copyState === "copied"
          ? "Tersalin"
          : copyState === "failed"
            ? "Gagal"
            : "Salin link"}
      </button>
    </div>
  );
}

export default App;
