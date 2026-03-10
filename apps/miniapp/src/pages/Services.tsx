import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchServices } from '../api/queries';
import { useBookingStore } from '../store/booking';
import { useTelegram } from '../hooks/useTelegram';
import ServiceCart from '../components/ServiceCart';
import Skeleton from '../components/Skeleton';
import type { Service, ServiceCategory } from '@harakiri/shared';

export default function ServicesPage() {
  const selectedMaster = useBookingStore((s) => s.selectedMaster);
  const addToCart = useBookingStore((s) => s.addToCart);
  const removeFromCart = useBookingStore((s) => s.removeFromCart);
  const isInCart = useBookingStore((s) => s.isInCart);
  const clearCart = useBookingStore((s) => s.clearCart);
  const setStep = useBookingStore((s) => s.setStep);
  const cart = useBookingStore((s) => s.cart);
  const { haptic, showBackButton, hideMainButton } = useTelegram();
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());

  useEffect(() => {
    hideMainButton();
    showBackButton(() => {
      clearCart();
      setStep('masters');
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['services', selectedMaster?.id],
    queryFn: () => fetchServices(selectedMaster?.id),
  });

  // Auto-expand first category
  useEffect(() => {
    if (data?.categories?.length && expandedCats.size === 0) {
      setExpandedCats(new Set([data.categories[0].id]));
    }
  }, [data]);

  const toggleCategory = (catId: number) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const toggleService = (service: Service) => {
    if (isInCart(service.id)) {
      removeFromCart(service.id);
      haptic('light');
    } else {
      addToCart(service);
      haptic('medium');
    }
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} мин`;
    if (m === 0) return `${h}ч`;
    return `${h}ч ${m}мин`;
  };

  return (
    <div className="p-4 pb-32">
      <h1 className="text-xl font-bold mb-1">Выберите услуги</h1>
      <p className="text-harakiri-gray text-sm mb-4">
        {selectedMaster ? `Мастер: ${selectedMaster.name}` : 'Любой свободный мастер'}
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-harakiri-card rounded-2xl p-4">
              <Skeleton className="w-1/3 h-5 mb-4" />
              <Skeleton className="w-full h-14 mb-2" />
              <Skeleton className="w-full h-14" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.categories.map((category: ServiceCategory) => {
            const isExpanded = expandedCats.has(category.id);
            const selectedCount = category.services.filter((s) => isInCart(s.id)).length;

            return (
              <div key={category.id} className="bg-harakiri-card rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full p-4 flex items-center justify-between text-left active:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{category.name}</span>
                    {selectedCount > 0 && (
                      <span className="bg-harakiri-red text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {selectedCount}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-harakiri-gray text-xs transition-transform duration-200"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
                  >
                    ▼
                  </span>
                </button>

                <div
                  className="transition-all duration-250 ease-out overflow-hidden"
                  style={{
                    maxHeight: isExpanded ? `${category.services.length * 72}px` : '0',
                    opacity: isExpanded ? 1 : 0,
                  }}
                >
                  {category.services.map((service: Service) => {
                    const selected = isInCart(service.id);
                    return (
                      <button
                        key={service.id}
                        onClick={() => toggleService(service)}
                        className={`w-full px-4 py-3 flex items-center justify-between border-t border-gray-700/50 active:bg-gray-700/20 transition-colors ${
                          selected ? 'bg-harakiri-red/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center checkbox-animate flex-shrink-0 ${
                              selected
                                ? 'bg-harakiri-red border-harakiri-red'
                                : 'border-gray-500'
                            }`}
                          >
                            {selected && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium">{service.name}</div>
                            <div className="text-xs text-harakiri-gray">{formatDuration(service.duration)}</div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold whitespace-nowrap ml-2">
                          {service.price.toLocaleString('ru-RU')} ₽
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ServiceCart />
    </div>
  );
}
