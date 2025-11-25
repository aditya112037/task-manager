function format(date) {
  const d = new Date(date);

  // SAFETY CHECK – prevent crash if invalid or missing
  if (isNaN(d.getTime())) {
    // fallback to *current datetime* so ICS remains valid
    return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function generateICS(task) {
  const startDate = task.dueDate || Date.now();  
  const endDate = task.dueDate || Date.now();

  return `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TaskManager//EN
BEGIN:VEVENT
UID:${task._id}
DTSTAMP:${format(Date.now())}
DTSTART:${format(startDate)}
DTEND:${format(endDate)}
SUMMARY:${task.title}
DESCRIPTION:${task.description || ""}
END:VEVENT
END:VCALENDAR
  `;
}

module.exports = generateICS;
