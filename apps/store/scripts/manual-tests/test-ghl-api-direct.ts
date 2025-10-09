/**
 * Run with: npx tsx scripts/manual-tests/test-ghl-api-direct.ts
 */

import { config } from "dotenv";

// Load environment variables
config({ path: "../../../.env.local" });
config({ path: "../../../.env" });

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_AUTH_TOKEN = process.env.GHL_PAT_LOCATION;

async function testDirectAPI() {
  console.log("🔍 Testing GoHighLevel API Directly\n");
  console.log("Configuration:");
  console.log(`  Location ID: ${GHL_LOCATION_ID}`);
  console.log(`  Auth Token: ${GHL_AUTH_TOKEN ? '✅ Present' : '❌ Missing'}`);
  console.log(`  Affiliate Field ID: ${process.env.GHL_AFFILIATE_FIELD_ID}\n`);

  // Test 1: Simple contact creation (minimal fields)
  console.log("Test 1: Creating contact with minimal fields...");

  const minimalPayload = {
    locationId: GHL_LOCATION_ID,
    email: "test.minimal@example.com"
  };

  try {
    const response = await fetch(`${GHL_BASE_URL}/contacts/upsert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_AUTH_TOKEN}`,
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(minimalPayload)
    });

    const responseText = await response.text();
    console.log(`Response Status: ${response.status}`);

    if (response.ok) {
      console.log("✅ Minimal contact created successfully!");
      const data = JSON.parse(responseText);
      console.log(`Contact ID: ${data.contact?.id}\n`);
    } else {
      console.log("❌ Failed:");
      console.log(responseText);
      console.log("\n");
    }
  } catch (error) {
    console.error("Request failed:", error);
  }

  // Test 2: Contact with basic fields
  console.log("Test 2: Creating contact with basic fields...");

  const basicPayload = {
    locationId: GHL_LOCATION_ID,
    email: "test.basic@example.com",
    firstName: "Test",
    lastName: "Basic",
    phone: "+1234567890",
    source: "API Test"
  };

  try {
    const response = await fetch(`${GHL_BASE_URL}/contacts/upsert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_AUTH_TOKEN}`,
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(basicPayload)
    });

    const responseText = await response.text();
    console.log(`Response Status: ${response.status}`);

    if (response.ok) {
      console.log("✅ Basic contact created successfully!");
      const data = JSON.parse(responseText);
      console.log(`Contact ID: ${data.contact?.id}\n`);
    } else {
      console.log("❌ Failed:");
      console.log(responseText);
      console.log("\n");
    }
  } catch (error) {
    console.error("Request failed:", error);
  }

  // Test 3: Contact with custom field (using 'customField' - singular)
  console.log("Test 3: Creating contact with custom field (singular)...");

  const customFieldPayload = {
    locationId: GHL_LOCATION_ID,
    email: "test.customfield@example.com",
    firstName: "Test",
    lastName: "CustomField",
    customField: [
      {
        id: process.env.GHL_AFFILIATE_FIELD_ID,
        value: "test-affiliate-123"
      }
    ]
  };

  console.log("Payload:", JSON.stringify(customFieldPayload, null, 2));

  try {
    const response = await fetch(`${GHL_BASE_URL}/contacts/upsert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_AUTH_TOKEN}`,
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(customFieldPayload)
    });

    const responseText = await response.text();
    console.log(`Response Status: ${response.status}`);

    if (response.ok) {
      console.log("✅ Contact with custom field created successfully!");
      const data = JSON.parse(responseText);
      console.log(`Contact ID: ${data.contact?.id}\n`);
    } else {
      console.log("❌ Failed:");
      console.log(responseText);
      console.log("\n");
    }
  } catch (error) {
    console.error("Request failed:", error);
  }

  // Test 4: Contact with custom field (using 'customFields' - plural)
  console.log("Test 4: Creating contact with custom fields (plural)...");

  const customFieldsPayload = {
    locationId: GHL_LOCATION_ID,
    email: "test.customfields@example.com",
    firstName: "Test",
    lastName: "CustomFields",
    customFields: [
      {
        id: process.env.GHL_AFFILIATE_FIELD_ID,
        value: "test-affiliate-456"
      }
    ]
  };

  console.log("Payload:", JSON.stringify(customFieldsPayload, null, 2));

  try {
    const response = await fetch(`${GHL_BASE_URL}/contacts/upsert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_AUTH_TOKEN}`,
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(customFieldsPayload)
    });

    const responseText = await response.text();
    console.log(`Response Status: ${response.status}`);

    if (response.ok) {
      console.log("✅ Contact with custom fields created successfully!");
      const data = JSON.parse(responseText);
      console.log(`Contact ID: ${data.contact?.id}\n`);
    } else {
      console.log("❌ Failed:");
      console.log(responseText);
      console.log("\n");
    }
  } catch (error) {
    console.error("Request failed:", error);
  }

  // Test 5: Try with key instead of id
  console.log("Test 5: Creating contact with field key instead of ID...");

  const fieldKeyPayload = {
    locationId: GHL_LOCATION_ID,
    email: "test.fieldkey@example.com",
    firstName: "Test",
    lastName: "FieldKey",
    customField: [
      {
        key: "contact.affiliate_id",
        value: "test-affiliate-789"
      }
    ]
  };

  console.log("Payload:", JSON.stringify(fieldKeyPayload, null, 2));

  try {
    const response = await fetch(`${GHL_BASE_URL}/contacts/upsert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_AUTH_TOKEN}`,
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(fieldKeyPayload)
    });

    const responseText = await response.text();
    console.log(`Response Status: ${response.status}`);

    if (response.ok) {
      console.log("✅ Contact with field key created successfully!");
      const data = JSON.parse(responseText);
      console.log(`Contact ID: ${data.contact?.id}\n`);
    } else {
      console.log("❌ Failed:");
      console.log(responseText);
      console.log("\n");
    }
  } catch (error) {
    console.error("Request failed:", error);
  }

  console.log("\n📊 Summary:");
  console.log("Check GoHighLevel contacts for these test emails to see which worked:");
  console.log("  - test.minimal@example.com");
  console.log("  - test.basic@example.com");
  console.log("  - test.customfield@example.com");
  console.log("  - test.customfields@example.com");
  console.log("  - test.fieldkey@example.com");
}

testDirectAPI().catch(console.error);
