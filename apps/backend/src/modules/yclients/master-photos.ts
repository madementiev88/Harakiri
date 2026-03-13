// Custom master photos — replaces low-quality YCLIENTS avatars
// Photos stored in apps/miniapp/public/masters/{id}.jpg

const MASTER_PHOTOS: Record<number, string> = {
  3327479: '3327479.jpg',   // Вадим Утяганов
  3509815: '3509815.jpg',   // Вадим Муракаев
  3757385: '3757385.jpg',   // Ватан Аитов
  3850489: '3850489.jpg',   // Андрей
  3850499: '3850499.jpg',   // Кирилл Калачёв
  4928343: '4928343.jpg',   // Артём Батурин
  4933864: '4933864.jpg',   // Рамиль Мукминов
  4987093: '4987093.jpg',   // Арсений
};

export function getMasterPhoto(masterId: number): string | null {
  return MASTER_PHOTOS[masterId] ?? null;
}
