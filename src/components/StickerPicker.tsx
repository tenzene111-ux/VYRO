const STICKER_CATEGORIES: { label: string; stickers: string[] }[] = [
  { label: "Faces", stickers: ["😂", "😍", "😭", "😎", "🥳", "😱", "🤔", "🙄", "😴", "🤯", "🥰", "😤"] },
  { label: "Gestures", stickers: ["👍", "👎", "👏", "🙏", "🤝", "💪", "✌️", "🤙", "👌", "🫡", "🤞", "👋"] },
  { label: "Hearts", stickers: ["❤️", "💔", "💕", "💯", "🔥", "✨", "🎉", "⭐", "💀", "👀", "🙈", "💤"] },
  { label: "Bhutan", stickers: ["🐉", "🏔️", "🙏🏽", "🕉️", "🪷", "🎊", "🍵", "🧘", "🏹", "🦅", "🌄", "🎋"] },
];

export function StickerPicker({ onClose, onPick }: { onClose: () => void; onPick: (emoji: string) => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-h-[55vh] max-w-[440px] overflow-y-auto rounded-3xl glass-strong p-4">
        {STICKER_CATEGORIES.map((cat) => (
          <div key={cat.label} className="mb-3 last:mb-0">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mist">{cat.label}</p>
            <div className="grid grid-cols-6 gap-1.5">
              {cat.stickers.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onPick(s);
                    onClose();
                  }}
                  className="flex aspect-square items-center justify-center rounded-2xl chip text-[26px] active:scale-90"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
