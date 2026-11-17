import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, storage, isFirebaseConfigured } from '@/lib/firebase';

function requireStorage() {
  if (!isFirebaseConfigured || !storage) throw new Error('Firebase Storage is not configured.');
  if (!auth?.currentUser) throw new Error('Please sign in before uploading files.');
  return storage;
}

export function validateUpload(file, config = {}) {
  const allowed = Array.isArray(config.supportedExtensions)
    ? config.supportedExtensions.map((value) => String(value).toLowerCase().replace(/^\./, ''))
    : String(config.supportedExtensions || '').split(',').map((value) => value.trim().toLowerCase().replace(/^\./, '')).filter(Boolean);
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (allowed.length && !allowed.includes(extension)) return { valid: false, error: 'File type is not allowed.' };
  const maxBytes = Number(config.maxValue || 0) * 1024;
  if (maxBytes > 0 && file.size > maxBytes) return { valid: false, error: 'File exceeds the maximum allowed size.' };
  const minBytes = Number(config.minValue || 0) * 1024;
  if (minBytes > 0 && file.size < minBytes) return { valid: false, error: 'File is smaller than the minimum allowed size.' };
  return { valid: true };
}

export function uploadFile(file, { onProgress } = {}) {
  const activeStorage = requireStorage();
  const user = auth.currentUser;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
  const objectRef = ref(activeStorage, `users/${user.uid}/uploads/${crypto.randomUUID()}_${safeName}`);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(objectRef, file, { contentType: file.type || 'application/octet-stream' });
    task.on('state_changed',
      (snapshot) => onProgress?.(snapshot.totalBytes ? snapshot.bytesTransferred / snapshot.totalBytes * 100 : 0),
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ Id: task.snapshot.ref.fullPath, path: task.snapshot.ref.fullPath, Name: file.name, Size: file.size / 1024, Type: file.type, url });
        } catch (error) { reject(error); }
      }
    );
  });
}

export async function getStoredFileUrl(file) {
  const activeStorage = requireStorage();
  const path = file?.path || file?.Id;
  if (!path) throw new Error('File storage path is missing.');
  return getDownloadURL(ref(activeStorage, path));
}
