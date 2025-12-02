function format(date) {
  let d;
  
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    d = new Date(date);
  } else {
    d = new Date();
  }

  if (isNaN(d.getTime())) {
    d = new Date(); // fallback to current date
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

  // Handle date properly
  let startDate;
  if (task.dueDate) {
    startDate = new Date(task.dueDate);
  } else {
    // If no due date, use current time + 1 hour
    startDate = new Date(Date.now() + 60 * 60 * 1000);
  }

  // Ensure it's a valid date
  if (isNaN(startDate.getTime())) {
    startDate = new Date(Date.now() + 60 * 60 * 1000);
  }

  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // +30 mins

  // Generate unique ID if task doesn't have _id
  const uid = task._id ? String(task._id) : `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//Task Manager//EN",

    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${format(new Date())}`,
    `DTSTART:${format(startDate)}`,
    `DTEND:${format(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",

    // Alarm 1: 10 minutes before
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder - ${title}`,
    "END:VALARM",

    // Alarm 2: 1 hour before
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder - ${title}`,
    "END:VALARM",

    // Alarm 3: 1 day before
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