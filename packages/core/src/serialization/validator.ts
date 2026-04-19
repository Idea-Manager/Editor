import Ajv from 'ajv';
import documentSchema from '../schema/document.schema.json';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ajv = new Ajv({ allErrors: true, verbose: true });
const validate = ajv.compile(documentSchema);

export function validateDocument(doc: unknown): ValidationResult {
  const valid = validate(doc) as boolean;

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map(err => {
    const path = err.instancePath || '/';
    const message = err.message ?? 'unknown error';
    return `${path}: ${message}`;
  });

  return { valid: false, errors };
}
