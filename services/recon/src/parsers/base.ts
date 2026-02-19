import type { EntityCategory, EntityType, ImportSourceType } from "@0x0-gen/contracts";

export interface RawEntity {
  type: EntityType;
  category: EntityCategory;
  value: string;
  attributes: Record<string, unknown>;
  confidence?: number;
  source: string;
}

export interface RawRelationship {
  fromValue: string;
  fromType: EntityType;
  toValue: string;
  toType: EntityType;
  type: string;
  confidence?: number;
}

export interface ParseResult {
  entities: RawEntity[];
  relationships: RawRelationship[];
  stats: { total: number; parsed: number; errors: number };
  errors: Array<{ line?: number; message: string }>;
}

export interface ParseOptions {
  fieldMapping?: Record<string, string>;
  columnMapping?: Record<string, string>;
  defaultType?: EntityType;
  defaultCategory?: EntityCategory;
}

export interface Parser {
  name: string;
  source: ImportSourceType;
  supportedFormats: string[];
  detect(content: string, filename?: string): boolean;
  parse(content: string, options?: ParseOptions): ParseResult;
}
