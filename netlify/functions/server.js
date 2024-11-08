export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse form data
  const params = new URLSearchParams(event.body);
  const email = params.get("email");
  const submissionDate = params.get("submission-date");
  const ipAddress = params.get("ip-address");

  if (!email || !submissionDate || !ipAddress) {
    return {
      statusCode: 400,
      body: "Missing required fields.",
    };
  }

  console.log("New Subscription:", { email, submissionDate, ipAddress });

  // Return success response
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Subscription saved successfully!" }),
  };
}
