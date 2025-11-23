const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, text }) {
  await resend.emails.send({
    from: "Task Manager <onboarding@resend.dev>",
    to,
    subject,
    text,
  });
}

module.exports = sendEmail;
