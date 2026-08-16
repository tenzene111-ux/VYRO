import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Mail } from "lucide-react";

const FAQS = [
  { q: "How do I recover my account?", a: "Use \"Forgot password?\" on the login screen — we'll email you a reset link." },
  { q: "How does end-to-end encryption work?", a: "Direct messages are encrypted on your device before they're sent, so only you and the person you're messaging can read them — not even VYRO can." },
  { q: "How do I report a post, comment, or user?", a: "Tap the \"···\" menu on any post, comment, or profile and choose Report." },
  { q: "How do I delete a message?", a: "Long-press any message you sent to choose \"Delete for me\" or \"Delete for everyone.\"" },
  { q: "How do I turn on two-factor authentication?", a: "Go to Settings → Privacy & Security → Two-factor authentication and follow the setup steps." },
];

export function HelpCenter() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="px-4 safe-top">
      <header className="flex items-center gap-3 py-4">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-mist hover:text-ink">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg font-bold text-ink">Help center</h1>
      </header>

      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-mist">Frequently asked</p>
      <div className="mb-5 overflow-hidden rounded-2xl glass-card">
        {FAQS.map((item, i) => (
          <div key={item.q} className="border-b border-white/5 last:border-b-0">
            <button
              onClick={() => setOpenIndex((cur) => (cur === i ? null : i))}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
            >
              <span className="flex-1 text-[13.5px] font-medium text-ink">{item.q}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-mist transition-transform ${openIndex === i ? "rotate-180" : ""}`} />
            </button>
            {openIndex === i && <p className="px-3.5 pb-3.5 text-[12.5px] leading-relaxed text-mist">{item.a}</p>}
          </div>
        ))}
      </div>

      <a
        href="mailto:support@vyro.app"
        className="flex w-full items-center justify-center gap-2 rounded-2xl chip py-3 text-sm font-semibold text-ink"
      >
        <Mail className="h-4.5 w-4.5" /> Contact support
      </a>
    </div>
  );
}
