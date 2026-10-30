export const textLang = (text?: string | null) =>
  text && /[က-႟]/.test(text) ? 'my' : undefined;
