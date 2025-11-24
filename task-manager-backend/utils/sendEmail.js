const Brevo = require("@getbrevo/brevo");

async function sendEmail({ to, subject, text }) {
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
  );

  const emailData = {
    sender: { name: "Task Manager", email: process.env.EMAIL_FROM },
    to: [{ email: to }],
    subject,
    textContent: text,
  };

  await apiInstance.sendTransacEmail(emailData);
}

module.exports = sendEmail;
