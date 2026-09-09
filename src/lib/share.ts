export const APP_SHARE_URL = "https://orbitx.app/";

export const buildInviteLink = (uid: string): string => {
  const url = new URL(window.location.href);
  url.searchParams.set("invite", uid);
  return url.toString();
};

export interface ShareResultPayload {
  displayName: string;
  uid: string;
  durationMinutes: number;
  xpGained: number;
  stationName: string;
}

export const buildShareText = (p: ShareResultPayload): string => {
  return `🚀 أنا خلّصت ${p.durationMinutes} دقيقة تركيز في "${p.stationName}" على OrbitX وحصّلت +${p.xpGained} XP!
تعال نتنافس على صدارة المجرة — أدعوك لنزال التركيز 🏆`;
};

export const shareResult = async (p: ShareResultPayload): Promise<"shared" | "copied" | "cancelled"> => {
  const text = buildShareText(p);
  const url = buildInviteLink(p.uid);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `OrbitX — إنجاز ${p.displayName}`,
        text,
        url,
      });
      return "shared";
    } catch (err) {
      // User dismissed the native share sheet
      return "cancelled";
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch (err) {
    return "cancelled";
  }
};
