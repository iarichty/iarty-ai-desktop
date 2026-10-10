import { en } from './languages/en';
import { id } from './languages/id';
import { zh } from './languages/zh';

export const translations = {
    en,
    id,
    zh,
};

export type Language = keyof typeof translations;

// Recursive helper to get nested keys
type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
        ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
        : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKeys = NestedKeyOf<typeof en>;
