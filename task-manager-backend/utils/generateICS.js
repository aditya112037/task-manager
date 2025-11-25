function format(date) {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Escape ICS unsafe characters
function escapeICS(str = "") {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function generateICS(task) {
  const title = escapeICS(task.title || "Task");
  const description = escapeICS(task.description || "");

  const startDate = task.dueDate || Date.now();
  const endDate = new Date(startDate).getTime() + 30 * 60 * 1000; // +30 mins

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",

    "BEGIN:VEVENT",
    `UID:${task._id}`,
    `DTSTAMP:${format(Date.now())}`,
    `DTSTART:${format(startDate)}`,
    `DTEND:${format(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,

    // alarms
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder - ${title}`,
    "END:VALARM",

    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder - ${title}`,
    "END:VALARM",

    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder - ${title}`,
    "END:VALARM",

    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");  // VERY IMPORTANT
}

module.exports = generateICS;
