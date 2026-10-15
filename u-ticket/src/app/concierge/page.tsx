import ChatBox from "@/components/ChatBox";

export default function ConciergePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">AI Concierge</h1>
        <p className="text-sm text-muted">ผู้ช่วยเลือกโซนตามงบ คำนวณส่วนลดจากแต้ม และเตือนเรื่องบัตรนอกระบบ</p>
      </div>
      <ChatBox />
    </div>
  );
}
