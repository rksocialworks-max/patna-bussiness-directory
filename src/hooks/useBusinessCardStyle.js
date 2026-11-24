import { useEffect, useState } from 'react';
import { listDocuments, COLLECTIONS } from '@/services/firebase/firestore';

export const CARD_STYLES = ['gradient', 'editorial', 'vibrant'];

let cardStylePromise;

export function clearBusinessCardStyleCache() {
  cardStylePromise = undefined;
}

function loadCardStyle() {
  if (!cardStylePromise) {
    cardStylePromise = listDocuments(COLLECTIONS.siteSettingsPublic, { pageSize: 100 })
      .then((rows) => rows.find((item) => item.setting_key_c === 'business_card_style')?.setting_value_c || 'gradient')
      .catch(() => 'gradient');
  }
  return cardStylePromise;
}

/**
 * Shared card design setting. The promise is cached so a directory page with
 * dozens of cards performs a single Firestore read.
 */
export function useBusinessCardStyle() {
  const [style, setStyle] = useState('gradient');
  useEffect(() => {
    let active = true;
    loadCardStyle().then((value) => {
      if (active) setStyle(CARD_STYLES.includes(value) ? value : 'gradient');
    });
    return () => { active = false; };
  }, []);
  return style;
}
