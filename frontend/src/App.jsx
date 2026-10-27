import { useState, useMemo,useEffect, Fragment } from 'react';
import {
  Link2, ShieldCheck, FileCheck, Hash, QrCode, Upload, Wallet,
  ArrowRight, ArrowLeft, ChevronRight, CheckCircle2, XCircle,
  Download, ExternalLink, Copy, Sparkles,
} from 'lucide-react';
import { ethers } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract';
/* ---------------------------------- data ---------------------------------- */

const STEPS = [
  { key: 'issued', label: 'Issued', icon: FileCheck },
  { key: 'hashed', label: 'Hashed', icon: Hash },
  { key: 'anchored', label: 'Anchored', icon: Link2 },
  { key: 'verified', label: 'Verified', icon: ShieldCheck },
];

const TEMPLATES = [
  {
    id: 'heritage-gold', name: 'Heritage Gold', tagline: 'Classic parchment with a gold foil seal.',
    paper: '#F4EEDD', line: '#E1D5AE', ink: '#1C2B33', muted: '#6E6650',
    accent: '#C9A227', accentDeep: '#8B6A14', sealIconColor: '#1C2B33',
    nameStyle: 'italic', border: 'corner',
  },
  {
    id: 'emerald-seal', name: 'Emerald Seal', tagline: 'Sage paper with a deep emerald wax seal.',
    paper: '#F1F3EA', line: '#D7DEC7', ink: '#1E2B22', muted: '#5E6A56',
    accent: '#2F6E4E', accentDeep: '#1F4A34', sealIconColor: '#F1F3EA',
    nameStyle: 'italic', border: 'corner',
  },
  {
    id: 'onyx-modern', name: 'Onyx Modern', tagline: 'Near-black card with brushed-silver accents.',
    paper: '#12161A', line: 'rgba(244,238,221,0.16)', ink: '#F4EEDD', muted: 'rgba(244,238,221,0.55)',
    accent: '#C7C7C7', accentDeep: '#9A9A9A', sealIconColor: '#12161A',
    nameStyle: 'upper', border: 'double',
  },
  {
    id: 'terracotta-academic', name: 'Terracotta Academic', tagline: 'Warm clay tones for academic honors.',
    paper: '#F6EEE1', line: '#E8D3B8', ink: '#3A2415', muted: '#8A6F55',
    accent: '#C1652F', accentDeep: '#8A431D', sealIconColor: '#F6EEE1',
    nameStyle: 'italic', border: 'corner',
  },
  {
    id: 'sapphire-formal', name: 'Sapphire Formal', tagline: 'Cool sapphire ink with a formal double rule.',
    paper: '#EDF0F6', line: '#CBD5E3', ink: '#1B2A3D', muted: '#5B6B80',
    accent: '#28496E', accentDeep: '#1B3350', sealIconColor: '#EDF0F6',
    nameStyle: 'upper', border: 'double',
  },
];

const SAMPLE_CERT = {
  name: 'Jordan Lee',
  course: 'Sample Certificate Title',
  institution: 'Your Organization',
  date: new Date().toISOString().slice(0, 10),
};

const MOCK_DB = {
  'CERT-4F8K2Q': {
    id: 'CERT-4F8K2Q', name: 'Ananya Sharma', course: 'Full-Stack Web Development',
    institution: 'Indore Institute of Technology', date: '2026-06-14',
    cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    tx: '0x8f2c4e91a7b6d3f0195e4c8a2b7f6d3e9c1a0b5f4d8e7c6b3a2f1e0d9c8b7a65',
    mode: 'pdf', designId: null,
  },
  'CERT-9XQ2LM': {
    id: 'CERT-9XQ2LM', name: 'Rahul Mehta', course: 'Blockchain & Smart Contract Fundamentals',
    institution: 'Lumen DevCert', date: '2026-07-02',
    cid: 'bafybeihq7k2m9vxrzn5s3ptlwc84dfg6ajb1yeo0uhx2icmqzr7vsknpa',
    tx: '0x3b7e1f4a9c6d2e8b5f0a7c1d4e9b6f3a8c2d5e0b7f4a1c9d6e3b8f5a2c0d7e91',
    mode: 'digital', designId: 'sapphire-formal',
  },
};

/* --------------------------------- helpers --------------------------------- */

function shortAddr(addr) {
  return addr.slice(0, 6) + '\u2026' + addr.slice(-4);
}

function genCert(form, mode, designId) {
  const id = 'CERT-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const cid = 'bafybei' + Array.from({ length: 20 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  const hex = '0123456789abcdef';
  const tx = '0x' + Array.from({ length: 40 }, () => hex[Math.floor(Math.random() * hex.length)]).join('');
  return {
    id, name: form.name, course: form.course, institution: form.institution, date: form.date,
    cid, tx, mode, designId: mode === 'digital' ? designId : null,
  };
}

function formatDate(iso) {
  try {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
      return iso;
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return iso;
  }
}

function buildQRPattern(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const cells = [];
  for (let i = 0; i < 64; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push((h >> 16) % 3 === 0);
  }
  return cells;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

async function generateTemplateFromPrompt(prompt) {
  const response = await fetch('http://localhost:5000/api/ai-design', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'AI design generation failed');
  }

  const design = result.design;

  return {
    id: 'gen-' + Date.now().toString(36),
    name: design.title || 'AI Generated Certificate',
    tagline: `AI-generated: ${prompt}`,
    paper: design.backgroundColor || '#FDFCF7',
    line: design.accentColor || '#D4AF37',
    ink: design.textColor || '#1A1A1A',
    muted: '#666666',
    accent: design.primaryColor || '#13294B',
    accentDeep: design.primaryColor || '#13294B',
    sealIconColor: design.backgroundColor || '#FDFCF7',
    nameStyle: design.fontStyle === 'classic' ? 'italic' : 'upper',
    border: design.borderStyle === 'double' ? 'double' : 'corner',
    generated: true,
  };
}

