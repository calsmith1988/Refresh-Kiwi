"use client";

const SETTINGS_EVENT = "refresh-kiwi-open-cookie-settings";

export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(SETTINGS_EVENT))}
      className="w-fit self-start p-0 text-left text-inherit transition hover:text-black"
    >
      Cookie settings
    </button>
  );
}
