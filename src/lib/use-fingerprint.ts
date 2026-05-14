'use client';
import { useEffect, useState } from 'react';

export function useFingerprint(): string {
  const [fp, setFp] = useState('');
  
  useEffect(() => {
    let stored = localStorage.getItem('wwt-fp');
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem('wwt-fp', stored);
    }
    setFp(stored);
  }, []);
  
  return fp;
}
