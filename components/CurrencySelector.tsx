"use client";

import { useRef, type PointerEvent } from "react";

import type {
  PriceOption,
  SupportedCurrency,
} from "@/lib/pricing/regions";

type SelectWithPicker = HTMLSelectElement & {
  showPicker?: () => void;
};

type CurrencySelectorProps = {
  currency: SupportedCurrency;
  options: PriceOption[];
  onChange: (currency: SupportedCurrency) => void;
  className?: string;
};

export default function CurrencySelector({
  currency,
  options,
  onChange,
  className = "",
}: CurrencySelectorProps) {
  const selectRef = useRef<SelectWithPicker | null>(null);

  function openSelect(event: PointerEvent<HTMLLabelElement>) {
    if (event.target === selectRef.current) {
      return;
    }

    event.preventDefault();
    const select = selectRef.current;

    if (!select) {
      return;
    }

    select.focus();
    if (select.showPicker) {
      select.showPicker();
    } else {
      select.click();
    }
  }

  return (
    <label
      onPointerDown={openSelect}
      className={`cursor-pointer ${className}`}
    >
      Currency
      <select
        ref={selectRef}
        value={currency}
        onChange={(event) => onChange(event.target.value as SupportedCurrency)}
        className="cursor-pointer bg-transparent text-black outline-none"
        aria-label="Choose pricing currency"
      >
        {options.map((option) => (
          <option key={option.currency} value={option.currency}>
            {option.label} ({option.monthlyPrice})
          </option>
        ))}
      </select>
    </label>
  );
}
