import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { createPhoneValidator } from "../../../../packages/shared/phone";

export const { normalizePhone, phoneError } = createPhoneValidator(parsePhoneNumberFromString);
