import { QRCodeSVG } from "qrcode.react";

export default function RoomCodeQr({ code }: { code: string }) {
  const joinUrl = `${window.location.origin}/play/${code}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-xl bg-white p-4">
        <QRCodeSVG value={joinUrl} size={200} />
      </div>
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-slate-400">Room code</p>
        <p className="text-4xl font-bold tracking-[0.3em]">{code}</p>
      </div>
    </div>
  );
}
