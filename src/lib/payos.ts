import "server-only";

import { PayOS } from "@payos/node";

let payosClient: PayOS | null = null;

export function getPayOS() {
  if (payosClient) {
    return payosClient;
  }

  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!clientId || !apiKey || !checksumKey) {
    throw new Error("Missing PayOS environment variables");
  }

  payosClient = new PayOS({
    clientId,
    apiKey,
    checksumKey,
  });

  return payosClient;
}
