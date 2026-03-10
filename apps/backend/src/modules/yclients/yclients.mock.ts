export const mockMasters = [
  { id: 1, name: 'Александр Петров', avatar: '', avatar_big: '', specialization: 'Барбер-стилист' },
  { id: 2, name: 'Дмитрий Козлов', avatar: '', avatar_big: '', specialization: 'Топ-барбер' },
  { id: 3, name: 'Максим Волков', avatar: '', avatar_big: '', specialization: 'Барбер' },
];

export const mockServices = [
  { id: 101, title: 'Мужская стрижка', price_min: 1500, price: 1500, duration: 45, category_id: 1, category: { title: 'Стрижки' } },
  { id: 102, title: 'Стрижка машинкой', price_min: 1000, price: 1000, duration: 30, category_id: 1, category: { title: 'Стрижки' } },
  { id: 103, title: 'Детская стрижка', price_min: 1000, price: 1000, duration: 30, category_id: 1, category: { title: 'Стрижки' } },
  { id: 201, title: 'Оформление бороды', price_min: 1000, price: 1000, duration: 30, category_id: 2, category: { title: 'Борода' } },
  { id: 202, title: 'Бритьё головы', price_min: 1200, price: 1200, duration: 40, category_id: 2, category: { title: 'Борода' } },
  { id: 301, title: 'Стрижка + Борода', price_min: 2200, price: 2200, duration: 60, category_id: 3, category: { title: 'Комплексы' } },
  { id: 302, title: 'Royal комплекс', price_min: 3500, price: 3500, duration: 90, category_id: 3, category: { title: 'Комплексы' } },
  { id: 401, title: 'Камуфляж седины', price_min: 1500, price: 1500, duration: 30, category_id: 4, category: { title: 'Уход' } },
  { id: 402, title: 'Мытьё + укладка', price_min: 500, price: 500, duration: 15, category_id: 4, category: { title: 'Уход' } },
];

export function generateMockSlots(date: string): any[] {
  const slots = [];
  const baseHour = 10;
  const endHour = 20;

  for (let h = baseHour; h < endHour; h++) {
    for (const m of ['00', '30']) {
      // Randomly make some slots unavailable
      const available = Math.random() > 0.3;
      if (available) {
        slots.push({
          time: `${String(h).padStart(2, '0')}:${m}`,
          seance_length: 1800,
          datetime: `${date}T${String(h).padStart(2, '0')}:${m}:00`,
        });
      }
    }
  }
  return slots;
}

export function generateMockSchedule(): any[] {
  const schedule = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    // Closed on Mondays
    if (dow !== 1) {
      schedule.push({ date: d.toISOString().slice(0, 10) });
    }
  }
  return schedule;
}

let mockRecordId = 1000;

export function createMockRecord(params: any): any {
  mockRecordId++;
  return {
    id: mockRecordId,
    staff_id: params.appointments?.[0]?.staff_id,
    services: params.appointments?.[0]?.services || [],
    datetime: params.appointments?.[0]?.datetime,
    confirmed: 0,
    deleted: false,
  };
}
