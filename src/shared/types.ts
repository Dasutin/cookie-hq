export type SizeAxis = 'width' | 'height';

export type FileKind = 'png' | 'fusion' | 'print' | 'modelPreview';

export interface CutterFile {
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface Cutter {
  id: string;
  name: string;
  maxSizeInches: number;
  sizeAxis: SizeAxis;
  mirrorImage: boolean;
  dueDate: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  pngFile: CutterFile | null;
  fusionFile: CutterFile | null;
  printFile: CutterFile | null;
  modelPreviewFile: CutterFile | null;
}

export interface CutterInput {
  name: string;
  maxSizeInches: number;
  sizeAxis: SizeAxis;
  mirrorImage: boolean;
  dueDate: string;
}

export interface CutterUpdateInput {
  name?: string;
  maxSizeInches?: number;
  sizeAxis?: SizeAxis;
  mirrorImage?: boolean;
  dueDate?: string;
  archived?: boolean;
}
