/** ข้อผิดพลาดที่แสดงให้ผู้ใช้เห็นได้ (ข้อความภาษาไทย + HTTP status) */
export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
