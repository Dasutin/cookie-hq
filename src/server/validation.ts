import { z } from 'zod';
import { isPastDateString } from '../shared/dates';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format.')
  .refine((value) => !isPastDateString(value), 'Due date cannot be in the past.');
const boolish = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['true', '1', 'on', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'off', 'no', ''].includes(normalized)) {
      return false;
    }
  }
  return value;
}, z.boolean());

export const createCutterSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  maxSizeInches: z.coerce.number().positive('Max size must be greater than zero.'),
  sizeAxis: z.enum(['width', 'height']),
  mirrorImage: boolish.default(false),
  dueDate: dateString
});

export const updateCutterSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    maxSizeInches: z.coerce.number().positive().optional(),
    sizeAxis: z.enum(['width', 'height']).optional(),
    mirrorImage: boolish.optional(),
    dueDate: dateString.optional(),
    archived: boolish.optional()
  })
  .strict();

export const unarchiveSchema = z.object({
  dueDate: dateString
});
