// src/shared/utils/cn.ts
// Robust className utility function inspired by clsx

type ClassValue = 
  | string 
  | number 
  | bigint
  | boolean 
  | undefined 
  | null
  | ClassArray
  | ClassDictionary;

interface ClassDictionary {
  [id: string]: unknown;
}

type ClassArray = ClassValue[];

function toVal(mix: ClassValue): string {
  let str = '';

  if (typeof mix === 'string' || typeof mix === 'number' || typeof mix === 'bigint') {
    str += mix;
  } else if (typeof mix === 'object' && mix !== null) {
    if (Array.isArray(mix)) {
      for (let i = 0; i < mix.length; i++) {
        const tmp = toVal(mix[i]);
        if (tmp) {
          if (str) {
            str += ' ';
          }
          str += tmp;
        }
      }
    } else {
      for (const key in mix) {
        if (mix[key]) {
          if (str) {
            str += ' ';
          }
          str += key;
        }
      }
    }
  }

  return str;
}

/**
 * Robust className utility function
 * Handles all types of values and filters out falsy ones
 */
export function cn(...inputs: ClassValue[]): string {
  let str = '';
  
  for (let i = 0; i < inputs.length; i++) {
    const tmp = toVal(inputs[i]);
    if (tmp) {
      if (str) {
        str += ' ';
      }
      str += tmp;
    }
  }
  
  return str;
}

export default cn;