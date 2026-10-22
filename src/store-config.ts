const DEFAULT_SHIPPING_FEE = 0;

export interface BankTransferInstructions {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export function getConfiguredShippingFee(): number {
  const rawFee = process.env.SHIPPING_FEE?.trim();
  if (!rawFee) return DEFAULT_SHIPPING_FEE;

  const shippingFee = Number(rawFee);
  if (!Number.isSafeInteger(shippingFee) || shippingFee < 0) {
    throw new Error('SHIPPING_FEE must be a non-negative integer amount in rupiah.');
  }

  return shippingFee;
}

export function getBankTransferInstructions(): BankTransferInstructions | null {
  const bankName = process.env.BANK_TRANSFER_BANK_NAME?.trim() ?? '';
  const accountName = process.env.BANK_TRANSFER_ACCOUNT_NAME?.trim() ?? '';
  const accountNumber = process.env.BANK_TRANSFER_ACCOUNT_NUMBER?.trim() ?? '';
  const configuredFields = [bankName, accountName, accountNumber].filter(Boolean).length;

  if (configuredFields === 0) return null;
  if (configuredFields !== 3) {
    throw new Error(
      'Set BANK_TRANSFER_BANK_NAME, BANK_TRANSFER_ACCOUNT_NAME, and BANK_TRANSFER_ACCOUNT_NUMBER together, or leave all three blank.',
    );
  }

  return { bankName, accountName, accountNumber };
}
