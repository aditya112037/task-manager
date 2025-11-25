function format(date) {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
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
CALSCALE:GREGORIAN
METHOD:PUBLISH

BEGIN:VEVENT
UID:${task._id}
DTSTAMP:${format(Date.now())}
DTSTART:${format(startDate)}
DTEND:${format(endDate)}
SUMMARY:${task.title}
DESCRIPTION:${task.description || ""}

BEGIN:VALARM
TRIGGER:-PT10M
ACTION:DISPLAY
DESCRIPTION:Reminder - ${task.title}
END:VALARM

BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Reminder - ${task.title}
END:VALARM

BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Reminder - ${task.title}
END:VALARM

END:VEVENT
END:VCALENDAR
  `;
}

module.exports = generateICS;
