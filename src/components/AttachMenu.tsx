import { Paperclip, BarChart3, MapPin, UserSquare2 } from "lucide-react";

export function AttachMenu({
  onClose,
  onFile,
  onPoll,
  onLocation,
  onContact,
}: {
  onClose: () => void;
  onFile: () => void;
  onPoll: () => void;
  onLocation: () => void;
  onContact: () => void;
}) {
  const act = (fn: () => void) => {
    fn();
    onClose();
  };
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-[440px] overflow-hidden rounded-3xl glass-strong">
        <AttachRow icon={Paperclip} label="Photo, video or file" onClick={() => act(onFile)} />
        <AttachRow icon={BarChart3} label="Poll" onClick={() => act(onPoll)} />
        <AttachRow icon={MapPin} label="Location" onClick={() => act(onLocation)} />
        <AttachRow icon={UserSquare2} label="Contact" onClick={() => act(onContact)} />
      </div>
    </>
  );
}

function AttachRow({ icon: Icon, label, onClick }: { icon: typeof Paperclip; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3.5 text-left text-[13.5px] font-medium text-ink last:border-b-0 hover:bg-white/5"
    >
      <Icon className="h-4.5 w-4.5" />
      {label}
    </button>
  );
}
