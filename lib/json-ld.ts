/**
 * Serializes JSON-LD without allowing CMS text to terminate the containing
 * script element. Escaping these characters preserves the JSON value while
 * preventing sequences such as </script> from becoming HTML markup.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
