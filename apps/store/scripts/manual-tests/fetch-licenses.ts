import { config } from "dotenv";

config({ path: "../../../.env.local" });
config({ path: "../../../.env" });

async function main(email: string) {
  const { fetchContactLicensesByEmail } = await import("@/lib/ghl-client");

  const licenses = await fetchContactLicensesByEmail(email);

  console.log(`Found ${licenses.length} license record(s) for ${email}`);
  console.log(JSON.stringify(licenses, null, 2));
}

const email = process.argv[2];

if (!email) {
  console.error("Usage: pnpm --filter @apps/store exec tsx scripts/manual-tests/fetch-licenses.ts <email>");
  process.exit(1);
}

main(email).catch((error) => {
  console.error(error);
  process.exit(1);
});