function statusLabel(status, step, mode) {
  if (status === 'processing') {
    if (step === 1) return mode === 'digital' ? 'Rendering the digital certificate\u2026' : 'Uploading and pinning the PDF to IPFS\u2026';
    if (step === 2) return 'Computing the document hash\u2026';
    if (step === 3) return 'Writing the hash to the smart contract\u2026';
  }
  if (status === 'done') return 'Anchored on-chain. Certificate issued.';
  return mode === 'digital' ? 'Fill in the form to begin.' : 'Fill in the form and attach a PDF to begin.';
}

/* ------------------------------- small pieces ------------------------------- */

function ChainStrip({ active = 0, size = 'md', animate = false }) {
  const dim = size === 'sm' ? 30 : 42;
  return (
    <div className="flex items-center w-full">
      {STEPS.map((s, i) => {
        const done = i < active;
        const Icon = s.icon;
        return (
          <Fragment key={s.key}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={animate && done ? 'animate-fadeup' : ''}
                style={{
                  width: dim, height: dim, borderRadius: 9999, border: '2px solid',
                  borderColor: done ? 'var(--gold)' : 'rgba(244,238,221,0.22)',
                  backgroundColor: done ? 'var(--gold)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animationDelay: animate ? `${i * 120}ms` : undefined, flexShrink: 0,
                }}
              >
                <Icon size={size === 'sm' ? 13 : 17} style={{ color: done ? 'var(--ink)' : 'rgba(244,238,221,0.4)' }} />
              </div>
              <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: done ? 'var(--parchment)' : 'rgba(244,238,221,0.35)' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1" style={{ height: 1, marginBottom: 20, backgroundColor: i < active - 1 ? 'var(--gold)' : 'rgba(244,238,221,0.18)' }} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="font-mono uppercase tracking-wider" style={{ fontSize: 11, color: 'var(--gold-deep)' }}>{label}</p>
      <p className={mono ? 'font-mono' : 'font-body'} style={{ color: 'var(--ink-text)', fontSize: 14, marginTop: 2 }}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value, href }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    try { navigator.clipboard.writeText(value); } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  return (
    <div className="flex items-center justify-between gap-3 py-3" style={{ borderBottom: '1px solid rgba(244,238,221,0.1)' }}>
      <span className="font-body flex-shrink-0" style={{ fontSize: 13, color: 'rgba(244,238,221,0.55)' }}>{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono truncate" style={{ fontSize: 12, color: 'var(--parchment)', maxWidth: 160 }}>{value}</span>
        <button onClick={copy} aria-label={`Copy ${label}`} className="p-1 rounded flex-shrink-0" style={{ color: 'var(--gold)' }}>
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
        </button>
        {href && (
          <a href={href} target="_blank" rel="noreferrer" aria-label={`Open ${label}`} className="p-1 flex-shrink-0" style={{ color: 'var(--gold)' }}>
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

function QRCodeDisplay({ cert }) {
  const verificationUrl =
    `${window.location.origin}/?verify=${encodeURIComponent(cert.id)}`;

  return (
    <div className="text-center">
      <div
        style={{
          display: 'inline-flex',
          padding: 10,
          backgroundColor: 'var(--parchment)',
          borderRadius: 10,
          border: '1px solid var(--parchment-line)',
        }}
      >
        <QRCodeSVG
          value={verificationUrl}
          size={120}
          bgColor="#F4EEDD"
          fgColor="#0B1B24"
          level="H"
        />
      </div>

      <p
        className="font-mono"
        style={{
          fontSize: 10,
          color: 'rgba(244,238,221,0.4)',
          marginTop: 8,
        }}
      >
        Scan to verify
      </p>
    </div>
  );
}

function CornerMark({ color, style }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={style}>
      <path d="M2 11V2H11" style={{ stroke: color || 'var(--gold)', strokeWidth: 1.5 }} />
    </svg>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 50 }} className="animate-fadeup">
      <div className="font-body shadow-lg" style={{ backgroundColor: 'var(--parchment)', color: 'var(--ink)', fontSize: 14, padding: '12px 20px', borderRadius: 9999 }}>
        {message}
      </div>
    </div>
  );
}

function CertificateCard({ cert, template, compact }) {
  const t = template || TEMPLATES[0];
  const pad = compact ? '26px 18px' : '56px 40px';
  const nameSize = compact ? 15 : 34;
  const courseSize = compact ? 12 : 20;
  const labelSize = compact ? 9 : 12;
  const sealSize = compact ? 32 : 64;
  const iconSize = compact ? 14 : 28;

  return (
    <div
      className="relative rounded-2xl"
      style={{ backgroundColor: t.paper, padding: pad, border: t.border === 'double' ? `2px solid ${t.accent}` : `1px solid ${t.line}` }}
    >
      {t.border === 'double' && (
        <div style={{ position: 'absolute', inset: compact ? 6 : 12, border: `1px solid ${t.accent}`, borderRadius: 12, pointerEvents: 'none' }} />
      )}
      {t.border === 'corner' && !compact && (
        <>
          <CornerMark color={t.accent} style={{ position: 'absolute', top: 16, left: 16 }} />
          <CornerMark color={t.accent} style={{ position: 'absolute', top: 16, right: 16, transform: 'scaleX(-1)' }} />
          <CornerMark color={t.accent} style={{ position: 'absolute', bottom: 16, left: 16, transform: 'scaleY(-1)' }} />
          <CornerMark color={t.accent} style={{ position: 'absolute', bottom: 16, right: 16, transform: 'scale(-1, -1)' }} />
        </>
      )}

      <p className="font-mono text-center uppercase" style={{ fontSize: labelSize, letterSpacing: '0.2em', color: t.accentDeep }}>
        Certificate of completion
      </p>
      <p
        className="text-center"
        style={{
          fontFamily: t.nameStyle === 'upper' ? "'IBM Plex Sans', sans-serif" : "'Libre Caslon Text', Georgia, serif",
          fontStyle: t.nameStyle === 'upper' ? 'normal' : 'italic',
          fontWeight: t.nameStyle === 'upper' ? 700 : 400,
          textTransform: t.nameStyle === 'upper' ? 'uppercase' : 'none',
          letterSpacing: t.nameStyle === 'upper' ? '0.04em' : 'normal',
          fontSize: nameSize, color: t.ink, marginTop: compact ? 8 : 16,
        }}
      >
        {cert.name}
      </p>
      <p className="font-body text-center" style={{ fontSize: compact ? 11 : 14, color: t.muted, marginTop: compact ? 6 : 12 }}>
        has successfully completed
      </p>
      <p className="font-display text-center" style={{ fontSize: courseSize, color: t.ink, marginTop: 4 }}>{cert.course}</p>
      <p className="font-body text-center" style={{ fontSize: compact ? 10 : 13, color: t.muted, marginTop: compact ? 12 : 24 }}>
        {cert.institution} &middot; Issued {formatDate(cert.date)}
      </p>

      <div className="flex items-center justify-center" style={{ marginTop: compact ? 16 : 36 }}>
        <div
          className={compact ? '' : 'animate-stamp'}
          style={{ width: sealSize, height: sealSize, borderRadius: 9999, backgroundColor: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ShieldCheck size={iconSize} style={{ color: t.sealIconColor }} />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- nav / footer --------------------------------- */

function NavBar({ page, setPage, wallet, connecting, onConnect }) {
  const links = [
    { key: 'home', label: 'Home' },
    { key: 'issue', label: 'Issue' },
    { key: 'verify', label: 'Verify' },
    { key: 'designs', label: 'Designs' },
  ];
  return (
    <header className="sticky top-0 z-30 border-b" style={{ borderColor: 'rgba(201,162,39,0.22)', backgroundColor: 'rgba(11,27,36,0.94)', backdropFilter: 'blur(8px)' }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <button onClick={() => setPage('home')} className="flex items-center gap-2">
          <span className="flex items-center justify-center rounded-full border" style={{ width: 32, height: 32, borderColor: 'var(--gold)' }}>
            <Link2 size={15} style={{ color: 'var(--gold)' }} />
          </span>
          <span className="font-display" style={{ fontSize: 19, letterSpacing: '0.02em', color: 'var(--parchment)' }}>CertiChain</span>
        </button>

        <nav className="hidden sm:flex items-center gap-1 font-body" style={{ fontSize: 14 }}>
          {links.map((l) => (
            <button
              key={l.key}
              onClick={() => setPage(l.key)}
              className="px-3 py-1.5 rounded-full transition-colors"
              style={{ color: page === l.key ? 'var(--ink)' : 'var(--parchment)', backgroundColor: page === l.key ? 'var(--gold)' : 'transparent' }}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <button
          onClick={onConnect}
          className="font-mono flex items-center gap-2 rounded-full border transition-colors"
          style={{
            fontSize: 12, padding: '8px 14px', borderColor: 'var(--gold)',
            color: wallet ? 'var(--ink)' : 'var(--gold)', backgroundColor: wallet ? 'var(--gold)' : 'transparent',
          }}
        >
          <Wallet size={14} />
          {connecting ? 'Connecting\u2026' : wallet ? shortAddr(wallet) : 'Connect wallet'}
        </button>
      </div>

      <div className="sm:hidden flex items-center justify-center flex-wrap gap-1 pb-3 font-body" style={{ fontSize: 13 }}>
        {links.map((l) => (
          <button
            key={l.key}
            onClick={() => setPage(l.key)}
            className="px-3 py-1.5 rounded-full"
            style={{ color: page === l.key ? 'var(--ink)' : 'var(--parchment)', backgroundColor: page === l.key ? 'var(--gold)' : 'transparent' }}
          >
            {l.label}
          </button>
        ))}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t mt-10" style={{ borderColor: 'rgba(201,162,39,0.15)' }}>
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
        <p className="font-mono" style={{ fontSize: 11, color: 'rgba(244,238,221,0.4)' }}>CertiChain \u2014 certificate integrity, secured by SHA-256 hashing and Polygon anchoring.</p>
        <p className="font-mono" style={{ fontSize: 11, color: 'rgba(244,238,221,0.3)' }}>Frontend preview \u00b7 smart contract not yet connected</p>
      </div>
    </footer>
  );
}

/* ---------------------------------- pages ---------------------------------- */

function HomePage({ setPage }) {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-16 md:pt-24 md:pb-20">
<p className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: '0.15em', color: 'var(--gold)', marginBottom: 16 }}>
  Secure digital certificates · powered by blockchain
</p>

<h1 className="font-display leading-tight max-w-3xl" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.75rem)', color: 'var(--parchment)' }}>
  Issue. <span style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Verify.</span> Trust.
</h1>

<p className="font-body max-w-xl" style={{ fontSize: 17, lineHeight: 1.6, color: 'rgba(244,238,221,0.75)', marginTop: 24 }}>
  Create secure digital certificates, store their records on the blockchain,
  and verify their authenticity anytime using a unique certificate ID or QR code.
</p>
        <div className="flex flex-wrap gap-4 mt-8">
          <button onClick={() => setPage('verify')} className="btn-primary">Verify a certificate <ArrowRight size={16} /></button>
          <button onClick={() => setPage('issue')} className="btn-outline">Issue a certificate</button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-2xl p-6 md:p-10" style={{ border: '1px solid rgba(201,162,39,0.22)', backgroundColor: 'var(--ink-soft)' }}>
          <p className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: '0.1em', color: 'rgba(244,238,221,0.5)', marginBottom: 28 }}>Chain of custody</p>
          <ChainStrip active={4} animate size="md" />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--parchment)' }}>
          <h3 className="font-display" style={{ fontSize: 24, color: 'var(--ink)' }}>For issuers</h3>
          <p className="font-body" style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4, marginBottom: 20 }}>Issue a tamper-proof record in four steps.</p>
          <ol className="space-y-4">
            {['Enter student and course details', 'Attach a signed PDF, or choose a digital design', 'Certificate is pinned to IPFS', 'Hash is written to the smart contract'].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono" style={{ fontSize: 13, color: 'var(--gold-deep)', marginTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="font-body" style={{ fontSize: 14, color: 'var(--ink-text)' }}>{t}</span>
              </li>
            ))}
          </ol>
          <button onClick={() => setPage('issue')} className="font-mono uppercase flex items-center gap-1" style={{ fontSize: 12, color: 'var(--gold-deep)', marginTop: 24 }}>
            Start issuing <ChevronRight size={14} />
          </button>
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--parchment)' }}>
          <h3 className="font-display" style={{ fontSize: 24, color: 'var(--ink)' }}>For verifiers</h3>
          <p className="font-body" style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4, marginBottom: 20 }}>Confirm authenticity in three steps.</p>
          <ol className="space-y-4">
            {['Scan the QR code or enter the certificate ID', 'We fetch the matching on-chain record', 'See the verified result \u2014 instantly'].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono" style={{ fontSize: 13, color: 'var(--gold-deep)', marginTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="font-body" style={{ fontSize: 14, color: 'var(--ink-text)' }}>{t}</span>
              </li>
            ))}
          </ol>
          <button onClick={() => setPage('verify')} className="font-mono uppercase flex items-center gap-1" style={{ fontSize: 12, color: 'var(--gold-deep)', marginTop: 24 }}>
            Verify now <ChevronRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}

