import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';

import type { Media, NewMedia } from '@/db/library';

/**
 * Media files live in <documents>/media and video thumbnails in
 * <documents>/thumbs. The database stores bare file names; uriFor() turns
 * them back into URIs, so the library survives the app container moving.
 */
const mediaDir = new Directory(Paths.document, 'media');
const thumbDir = new Directory(Paths.document, 'thumbs');
mediaDir.create({ idempotent: true, intermediates: true });
thumbDir.create({ idempotent: true, intermediates: true });

export function mediaUri(item: Pick<Media, 'file_name'>): string | null {
  return item.file_name ? new File(mediaDir, item.file_name).uri : null;
}

/** What a grid tile shows: the video's frame grab, or the image itself. */
export function thumbUri(
  item: Pick<Media, 'media_type' | 'thumb_name' | 'file_name'>
): string | null {
  if (item.thumb_name) return new File(thumbDir, item.thumb_name).uri;
  return item.media_type === 'image' ? mediaUri(item) : null;
}

function uniqueName(ext: string) {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

function extensionOf(asset: ImagePickerAsset) {
  const name = asset.fileName ?? asset.uri;
  const match = /\.([a-z0-9]+)(?:\?.*)?$/i.exec(name);
  if (match) return match[1].toLowerCase();
  return asset.type === 'video' ? 'mp4' : 'jpg';
}

/**
 * Copies a picked photo or video into app storage and returns the row to
 * insert. The picker's own URI points into a cache the OS may clear.
 */
export async function importAsset(asset: ImagePickerAsset): Promise<NewMedia> {
  const isVideo = asset.type === 'video' || asset.type === 'pairedVideo';
  const fileName = uniqueName(extensionOf(asset));
  const dest = new File(mediaDir, fileName);
  await new File(asset.uri).copy(dest);

  let thumbName: string | null = null;
  if (isVideo) {
    try {
      const thumb = await VideoThumbnails.getThumbnailAsync(dest.uri, { time: 0, quality: 0.6 });
      thumbName = uniqueName('jpg');
      await new File(thumb.uri).copy(new File(thumbDir, thumbName));
    } catch {
      thumbName = null; // tile falls back to a glyph
    }
  }
  // images have no thumb file: they are their own thumbnail, and expo-image
  // downsamples and caches them

  return {
    media_type: isVideo ? 'video' : 'image',
    title: asset.fileName ? asset.fileName.replace(/\.[^.]+$/, '') : null,
    file_name: fileName,
    thumb_name: thumbName,
    width: asset.width || null,
    height: asset.height || null,
    duration_ms: asset.duration ?? null,
  };
}

/** Removes an item's files; missing files are fine. */
export function deleteFiles(item: Pick<Media, 'file_name' | 'thumb_name'>) {
  for (const [dir, name] of [
    [mediaDir, item.file_name],
    [thumbDir, item.thumb_name],
  ] as const) {
    if (!name) continue;
    const file = new File(dir, name);
    if (file.exists) file.delete();
  }
}
