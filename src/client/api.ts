import type { Cutter, CutterInput, CutterUpdateInput } from '../shared/types';

export interface CutterListResponse {
  cutters: Cutter[];
}

export interface CutterResponse {
  cutter: Cutter;
}

export async function listCutters(archived: boolean): Promise<Cutter[]> {
  const response = await fetch(`/api/cutters?archived=${archived ? 'true' : 'false'}`);
  const data = await parseResponse<CutterListResponse>(response);
  return data.cutters;
}

export async function createCutter(input: CutterInput, image: File): Promise<Cutter> {
  const body = new FormData();
  body.set('name', input.name);
  body.set('maxSizeInches', String(input.maxSizeInches));
  body.set('sizeAxis', input.sizeAxis);
  body.set('mirrorImage', String(input.mirrorImage));
  body.set('dueDate', input.dueDate);
  body.set('image', image);

  const response = await fetch('/api/cutters', {
    method: 'POST',
    body
  });

  const data = await parseResponse<CutterResponse>(response);
  return data.cutter;
}

export async function updateCutter(id: string, input: CutterUpdateInput): Promise<Cutter> {
  const response = await fetch(`/api/cutters/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  const data = await parseResponse<CutterResponse>(response);
  return data.cutter;
}

export async function unarchiveCutter(id: string, dueDate: string): Promise<Cutter> {
  const response = await fetch(`/api/cutters/${id}/unarchive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ dueDate })
  });

  const data = await parseResponse<CutterResponse>(response);
  return data.cutter;
}

export async function uploadCutterFile(id: string, kind: 'fusion' | 'print', file: File): Promise<Cutter> {
  const body = new FormData();
  body.set('file', file);

  const response = await fetch(`/api/cutters/${id}/files/${kind}`, {
    method: 'POST',
    body
  });

  const data = await parseResponse<CutterResponse>(response);
  return data.cutter;
}

export function downloadFile(id: string, kind: 'png' | 'fusion' | 'print'): void {
  window.location.href = `/api/cutters/${id}/files/${kind}`;
}

export function pngPreviewUrl(id: string): string {
  return `/api/cutters/${id}/files/png?inline=true`;
}

export function cutterPreviewUrl(cutter: Cutter): string {
  const kind = cutter.modelPreviewFile ? 'modelPreview' : 'png';

  return `/api/cutters/${cutter.id}/files/${kind}?inline=true`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed.');
  }

  return data;
}