function ConnectPrompt({ onConnect, connecting }) {
  return (
    <div>
      <p className="font-body" style={{ fontSize: 14, color: 'rgba(244,238,221,0.7)', marginBottom: 16 }}>
        Connect your wallet to sign and issue certificates.
      </p>
      <button onClick={onConnect} className="btn-outline" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
        <Wallet size={16} /> {connecting ? 'Connecting\u2026' : 'Connect wallet'}
      </button>
    </div>
  );
}
async function calculateFileHash(file) {
  const buffer = await file.arrayBuffer();

  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);

  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
function IssuePage({
  wallet, connecting, onConnect, issuedCerts, addIssuedCert, onViewCertificate,
  templates, generatedTemplates, selectedDesignId, setSelectedDesignId, onBrowseDesigns, resolveTemplate,
}) {
  const [form, setForm] = useState({ name: '', course: '', institution: '', date: new Date().toISOString().slice(0, 10) });
  const [mode, setMode] = useState('pdf');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const allTemplates = [...generatedTemplates, ...templates];
  const currentTemplate = allTemplates.find((t) => t.id === selectedDesignId) || templates[0];

  async function handleSubmit(e) {
  e.preventDefault();

  if (!wallet) {
    setError("Connect your wallet first.");
    return;
  }

  const pdfOk = mode === "pdf" ? !!fileName : true;

  if (!form.name || !form.course || !form.institution || !pdfOk) {
    setError(
      mode === "pdf"
        ? "Fill in every field and attach the certificate PDF."
        : "Fill in every field to continue."
    );
    return;
  }

  setError("");
  setStatus("processing");
  setStep(1);

  try {
  // Generate certificate ID
  const certificateId =
    "CERT-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  // Generate SHA-256 hash from selected PDF
  let certificateHash = "";

  if (mode === "pdf" && selectedFile) {
    certificateHash = await calculateFileHash(selectedFile);
    console.log("Certificate SHA-256:", certificateHash);
  }
  let ipfsCID = "";

if (mode === "pdf" && selectedFile) {
  const formData = new FormData();
  formData.append("file", selectedFile);

  const uploadResponse = await fetch(
    "http://localhost:5000/api/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const uploadData = await uploadResponse.json();

  if (!uploadResponse.ok) {
    throw new Error(
      uploadData.message || "Failed to upload PDF to IPFS"
    );
  }

  ipfsCID = uploadData.cid;

  console.log("IPFS CID:", ipfsCID);
}

  // Send certificate data to backend
  const response = await fetch(
      "http://localhost:5000/api/certificates",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          certificateId: certificateId,
          studentName: form.name,
          course: form.course,
          issueDate: form.date,
          ipfsCID: ipfsCID,
          certificateHash: certificateHash,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to save certificate");
    }
   

// Connect to MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Connect to deployed smart contract
const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  signer
);

// Store certificate on blockchain
console.log("Sending certificate to blockchain...");

const tx = await contract.issueCertificate(
  certificateId,
  form.name,
  form.course,
  certificateHash,
  ipfsCID
);

console.log("Transaction sent:", tx.hash);

// Wait for blockchain confirmation
await tx.wait();

console.log("Blockchain transaction confirmed:", tx.hash);
// Save blockchain transaction hash to MongoDB
const updateResponse = await fetch(
  `http://localhost:5000/api/certificates/${certificateId}`,
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      blockchainTransactionHash: tx.hash,
    }),
  }
);

