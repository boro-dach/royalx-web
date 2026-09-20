const TELEGRAM_API = "https://api.telegram.org";

export async function fetchTelegramAvatarBuffer(
  telegramUserId: number,
  botToken: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const photosRes = await fetch(
    `${TELEGRAM_API}/bot${botToken}/getUserProfilePhotos?user_id=${telegramUserId}&limit=1`,
  );
  const photosData = await photosRes.json();

  if (!photosData.ok || photosData.result.total_count === 0) {
    return null;
  }

  const sizes = photosData.result.photos[0];
  const largest = sizes[sizes.length - 1];

  const fileRes = await fetch(`${TELEGRAM_API}/bot${botToken}/getFile?file_id=${largest.file_id}`);
  const fileData = await fileRes.json();

  if (!fileData.ok) return null;

  const filePath = fileData.result.file_path;
  const downloadRes = await fetch(`${TELEGRAM_API}/file/bot${botToken}/${filePath}`);

  if (!downloadRes.ok) return null;

  const arrayBuffer = await downloadRes.arrayBuffer();
  const contentType = downloadRes.headers.get("content-type") ?? "image/jpeg";

  return { buffer: Buffer.from(arrayBuffer), contentType };
}
