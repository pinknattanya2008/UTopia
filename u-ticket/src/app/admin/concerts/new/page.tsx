import ConcertForm from "@/components/admin/ConcertForm";

export default function NewConcertPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">สร้างคอนเสิร์ต</h1>
        <p className="text-sm text-muted">เลือกผังสถานที่ กำหนดราคาแต่ละโซน และแพ็กเกจการขาย</p>
      </div>
      <ConcertForm />
    </div>
  );
}