const updateData = await updateResponse.json();

if (!updateResponse.ok) {
  throw new Error(
    updateData.message || "Failed to save blockchain transaction hash"
  );
}

console.log("Transaction hash saved to MongoDB:", tx.hash);


    setStep(2);
    

    setTimeout(() => {
      setStep(3);
    }, 700);

    setTimeout(() => {
      setStep(4);

      const cert = {
        id: data.certificateId,
        name: data.studentName,
        course: data.course,
        institution: form.institution,
        date: form.date,
        cid: ipfsCID,
        tx: tx.hash,
        mode: mode,
        designId: mode === "digital" ? selectedDesignId : null,
      };

      setResult(cert);
      addIssuedCert(cert);
      setStatus("done");
    }, 1500);

  } catch (error) {
    console.error("Certificate creation error:", error);

    setStatus("idle");
    setStep(0);
    setError(error.message);
  }
}
  function reset() {
    setForm({ name: '', course: '', institution: '', date: new Date().toISOString().slice(0, 10) });
    setFileName('');
    setStatus('idle');
    setStep(0);
    setResult(null);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h2 className="font-display" style={{ fontSize: 30, color: 'var(--parchment)' }}>Issue a certificate</h2>
      <p className="font-mono" style={{ fontSize: 12, color: 'rgba(244,238,221,0.4)', marginTop: 8, marginBottom: 32 }}>
        Preview build \u2014 IPFS pinning and the smart contract call are simulated below.
      </p>

      <div className="grid md:grid-cols-5 gap-6">
        <form onSubmit={handleSubmit} className="md:col-span-3 rounded-2xl p-8 space-y-5" style={{ backgroundColor: 'var(--parchment)' }}>
          <div>
            <label className="field-label">Student name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ananya Sharma" />
          </div>
          <div>
            <label className="field-label">Course / certificate title</label>
            <input className="input-field" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="e.g. Full-Stack Web Development" />
          </div>
          <div>
            <label className="field-label">Issuer / organization</label>
            <input className="input-field" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g. your company, event, or platform name" />
          </div>
          <div>
            <label className="field-label">Issue date</label>
            <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          <div>
            <label className="field-label">Certificate type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('pdf')} className={'seg-btn flex-1' + (mode === 'pdf' ? ' active' : '')}>Signed PDF</button>
              <button type="button" onClick={() => setMode('digital')} className={'seg-btn flex-1' + (mode === 'digital' ? ' active' : '')}>Digital only</button>
            </div>
            <p className="font-body" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {mode === 'pdf' ? 'Attach the signed PDF below.' : 'No PDF needed \u2014 pick a design and we\u2019ll generate the certificate.'}
            </p>
          </div>

          {mode === 'pdf' && (
            <div>
              <label className="field-label">Certificate PDF</label>
              <label htmlFor="cert-pdf" className="flex items-center gap-3 cursor-pointer rounded-xl" style={{ border: '1px dashed var(--parchment-line)', padding: '16px' }}>
                <Upload size={18} style={{ color: 'var(--gold-deep)' }} />
                <span className="font-body" style={{ fontSize: 14, color: fileName ? 'var(--ink-text)' : 'var(--muted)' }}>
                  {fileName || 'Choose a PDF to attach'}
                </span>
              </label>
              <input id="cert-pdf" type="file" accept="application/pdf" className="hidden" onChange={(e) => {const file = e.target.files?.[0] || null;setSelectedFile(file);setFileName(file ? file.name : '');}} />
            </div>
          )}

          {mode === 'digital' && (
            <div>
              <label className="field-label">Certificate design</label>
              <div className="flex flex-wrap items-center gap-2">
                {allTemplates.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedDesignId(t.id)}
                    title={t.name}
                    style={{
                      width: 28, height: 28, borderRadius: 9999, backgroundColor: t.accent,
                      border: selectedDesignId === t.id ? '2px solid var(--ink)' : '2px solid transparent',
                      boxShadow: selectedDesignId === t.id ? '0 0 0 2px var(--gold)' : 'none', cursor: 'pointer',
                    }}
                  />
                ))}
                <button type="button" onClick={onBrowseDesigns} className="font-mono uppercase" style={{ fontSize: 11, color: 'var(--gold-deep)', marginLeft: 4 }}>
                  Browse all
                </button>
              </div>
              <p className="font-body" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Using: {currentTemplate.name}</p>
            </div>
          )}

          {error && <p className="font-body" style={{ fontSize: 13, color: 'var(--red)' }}>{error}</p>}

          <button type="submit" className="btn-primary" disabled={status === 'processing'} style={status === 'processing' ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}>
            {status === 'processing' ? 'Processing\u2026' : 'Issue certificate'}
          </button>
        </form>

        <div className="md:col-span-2 rounded-2xl p-8" style={{ backgroundColor: 'var(--ink-soft)', border: '1px solid rgba(201,162,39,0.2)' }}>
          <p className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: '0.1em', color: 'rgba(244,238,221,0.5)', marginBottom: 8 }}>Live status</p>

          {!wallet && <ConnectPrompt onConnect={onConnect} connecting={connecting} />}

          {wallet && (
            <div style={{ marginTop: 20 }}>
              <ChainStrip active={step} size="sm" animate={status === 'processing' || status === 'done'} />
              <p className="font-mono" style={{ fontSize: 12, color: 'rgba(244,238,221,0.6)', marginTop: 24 }}>{statusLabel(status, step, mode)}</p>
            </div>
          )}

          {status === 'done' && result && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(201,162,39,0.2)' }}>
              {result.mode === 'digital' && (
                <div style={{ marginBottom: 16 }}>
                  <CertificateCard cert={result} template={resolveTemplate(result)} compact />
                </div>
              )}
              <DetailRow label="Certificate ID" value={result.id} />
              <DetailRow label="IPFS CID" value={result.cid} />
              <DetailRow label="Transaction" value={result.tx} />
              <div className="flex flex-wrap gap-3" style={{ marginTop: 16 }}>
                <button className="btn-primary" onClick={() => onViewCertificate(result)}>View certificate <ArrowRight size={16} /></button>
                <button className="btn-outline" style={{ borderColor: 'rgba(244,238,221,0.3)', color: 'var(--parchment)' }} onClick={reset}>Issue another</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerifyPage({ mockDB, issuedCerts, onViewCertificate }) {
  const [input, setInput] = useState('');
  const [state, setState] = useState('idle');
  const [cert, setCert] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

 async function lookup(idArg) {
  const key = (idArg || input).trim().toUpperCase();

  if (!key) return;

  try {
    setState('loading');

    if (!window.ethereum) {
      throw new Error("MetaMask is not available.");
    }

    // Connect to MetaMask
    const provider = new ethers.BrowserProvider(window.ethereum);

    // Check network
    const network = await provider.getNetwork();

    console.log("========== VERIFICATION DEBUG ==========");
    console.log("Certificate ID:", key);
    console.log("Network chain ID:", network.chainId.toString());
    console.log("Expected Sepolia:", "11155111");
    console.log("Contract address:", CONTRACT_ADDRESS);

    if (network.chainId !== 11155111n) {
      throw new Error(
        "Wrong network. Please switch MetaMask to Ethereum Sepolia."
      );
    }

    // Check whether bytecode exists at the contract address
    const code = await provider.getCode(CONTRACT_ADDRESS);

    console.log("Contract bytecode:", code);
    console.log("========================================");

    if (code === "0x") {
      throw new Error(
        "No contract exists at this address on Ethereum Sepolia."
      );
    }

    // Connect to contract
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

    // Read certificate
    const result = await contract.verifyCertificate(key);

    console.log("Blockchain certificate:", result);

    const blockchainCert = {
  id: result[0],
  name: result[1],
  course: result[2],
  certificateHash: result[3],
  cid: result[4],
  date: new Date(Number(result[5]) * 1000).toISOString(),
  institution: "Blockchain Issuer",
  mode: "pdf",
  tx: "",
};

try {
  const backendResponse = await fetch(
    `http://localhost:5000/api/certificates/${encodeURIComponent(key)}`
  );

  if (backendResponse.ok) {
    const backendData = await backendResponse.json();

    blockchainCert.tx =
      backendData.blockchainTransactionHash || "";
  }
} catch (backendError) {
  console.error("Could not fetch transaction hash:", backendError);
}

    setCert(blockchainCert);
    setState('success');

  } catch (error) {
    console.error("Certificate verification error:", error);

    setCert(null);
    setState('notfound');
  }
}
  async function searchCertificates(query) {
  if (!query.trim()) {
    setSearchResults([]);
    return;
  }

  try {
    setSearching(true);

    const response = await fetch(
      `http://localhost:5000/api/certificates/search?q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Search failed");
    }

    setSearchResults(data.certificates || []);
  } catch (error) {
    console.error("Certificate search error:", error);
    setSearchResults([]);
  } finally {
    setSearching(false);
  }
}
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const certificateId = params.get('verify');

    if (certificateId) {
      const decodedId = decodeURIComponent(certificateId).toUpperCase();

      setInput(decodedId);
      lookup(decodedId);
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <h2 className="font-display" style={{ fontSize: 30, color: 'var(--parchment)' }}>Verify a certificate</h2>
      <p className="font-mono" style={{ fontSize: 12, color: 'rgba(244,238,221,0.4)', marginTop: 8 }}>
        Live verification — certificate data is read directly from the Ethereum Sepolia blockchain.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); lookup(); }}
        className="flex flex-col sm:flex-row gap-3 rounded-2xl p-6 md:p-8"
        style={{ marginTop: 32, backgroundColor: 'var(--ink-soft)', border: '1px solid rgba(201,162,39,0.2)' }}
      >
      <input
  value={input}
  onChange={(e) => {
    const value = e.target.value;
    setInput(value);
    searchCertificates(value);
  }}
  placeholder="Search by certificate ID, student name, or course"
  className="flex-1 font-mono rounded-xl"
  style={{
    backgroundColor: 'var(--ink)',
    border: '1px solid rgba(201,162,39,0.3)',
    color: 'var(--parchment)',
    fontSize: 14,
    padding: '12px 16px'
  }}
/>
        <button type="submit" className="btn-primary justify-center"><QrCode size={16} /> Verify</button>
      </form>

      <div className="flex flex-wrap gap-x-4 gap-y-2" style={{ marginTop: 12 }}>
        <button onClick={() => { setInput('CERT-4F8K2Q'); lookup('CERT-4F8K2Q'); }} className="font-mono underline" style={{ fontSize: 12, color: 'rgba(244,238,221,0.4)' }}>
          Valid \u00b7 signed PDF
        </button>
        <button onClick={() => { setInput('CERT-9XQ2LM'); lookup('CERT-9XQ2LM'); }} className="font-mono underline" style={{ fontSize: 12, color: 'rgba(244,238,221,0.4)' }}>
          Valid \u00b7 digital
        </button>
        <button onClick={() => { setInput('CERT-000000'); lookup('CERT-000000'); }} className="font-mono underline" style={{ fontSize: 12, color: 'rgba(244,238,221,0.4)' }}>
          Invalid ID
        </button>
      </div>
      {searching && (
  <p className="font-mono" style={{ marginTop: 16, color: 'var(--parchment)' }}>
    Searching certificates...
  </p>
)}

{!searching && searchResults.length > 0 && (
  <div className="space-y-3" style={{ marginTop: 20 }}>
    <h3
      className="font-display"
      style={{ color: 'var(--parchment)', fontSize: 20 }}
    >
      Search Results ({searchResults.length})
    </h3>

    {searchResults.map((item) => (
      <div
        key={item.certificateId}
        className="rounded-xl p-4"
        style={{
          backgroundColor: 'var(--ink-soft)',
          border: '1px solid rgba(201,162,39,0.2)'
        }}
      >
        <p style={{ color: 'var(--parchment)' }}>
          <strong>{item.studentName}</strong>
        </p>

        <p style={{ color: 'rgba(244,238,221,0.65)', fontSize: 13 }}>
          Certificate ID: {item.certificateId}
        </p>

        <p style={{ color: 'rgba(244,238,221,0.65)', fontSize: 13 }}>
          Course: {item.course}
        </p>

        <button
          type="button"
          onClick={() => {
            setInput(item.certificateId);
            lookup(item.certificateId);
          }}
          className="btn-primary"
          style={{ marginTop: 12 }}
        >
          Verify Certificate
        </button>
      </div>
    ))}
  </div>
)}

{!searching && input.trim() !== '' && searchResults.length === 0 && (
  <p
    className="font-mono"
    style={{ marginTop: 16, color: 'rgba(244,238,221,0.5)', fontSize: 12 }}
  >
    No matching certificates found.
  </p>
)}

      <div style={{ marginTop: 40 }}>
        {state === 'loading' && (
  <div
    className="text-center rounded-2xl"
    style={{
      border: '1px dashed rgba(244,238,221,0.2)',
      padding: '48px 24px'
    }}
  >
    <p
      className="font-body"
      style={{
        fontSize: 14,
        color: 'rgba(244,238,221,0.6)'
      }}
    >
      Checking certificate on Ethereum Sepolia...
    </p>
  </div>
)}
        {state === 'idle' && (
          <div className="text-center rounded-2xl" style={{ border: '1px dashed rgba(244,238,221,0.2)', padding: '48px 24px' }}>
            <Link2 size={22} className="mx-auto" style={{ color: 'rgba(244,238,221,0.3)', marginBottom: 12 }} />
            <p className="font-body" style={{ fontSize: 14, color: 'rgba(244,238,221,0.4)' }}>Enter a certificate ID above to check its authenticity.</p>
          </div>
        )}

        {state === 'success' && cert && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--parchment)' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
              <div className="animate-stamp" style={{ width: 48, height: 48, borderRadius: 9999, backgroundColor: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={22} style={{ color: 'var(--parchment)' }} />
              </div>
              <div>
                <p className="font-display" style={{ fontSize: 18, color: 'var(--ink)' }}>Verified</p>
                <p className="font-body" style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {cert.mode === 'digital' ? 'Digital certificate' : 'Signed PDF certificate'} \u00b7 matches the on-chain hash.
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Student" value={cert.name} />
              <Field label="Certificate ID" value={cert.id} mono />
              <Field label="Issuer" value={cert.institution} />
              <Field label="Issue date" value={formatDate(cert.date)} />
            </div>
            <button onClick={() => onViewCertificate(cert)} className="btn-primary" style={{ marginTop: 24 }}>
              View full certificate <ArrowRight size={16} />
            </button>
          </div>
        )}

        {state === 'notfound' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--ink-soft)', border: '1px solid rgba(162,59,46,0.4)' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
              <XCircle size={22} style={{ color: 'var(--red)' }} />
              <p className="font-display" style={{ fontSize: 18, color: 'var(--parchment)' }}>No record found</p>
            </div>
            <p className="font-body" style={{ fontSize: 14, color: 'rgba(244,238,221,0.6)' }}>
              We couldn't find a certificate matching "{input}". Double-check the ID, or ask the issuer to resend it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CertificatePage({ cert, template, onBack, showToast }) {
   const safeTemplate = template || TEMPLATES[0];

  if (!cert) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="font-display" style={{ fontSize: 22, color: 'var(--parchment)' }}>No certificate selected</p>
        <p className="font-body" style={{ fontSize: 14, color: 'rgba(244,238,221,0.5)', marginTop: 8, marginBottom: 24 }}>
          Verify a certificate first to view its full record here.
        </p>
        <button onClick={onBack} className="btn-primary">Go to verify <ArrowRight size={16} /></button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <button onClick={onBack} className="font-mono uppercase flex items-center gap-1" style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back
      </button>

      {cert.mode && (
        <p className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(244,238,221,0.4)', marginBottom: 12 }}>
          {cert.mode === 'digital' ? 'Digital certificate' : 'Signed PDF certificate'}
        </p>
      )}

     <CertificateCard cert={cert} template={safeTemplate} />

      {cert.mode === 'digital' && (
        <p className="font-mono text-center" style={{ fontSize: 11, color: 'rgba(244,238,221,0.4)', marginTop: 12 }}>Design: {safeTemplate.name}</p>
      )}

      <div className="rounded-2xl" style={{ backgroundColor: 'var(--ink-soft)', border: '1px solid rgba(201,162,39,0.2)', padding: '28px 32px', marginTop: 20 }}>
        <p className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: '0.1em', color: 'rgba(244,238,221,0.5)', marginBottom: 16 }}>Blockchain record</p>
        <DetailRow label="Certificate ID" value={cert.id} />
        <DetailRow label="IPFS CID" value={cert.cid} href={`https://ipfs.io/ipfs/${cert.cid}`} />
        <DetailRow label="Transaction" value={cert.tx} href={`https://sepolia.etherscan.io/tx/${cert.tx}`} />
        {cert.mode === 'digital' && <DetailRow label="Design" value={safeTemplate.name} />}
        <div className="flex flex-wrap items-end gap-6" style={{ marginTop: 20 }}>
          <button className="btn-primary" onClick={() => showToast('Connect IPFS storage to enable downloads.')}>
            <Download size={16} /> Download PDF
          </button>
          <QRCodeDisplay cert={cert} />
        </div>
      </div>
    </div>
  );
}

function DesignsPage({ templates, generatedTemplates, selectedDesignId, onSelect, onGenerate }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const all = [...generatedTemplates, ...templates];

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <p className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: '0.15em', color: 'var(--gold)', marginBottom: 12 }}>AI certificate designer</p>
      <h2 className="font-display" style={{ fontSize: 30, color: 'var(--parchment)' }}>Choose a design</h2>
      <p className="font-body" style={{ fontSize: 15, color: 'rgba(244,238,221,0.7)', marginTop: 8, maxWidth: 560 }}>
        Pick a look for certificates issued without a signed PDF. Your selection applies to every digital-only certificate you issue next.
      </p>

      <form
        onSubmit={async (e) => {
  e.preventDefault();

  if (!prompt.trim()) return;

  setGenerating(true);
  setError('');

  try {
    await onGenerate(prompt.trim());
    setPrompt('');
  } catch (err) {
    setError(err.message || 'Could not generate the design.');
  } finally {
    setGenerating(false);
  }
}}
        className="flex flex-col sm:flex-row gap-3 rounded-2xl p-5 md:p-6"
        style={{ marginTop: 28, backgroundColor: 'var(--ink-soft)', border: '1px solid rgba(201,162,39,0.2)' }}
      >
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe a mood, e.g. 'minimalist arctic blue'"
          className="flex-1 font-body rounded-xl"
          style={{ backgroundColor: 'var(--ink)', border: '1px solid rgba(201,162,39,0.3)', color: 'var(--parchment)', fontSize: 14, padding: '12px 16px' }}
        />
        <button
  type="submit"
  disabled={generating}
  className="btn-primary justify-center"
>
  <Sparkles size={16} />
  {generating ? 'Generating with AI...' : 'Generate design'}
</button>
      </form>
      {error && (
  <p style={{ color: '#ff7777', marginTop: 10, fontSize: 13 }}>
    {error}
  </p>
)}
      <p
  className="font-mono"
  style={{
    fontSize: 11,
    color: 'rgba(244,238,221,0.5)',
    marginTop: 8,
  }}
>
  Designs are generated using Google Gemini AI.
</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" style={{ marginTop: 32 }}>
        {all.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl overflow-hidden"
            style={{ border: selectedDesignId === t.id ? '2px solid var(--gold)' : '1px solid rgba(201,162,39,0.2)', backgroundColor: 'var(--ink-soft)' }}
          >
            <div style={{ padding: 16 }}>
              <CertificateCard template={t} cert={SAMPLE_CERT} compact />
            </div>
            <div className="flex items-center justify-between gap-3" style={{ padding: '0 20px 20px' }}>
              <div className="min-w-0">
                <p className="font-display truncate" style={{ fontSize: 16, color: 'var(--parchment)' }}>
                  {t.name} {t.generated && <Sparkles size={12} style={{ display: 'inline', marginLeft: 4, color: 'var(--gold)' }} />}
                </p>
                <p className="font-body" style={{ fontSize: 12, color: 'rgba(244,238,221,0.5)', marginTop: 2 }}>{t.tagline}</p>
              </div>
              <button
                onClick={() => onSelect(t.id)}
                className="font-mono uppercase flex items-center gap-1 flex-shrink-0"
                style={{ fontSize: 11, color: selectedDesignId === t.id ? 'var(--green)' : 'var(--gold)' }}
              >
                {selectedDesignId === t.id ? (<><CheckCircle2 size={14} /> Selected</>) : 'Use this design'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------- app ----------------------------------- */

export default function App() {
  const [page, setPage] = useState(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('verify') ? 'verify' : 'home';
});
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [issuedCerts, setIssuedCerts] = useState([]);
  const [viewingCert, setViewingCert] = useState(null);
  const [toast, setToast] = useState('');
  const [generatedTemplates, setGeneratedTemplates] = useState([]);
  const [selectedDesignId, setSelectedDesignId] = useState(TEMPLATES[0].id);

 async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask.");
    return;
  }

  try {
    setConnecting(true);

    const provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.send("eth_requestAccounts", []);

    const address = accounts[0];

    const network = await provider.getNetwork();

    if (network.chainId !== 11155111n) {
      alert("Please switch MetaMask to Ethereum Sepolia.");
      setConnecting(false);
      return;
    }

    setWallet(address);

    console.log("Connected wallet:", address);
    console.log("Network:", network);

  } catch (error) {
    console.error("MetaMask connection error:", error);
    alert("Failed to connect MetaMask.");
  } finally {
    setConnecting(false);
  }
}

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  function viewCertificate(cert) {
    setViewingCert(cert);
    setPage('certificate');
  }

  async function handleGenerate(promptText) {
  const t = await generateTemplateFromPrompt(promptText);

  setGeneratedTemplates((prev) => [t, ...prev]);
  setSelectedDesignId(t.id);
}

  function resolveTemplate(cert) {
    if (cert && cert.mode === 'digital' && cert.designId) {
      return [...generatedTemplates, ...TEMPLATES].find((t) => t.id === cert.designId) || TEMPLATES[0];
    }
    return TEMPLATES[0];
  }

  return (
    <div className="min-h-screen font-body" style={{ backgroundColor: 'var(--ink)', color: 'var(--parchment)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        :root {
          --ink: #0B1B24;
          --ink-soft: #132530;
          --parchment: #F4EEDD;
          --parchment-line: #E1D5AE;
          --gold: #C9A227;
          --gold-deep: #8B6A14;
          --green: #2F6E4E;
          --red: #A23B2E;
          --ink-text: #1C2B33;
          --muted: #6E6650;
        }

        .font-display { font-family: 'Libre Caslon Text', Georgia, serif; }
        .font-body { font-family: 'IBM Plex Sans', -apple-system, sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background-color: var(--gold); color: var(--ink);
          font-family: 'IBM Plex Sans', sans-serif; font-weight: 600; font-size: 14px;
          padding: 12px 24px; border-radius: 9999px; border: none; cursor: pointer;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(201,162,39,0.25); }

        .btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          background-color: transparent; color: var(--parchment);
          border: 1px solid rgba(244,238,221,0.35);
          font-family: 'IBM Plex Sans', sans-serif; font-weight: 600; font-size: 14px;
          padding: 12px 24px; border-radius: 9999px; cursor: pointer;
          transition: border-color .15s ease, color .15s ease;
        }
        .btn-outline:hover { border-color: var(--gold); color: var(--gold); }

        .seg-btn {
          font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 600;
          padding: 10px 14px; border-radius: 10px; border: 1px solid var(--parchment-line);
          background: #FFFFFF; color: var(--muted); cursor: pointer; transition: all .15s ease;
        }
        .seg-btn.active { background: var(--gold); border-color: var(--gold); color: var(--ink); }

        .field-label {
          display: block; font-family: 'IBM Plex Mono', monospace; font-size: 11px;
          text-transform: uppercase; letter-spacing: 0.08em; color: var(--gold-deep); margin-bottom: 6px;
        }
        .input-field {
          width: 100%; background-color: #FFFFFF; border: 1px solid var(--parchment-line);
          border-radius: 12px; padding: 11px 14px; font-family: 'IBM Plex Sans', sans-serif;
          font-size: 14px; color: var(--ink-text);
        }
        .input-field:focus { outline: 2px solid var(--gold); outline-offset: 1px; border-color: var(--gold); }

        *:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

        @keyframes stamp {
          0% { transform: scale(1.8) rotate(-12deg); opacity: 0; }
          55% { transform: scale(0.92) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); }
        }
        .animate-stamp { animation: stamp 0.5s cubic-bezier(.2,.8,.3,1.2) both; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeup { animation: fadeUp 0.45s ease both; }

        @media (prefers-reduced-motion: reduce) {
          .animate-stamp, .animate-fadeup { animation: none !important; }
        }
      `}</style>

      <NavBar page={page} setPage={setPage} wallet={wallet} connecting={connecting} onConnect={connectWallet} />

      <main>
        {page === 'home' && <HomePage setPage={setPage} />}
        {page === 'issue' && (
          <IssuePage
            wallet={wallet}
            connecting={connecting}
            onConnect={connectWallet}
            issuedCerts={issuedCerts}
            addIssuedCert={(cert) => setIssuedCerts((prev) => [...prev, cert])}
            onViewCertificate={viewCertificate}
            templates={TEMPLATES}
            generatedTemplates={generatedTemplates}
            selectedDesignId={selectedDesignId}
            setSelectedDesignId={setSelectedDesignId}
            onBrowseDesigns={() => setPage('designs')}
            resolveTemplate={resolveTemplate}
          />
        )}
        {page === 'verify' && <VerifyPage mockDB={MOCK_DB} issuedCerts={issuedCerts} onViewCertificate={viewCertificate} />}
        {page === 'certificate' && (
          <CertificatePage cert={viewingCert} template={TEMPLATES[0]} onBack={() => setPage('verify')} showToast={showToast} />
        )}
        {page === 'designs' && (
          <DesignsPage
            templates={TEMPLATES}
            generatedTemplates={generatedTemplates}
            selectedDesignId={selectedDesignId}
            onSelect={setSelectedDesignId}
            onGenerate={handleGenerate}
          />
        )}
      </main>

      <Footer />
      <Toast message={toast} />
    </div>
  );
}
