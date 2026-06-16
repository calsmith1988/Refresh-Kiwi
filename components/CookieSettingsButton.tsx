"use client";

const SETTINGS_EVENT = "refresh-kiwi-open-cookie-settings";

export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(SETTINGS_EVENT))}
      className="hover:text-black"
    >
      Cookie settings
    </button>
  );
}
