// Operating company / tourist-operator legal details. Shown on tickets and
// vouchers (required by tourist-operator rules) and anywhere the legal entity
// must be identified. Single source of truth so these never drift apart.

export const COMPANY = {
  legalName: "Spanish Dream Plus S.L.",
  tradeName: "Canarian Fun",
  nif: "B-21982194",
  address: "Calle Londres 5, Local 19, C.C. Fañabé, 38660 Adeje, Tenerife, Spain",
  bookingEmail: "info@excursionstenerife.es",
  bookingPhone: "+34 624 074 633",
} as const;
