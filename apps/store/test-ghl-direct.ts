import { config } from "dotenv";

// Load environment variables
config({ path: "../../.env" });

const GHL_BASE_URL = process.env.GHL_API_BASE_URL || "https://services.leadconnectorhq.com";
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_AUTH_TOKEN = process.env.GHL_PAT_LOCATION;
const GHL_API_VERSION = process.env.GHL_API_VERSION || "2021-07-28";

async function testGHLConnection() {
  console.log("🔍 Testing GoHighLevel Connection\n");

  console.log("Configuration:");
  console.log(`  Location ID: ${GHL_LOCATION_ID ? '✅ ' + GHL_LOCATION_ID : '❌ Missing'}`);
  console.log(`  Auth Token: ${GHL_AUTH_TOKEN ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  API Base URL: ${GHL_BASE_URL}`);
  console.log(`  API Version: ${GHL_API_VERSION}\n`);

  if (!GHL_AUTH_TOKEN || !GHL_LOCATION_ID) {
    console.error("❌ Missing GHL credentials");
    return;
  }

  // Test 1: Try to create/update a contact
  console.log("📝 Testing contact creation...\n");

  const contactData = {
    locationId: GHL_LOCATION_ID,
    email: "test.customer@example.com",
    firstName: "Test",
    lastName: "Customer",
    source: "Store Purchase Test",
    tags: [],
    // Try without custom fields first
    // customField: [
    //   { id: "affiliate_id", value: "test-affiliate-123" }
    // ]
  };

  try {
    const response = await fetch(`${GHL_BASE_URL}/contacts/upsert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_AUTH_TOKEN}`,
        "Version": GHL_API_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(contactData)
    });

    const responseText = await response.text();

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log("✅ Contact created successfully!");
      console.log(`   Contact ID: ${data.contact?.id || 'Unknown'}\n`);

      // Now test with affiliate field
      if (process.env.GHL_AFFILIATE_FIELD_ID) {
        console.log("📝 Testing affiliate field update...\n");

        const contactWithAffiliate = {
          ...contactData,
          customField: [
            { id: process.env.GHL_AFFILIATE_FIELD_ID, value: "test-affiliate-123" }
          ]
        };

        const affiliateResponse = await fetch(`${GHL_BASE_URL}/contacts/upsert`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GHL_AUTH_TOKEN}`,
            "Version": GHL_API_VERSION,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(contactWithAffiliate)
        });

        const affiliateResponseText = await affiliateResponse.text();

        if (affiliateResponse.ok) {
          console.log("✅ Affiliate field updated successfully!");
        } else {
          console.log(`❌ Affiliate field update failed (${affiliateResponse.status}):`);
          console.log(`   ${affiliateResponseText}\n`);
          console.log("⚠️  The field ID 'affiliate_id' might be incorrect.");
          console.log("   You need to use the actual field ID from GHL, not the field name.");
        }
      }

      return data.contact?.id;
    } else {
      console.log(`❌ Contact creation failed (${response.status}):`);
      console.log(`   ${responseText}\n`);

      if (response.status === 422) {
        console.log("⚠️  This usually means:");
        console.log("   - Invalid field IDs in the request");
        console.log("   - Missing required fields");
        console.log("   - Invalid data format");
      } else if (response.status === 401) {
        console.log("⚠️  Authentication failed. Check your GHL_PAT_LOCATION token.");
      }
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
  }
}

async function fetchCustomFields() {
  console.log("\n📋 Fetching available custom fields...\n");

  if (!GHL_AUTH_TOKEN || !GHL_LOCATION_ID) {
    console.error("❌ Missing credentials");
    return;
  }

  try {
    const response = await fetch(`${GHL_BASE_URL}/locations/${GHL_LOCATION_ID}/customFields`, {
      headers: {
        "Authorization": `Bearer ${GHL_AUTH_TOKEN}`,
        "Version": GHL_API_VERSION,
        "Accept": "application/json"
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Available custom fields:");

      if (data.customFields && Array.isArray(data.customFields)) {
        data.customFields.forEach((field: any) => {
          console.log(`  - ${field.name || field.fieldKey}`);
          console.log(`    ID: ${field.id}`);
          console.log(`    Key: ${field.fieldKey}`);
          console.log(`    Type: ${field.dataType}\n`);
        });

        // Look for affiliate field
        const affiliateField = data.customFields.find((f: any) =>
          f.name?.toLowerCase().includes('affiliate') ||
          f.fieldKey?.toLowerCase().includes('affiliate')
        );

        if (affiliateField) {
          console.log("✅ Found affiliate field!");
          console.log(`   Use this ID in .env: GHL_AFFILIATE_FIELD_ID=${affiliateField.id}`);
        } else {
          console.log("⚠️  No affiliate field found. You may need to create one in GHL.");
        }
      } else {
        console.log("No custom fields found or unexpected response format.");
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Failed to fetch custom fields (${response.status}):`);
      console.log(`   ${errorText}`);
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
  }
}

// Run tests
console.log("🚀 Starting GoHighLevel Integration Test\n");

testGHLConnection().then(async (contactId) => {
  await fetchCustomFields();

  console.log("\n📊 Summary:");
  console.log("  1. Check the output above for any errors");
  console.log("  2. If custom fields failed, update GHL_AFFILIATE_FIELD_ID with the correct ID");
  console.log("  3. The field ID should be a UUID, not 'affiliate_id'");
  console.log("  4. Check GoHighLevel for the test contact: test.customer@example.com");
}).catch(error => {
  console.error("Test failed:", error);
});