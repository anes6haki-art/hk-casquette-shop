export function normalizeAlgerianPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  const nationalNumber = digits.startsWith("00213")
    ? `0${digits.slice(5)}`
    : digits.startsWith("213")
      ? `0${digits.slice(3)}`
      : digits.startsWith("0")
        ? digits
        : `0${digits}`;

  return /^0[5-7]\d{8}$/.test(nationalNumber) ? nationalNumber : null;
}
