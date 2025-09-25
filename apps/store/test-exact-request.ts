import { config } from "dotenv";

// Load environment variables
config({ path: "../../.env" });

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!;
const GHL_AUTH_TOKEN = process.env.GHL_PAT_LOCATION!;

// This is the EXACT request our code is trying to make
async function testExactRequest() {
  console.log("🔍 Testing the exact request that's failing...\n");

  // This is what syncOrderWithGhl is trying to send based on the product config
  const requestBody = {
    locationId: GHL_LOCATION_ID,
    email: "test.customer@example.com",
    firstName: "Test",
    lastName: "Customer",
    phone: "+1234567890",
    source: "Stripe Checkout",
    // No tags since the product doesn't have any configured
    customFields: [
      {
        id: "JtLaFCgvxInDEbae0Pt8",
        value: "test-affiliate-123"
      }
    ]
  };

  console.log("Request body being sent:");
  console.log(JSON.stringify(requestBody, null, 2));
  console.log("\n");

  try {
    const response = await fetch(`${GHL_BASE_URL}/contacts/upsert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_AUTH_TOKEN}`,
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body: ${responseText}\n`);

    if (response.ok) {
      console.log("✅ This request format works!");
      const data = JSON.parse(responseText);
      console.log(`Contact ID: ${data.contact?.id}`);
    } else {
      console.log("❌ This request format fails!");
      console.log("The error mentions 'stageId' and 'currency' but they're not in our request!");
      console.log("\nPossible issues:");
      console.log("1. The error might be from a different request (opportunity creation)");
      console.log("2. There might be middleware modifying the request");
      console.log("3. The config might be corrupted somehow");
    }
  } catch (error) {
    console.error("Request failed:", error);
  }
}

// Also test if maybe the error is from opportunity creation
async function testOpportunityCreation() {
  console.log("\n🔍 Testing if the error is from opportunity creation...\n");

  // First we need a contact ID
  const contactId = "Imviq5YyL8De3QFkmHsW"; // Using the one we created earlier

  const opportunityBody = {
    locationId: GHL_LOCATION_ID,
    contactId: contactId,
    pipelineId: "GYbj73q9z3SGihxNlOne",
    stageId: "8b813665-bcdd-4636-bc65-d8f79d3743cb",
    name: "LinkedIn Learning Downloader Purchase",
    monetaryValue: 99.00,
    currency: "USD",
    status: "open",
    source: "Stripe Checkout"
  };

  console.log("Opportunity request body:");
  console.log(JSON.stringify(opportunityBody, null, 2));
  console.log("\n");

  try {
    const response = await fetch(`${GHL_BASE_URL}/opportunities/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_AUTH_TOKEN}`,
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(opportunityBody)
    });

    const responseText = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body: ${responseText}\n`);

    if (response.ok) {
      console.log("✅ Opportunity created successfully!");
    } else {
      console.log("❌ Opportunity creation failed!");
      if (responseText.includes("stageId should not exist") || responseText.includes("currency should not exist")) {
        console.log("\n🚨 FOUND IT! The error is from the opportunity endpoint!");
        console.log("The opportunity endpoint might not accept these fields in this format.");
      }
    }
  } catch (error) {
    console.error("Request failed:", error);
  }
}

testExactRequest().then(() => testOpportunityCreation()).catch(console.error);